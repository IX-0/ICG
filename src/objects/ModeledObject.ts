import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { IModeled } from '../interfaces/IModeled';

/**
 * Base class for any scene object backed by a GLTF/GLB model.
 *
 * Responsibilities:
 *   - Async model loading via GLTFLoader
 *   - Exposes gltf.animations so subclasses can use AnimationMixer
 *   - Optional per-material texture override via applyCustomTexture()
 *
 * To add a new modeled object:
 *   1. Extend this class (or Interactable for interactable objects).
 *   2. Set `this.modelPath` in the constructor.
 *   3. Call `this.loadModel()` when ready — it resolves with the gltf.scene Group.
 *   4. Override `onModelLoaded()` for post-load setup (scale, materials, etc.)
 *      instead of overriding the full async loadModel() method.
 */
export abstract class ModeledObject implements IModeled {
  /** Root container for this object's 3D representation. */
  public mesh: THREE.Group = new THREE.Group();

  /** Loaded GLTF scene group. Null until loadModel() resolves. */
  public model: THREE.Group | null = null;

  /** Animation clips from the GLTF. Populated after loadModel() resolves. */
  public animations: THREE.AnimationClip[] = [];

  /** Path to the .gltf or .glb file, relative to the public/ directory. */
  public modelPath: string = '';

  /** Optional texture path to override all materials after loading. */
  public customTexturePath?: string;

  /** Shared loader instance per object. Can be replaced with a cached loader. */
  protected readonly loader: GLTFLoader = new GLTFLoader();

  // ── Loading ────────────────────────────────────────────────────────────────

  /**
   * Loads the GLTF model, attaches it to this.mesh, and calls onModelLoaded().
   * Subclasses should override `onModelLoaded()` for post-load setup rather
   * than overriding this method, to avoid duplicating the async machinery.
   */
  public async loadModel(): Promise<THREE.Group> {
    if (!this.modelPath) {
      console.warn(`[${this.constructor.name}] No modelPath set — skipping load.`);
      return this.mesh;
    }

    return new Promise<THREE.Group>((resolve, reject) => {
      this.loader.load(
        this.modelPath,
        async (gltf) => {
          this.model = gltf.scene;
          this.animations = gltf.animations ?? [];
          this.mesh.add(this.model);

          if (this.customTexturePath) {
            await this.applyCustomTexture(this.customTexturePath);
          }

          await this.onModelLoaded(this.model);
          resolve(this.model);
        },
        undefined,
        (error) => {
          console.error(`[${this.constructor.name}] Failed to load model "${this.modelPath}":`, error);
          reject(error);
        }
      );
    });
  }

  /**
   * Called automatically after the model is loaded and attached to this.mesh.
   * Override in subclasses to apply scale, find child nodes, set up animations, etc.
   * The base implementation is a no-op.
   */
  protected async onModelLoaded(_model: THREE.Group): Promise<void> {
    // No-op — subclasses override as needed.
  }

  // ── Texture ────────────────────────────────────────────────────────────────

  /**
   * Overrides all MeshStandardMaterial maps on every mesh in the model.
   * Safe to call before the model is loaded — it will warn and return.
   * To apply on load, set `this.customTexturePath` before calling loadModel().
   */
  public async applyCustomTexture(texturePath: string): Promise<void> {
    this.customTexturePath = texturePath;

    if (!this.model) {
      console.warn(`[${this.constructor.name}] Cannot apply texture — model not loaded yet.`);
      return;
    }

    return new Promise<void>((resolve, reject) => {
      new THREE.TextureLoader().load(
        texturePath,
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.flipY = false;
          this.model!.traverse((child) => {
            if (!(child as THREE.Mesh).isMesh) return;
            const mesh = child as THREE.Mesh;
            const materials = Array.isArray(mesh.material)
              ? mesh.material
              : [mesh.material];
            materials.forEach((m) => this._applyTextureMap(m, texture));
          });
          resolve();
        },
        undefined,
        (error) => {
          console.error(`[${this.constructor.name}] Failed to load texture "${texturePath}":`, error);
          reject(error);
        }
      );
    });
  }

  /** Applies a texture to a material's map slot if one exists. */
  protected _applyTextureMap(material: THREE.Material, texture: THREE.Texture): void {
    if ('map' in material) {
      (material as THREE.MeshStandardMaterial).map = texture;
      material.needsUpdate = true;
    }
  }
}
