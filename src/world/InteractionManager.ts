import * as THREE from 'three';

// Minimal InteractionManager stub
export default class InteractionManager {
  camera: THREE.Camera;
  raycaster: THREE.Raycaster;
  interactiveObjects: THREE.Object3D[] = [];

  constructor(camera: THREE.Camera) {
    this.camera = camera;
    this.raycaster = new THREE.Raycaster();
  }

  registerInteractive(_object: THREE.Object3D): void {
    // no-op stub
  }

  unregisterInteractive(_object: THREE.Object3D): void {
    // no-op stub
  }

  clearInteractives(): void {
    this.interactiveObjects = [];
  }

  raycast(_position: THREE.Vector3, _direction: THREE.Vector3): THREE.Intersection | null {
    return null;
  }

  raycastSphere(_position: THREE.Vector3, _radius: number, _objects: THREE.Object3D[]): THREE.Object3D | null {
    return null;
  }

  getObjectsWithinRange(_position: THREE.Vector3, _range: number, objects: THREE.Object3D[]): THREE.Object3D[] {
    return objects || [];
  }
}
