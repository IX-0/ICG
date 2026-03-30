import * as THREE from 'three';

/**
 * Interface for objects that load custom GLTF/GLB models and support
 * optional texture overrides.
 */
export interface IModeled {
  /** Path to the .gltf or .glb file, relative to the public/ directory. */
  modelPath: string;

  /** Optional texture path to override all materials after loading. */
  customTexturePath?: string;

  /** The loaded GLTF scene group. Null until loadModel() resolves. */
  model: THREE.Group | null;

  /** Animation clips from the GLTF. Populated after loadModel() resolves. */
  animations: THREE.AnimationClip[];

  /** Loads the GLTF model and returns the scene Group once complete. */
  loadModel(): Promise<THREE.Group>;

  /** Overrides all material maps with a texture loaded from texturePath. */
  applyCustomTexture(texturePath: string): Promise<void>;
}
