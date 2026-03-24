import * as THREE from 'three';

declare class Player {
  camera: THREE.Camera;
  position: THREE.Vector3;
  constructor(camera: THREE.Camera, domElement?: HTMLElement);
  setPosition(x: number, y: number, z: number): void;
  update(deltaTime: number, camera: THREE.Camera): void;
  attemptInteraction(world: any): void;
  enableFlightMode(): void;
}

export default Player;
