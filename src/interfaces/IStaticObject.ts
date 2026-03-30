import * as THREE from 'three';

/**
 * Interface for static objects in the game world.
 */
export interface IStaticObject {
  /** Root container for this object's 3D representation. */
  mesh: THREE.Object3D;
  
  /** Registers collision with the physics system. */
  initPhysics(): void;
  
  /** Cleans up physics bodies/colliders. */
  cleanupPhysics(): void;
}
