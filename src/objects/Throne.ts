import * as THREE from 'three';
import { Interactable } from './Interactable';
import { IPersistent } from '../interfaces/IPersistent';
import { IObjectState } from '../interfaces/IState';
import Player from '../player/Player';
import { IGrabbable } from '../interfaces/IGrabbable';
import Crown from './Crown';
import { physicsSystem } from '../engine/PhysicsSystem';
import { assetLoader } from '../engine/AssetLoader';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

export default class Throne extends Interactable implements IPersistent {

  // ── IPersistent ─────────────────────────────────────────────────────────────

  public persistentId: string = '';

  // ── Domain state ────────────────────────────────────────────────────────────

  private hasCrown: boolean = false;

  /** Fired once when a Crown is successfully placed. */
  public onCrownPlaced?: () => void;

  // ── Owned physics colliders ─────────────────────────────────────────────────

  private ownedColliders: import('@dimforge/rapier3d-compat').Collider[] = [];

  // ── Construction ────────────────────────────────────────────────────────────

  constructor(persistentId: string = '') {
    super();
    this.persistentId = persistentId;
    this.modelPath = 'models/wooden_throne/wooden_throne.glb';

    // Tag the root group so InteractionManager can walk up to find this instance.
    this.mesh.userData = { interactable: true, instance: this };

    this.loadModel();
  }

  // ── ModeledObject hook ──────────────────────────────────────────────────────

  protected override async onModelLoaded(model: THREE.Group): Promise<void> {
    // The GLB is very large (32 MB) and has embedded textures —
    // no manual texture override needed.

    // Calculate bounding box before any transforms to find the natural origin offset
    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    box.getSize(size);

    // Normalize scale: fit it to roughly 2m tall
    const targetHeight = 2.0;
    const uniformScale = targetHeight / size.y;
    model.scale.setScalar(uniformScale);

    // The origin of this model is in the middle, not at the feet.
    // Offset the model position so the base of the bounding box sits at y=0.
    // We use total scale and the min Y from the bounding box.
    model.position.y = -box.min.y * uniformScale;

    // Enable shadows on every mesh in the model.
    model.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    // Flush all transforms for accurate physics trimesh generation.
    this.mesh.updateWorldMatrix(true, true);

    this.initPhysics();
  }

  // ── Physics ─────────────────────────────────────────────────────────────────

  /**
   * Registers static trimesh colliders for all meshes in the loaded model.
   */
  public initPhysics(): void {
    if (!physicsSystem.world || !this.model) return;
    this._destroyColliders();

    this.model.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return;
      const collider = physicsSystem.addStaticTrimesh(child as THREE.Mesh);
      this.ownedColliders.push(collider);
    });
  }

  public override cleanupPhysics(): void {
    this._destroyColliders();
    super.cleanupPhysics();
  }

  private _destroyColliders(): void {
    for (const c of this.ownedColliders) physicsSystem.removeCollider(c);
    this.ownedColliders = [];
  }

  public objectType: string = 'throne';

  public saveState(): IObjectState {
    const state = this.savePose(this.objectType);
    state.metadata = { hasCrown: this.hasCrown };
    return state;
  }

  public loadState(state: IObjectState): void {
    this.loadPose(state);
    if (state.metadata) {
      this.hasCrown = !!state.metadata.hasCrown;
      this._refreshCrownVisual();
    }
  }

  // ── Interaction ─────────────────────────────────────────────────────────────

  public onInteract(player: Player, heldItem: IGrabbable | null): void {
    const isCrown =
      heldItem &&
      (heldItem instanceof Crown ||
        (heldItem as any).mesh?.userData?.type === 'crown');

    if (isCrown && !this.hasCrown) {
      console.log('[Throne] Crown placed on the throne!');
      if (player.heldItem === heldItem) {
        player.drop();
      }
      this.hasCrown = true;
      this._refreshCrownVisual();
      this.onCrownPlaced?.();
    } else {
      console.log('[Throne] Interacted — need the Crown.');
    }
  }

  private crownVisual: THREE.Object3D | null = null;
  private _refreshCrownVisual(): void {
    if (this.hasCrown) {
      if (!this.crownVisual) {
        const task = assetLoader.fetchGltf('models/crown/crown.glb').then((gltf) => {
          if (!this.hasCrown) return;
          const model = SkeletonUtils.clone(gltf.scene);
          model.scale.set(0.0075, 0.0075, 0.0075);
          model.position.set(-0.6, 1.75, -0.31);
          model.rotation.set(- Math.PI / 2.5, 0, 0);
          this.mesh.add(model);
          this.crownVisual = model;
        });
        assetLoader.trackInstance(task);
      }
    } else if (this.crownVisual) {
      this.mesh.remove(this.crownVisual);
      this.crownVisual = null;
    }
  }

  // ── Public API ───────────────────────────────────────────────────────────────

  public getHasCrown(): boolean {
    return this.hasCrown;
  }

  public setHasCrown(value: boolean): void {
    this.hasCrown = value;
    this._refreshCrownVisual();
  }

  public update(_dt: number): void {
    // Static
  }
}
