import * as THREE from 'three';

// Runtime stub for Player: small, safe implementation
export default class Player {
  camera: THREE.Camera;
  position: THREE.Vector3 = new THREE.Vector3(0, 1.6, 0);

  constructor(camera: THREE.Camera, _domElement?: HTMLElement) {
    this.camera = camera;
  }

  setPosition(x: number, y: number, z: number) {
    this.position.set(x, y, z);
    if ((this.camera as any).position) (this.camera as any).position.copy(this.position);
  }

  update(_deltaTime: number, _camera: THREE.Camera) {
    // no-op
  }

  attemptInteraction(_world: any) {
    return null;
  }

  enableFlightMode() {
    // no-op
  }
}
