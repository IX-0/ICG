import * as THREE from 'three';

declare class EnvironmentManager {
  scene: THREE.Scene;
  constructor(scene: THREE.Scene);
  setup(): void;
  setSunPosition(platformIndex: number): void;
  update(deltaTime: number): void;
  triggerWings(playerPosition: THREE.Vector3): void;
  getLightingState(): any;
  getEnvironmentMaterial(): any;
}

export default EnvironmentManager;
