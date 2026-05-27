import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { IModeled } from '../interfaces/IModeled';
import { IObjectState } from '../interfaces/IState';
import { assetLoader } from '../engine/AssetLoader';
import { WORLD_CONFIG } from '../config/WorldConfig';

export abstract class ModeledObject implements IModeled {
  public mesh: THREE.Group = new THREE.Group();
  public model: THREE.Group | null = null;
  public animations: THREE.AnimationClip[] = [];
  public modelPath: string = '';
  public customTexturePath?: string;

  constructor() {
    this.mesh.userData = { instance: this };
  }

  public async loadModel(): Promise<THREE.Group> {
    if (!this.modelPath) {
      console.warn(`[${this.constructor.name}] No modelPath set — skipping load.`);
      return this.mesh;
    }

    const loadTask = async () => {
      try {
        const cached = await assetLoader.fetchGltf(this.modelPath);
        this.model = SkeletonUtils.clone(cached.scene) as THREE.Group;
        this.animations = cached.animations;
        this.mesh.add(this.model);
        if (this.customTexturePath) await this.applyCustomTexture(this.customTexturePath);
        // Strip baked-lighting emissive from GLB materials — artists often export
        // with emissiveIntensity=1 for their own renderer; we want PBR lit by scene lights.
        // Subclasses (e.g. TikiTorch) re-enable it selectively in onModelLoaded.
        this.model.traverse((child) => {
          if (!(child as THREE.Mesh).isMesh) return;
          const mats = Array.isArray((child as THREE.Mesh).material)
            ? (child as THREE.Mesh).material as THREE.Material[]
            : [(child as THREE.Mesh).material as THREE.Material];
          mats.forEach((m) => {
            if ('emissiveIntensity' in m) (m as THREE.MeshStandardMaterial).emissiveIntensity = 0;
          });
        });
        await this.onModelLoaded(this.model);
        return this.model;
      } catch (e) {
        console.error(`[${this.constructor.name}] Error loading "${this.modelPath}":`, e);
        throw e;
      }
    };

    const task = loadTask();
    assetLoader.trackInstance(task);
    return task;
  }

  protected async onModelLoaded(_model: THREE.Group): Promise<void> {
    // no-op — subclasses override
  }

  public async applyCustomTexture(texturePath: string): Promise<void> {
    this.customTexturePath = texturePath;
    if (!this.model) {
      console.warn(`[${this.constructor.name}] Cannot apply texture — model not loaded yet.`);
      return;
    }
    try {
      const texture = await assetLoader.fetchTexture(texturePath);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.flipY = false;
      this.model!.traverse((child) => {
        if (!(child as THREE.Mesh).isMesh) return;
        const mesh = child as THREE.Mesh;
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        materials.forEach((m) => this._applyTextureMap(m, texture));
      });
    } catch (error) {
      console.error(`[${this.constructor.name}] Failed to apply texture "${texturePath}":`, error);
      throw error;
    }
  }

  protected _applyTextureMap(material: THREE.Material, texture: THREE.Texture): void {
    if ('map' in material) {
      (material as THREE.MeshStandardMaterial).map = texture;
      material.needsUpdate = true;
    }
  }

  // ── Persistence helpers ────────────────────────────────────────────────────
  // Shared world↔island-relative pose math used by every IPersistent subclass.
  // Save returns island-relative position + euler rotation; load applies the
  // inverse with the recorded islandIndex. Keeps the on-disk save schema stable.

  /**
   * Snapshot mesh world pose into an IObjectState.
   * Subclasses pass their `objectType` and may overwrite/extend the result
   * (e.g. add `metadata`, `linearVelocity`, `isHeld`).
   */
  protected savePose(objectType: string): IObjectState {
    const worldPos = new THREE.Vector3();
    const worldQuat = new THREE.Quaternion();
    this.mesh.getWorldPosition(worldPos);
    this.mesh.getWorldQuaternion(worldQuat);
    const e = new THREE.Euler().setFromQuaternion(worldQuat);

    const islandIndex = Math.round(worldPos.x / WORLD_CONFIG.ISLAND_OFFSET);
    return {
      islandIndex,
      type: objectType,
      position: {
        x: worldPos.x - islandIndex * WORLD_CONFIG.ISLAND_OFFSET,
        y: worldPos.y,
        z: worldPos.z,
      },
      rotation: { x: e.x, y: e.y, z: e.z },
    };
  }

  /** Apply a saved pose (position + euler) to the mesh. */
  protected loadPose(state: IObjectState): void {
    const offset = (state.islandIndex || 0) * WORLD_CONFIG.ISLAND_OFFSET;
    this.mesh.position.set(state.position.x + offset, state.position.y, state.position.z);
    this.mesh.rotation.set(state.rotation.x, state.rotation.y, state.rotation.z);
  }

  /**
   * Cleans up node references to allow JavaScript garbage collection.
   * We intentionally do NOT call disposeObjectTree/dispose geometries and materials here.
   * Since geometries and materials are loaded and cached globally in the AssetLoader,
   * they are shared across all instances. Disposing of them per-instance would destroy
   * the WebGL buffers and break other active or future instances of the same models.
   */
  public dispose(): void {
    if (this.mesh) {
      this.mesh.clear();
    }
    this.model = null;
    this.animations = [];
  }
}
