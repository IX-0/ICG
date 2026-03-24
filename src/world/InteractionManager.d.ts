import * as THREE from 'three';

declare class InteractionManager {
  camera: THREE.Camera;
  raycaster: THREE.Raycaster;
  interactiveObjects: THREE.Object3D[];

  constructor(camera: THREE.Camera);
  registerInteractive(object: THREE.Object3D): void;
  unregisterInteractive(object: THREE.Object3D): void;
  clearInteractives(): void;
  raycast(position: THREE.Vector3, direction: THREE.Vector3): THREE.Intersection | null;
  raycastSphere(position: THREE.Vector3, radius: number, objects: THREE.Object3D[]): THREE.Object3D | null;
  getObjectsWithinRange(position: THREE.Vector3, range: number, objects: THREE.Object3D[]): THREE.Object3D[];
}

export default InteractionManager;
