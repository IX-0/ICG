import * as THREE from 'three';

// Minimal EnvironmentManager stub
export default class EnvironmentManager {
  scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  setup(): void {
    // no-op
  }

  setSunPosition(_platformIndex: number): void {
    // no-op
  }

  update(_deltaTime: number): void {
    // no-op
  }

  triggerWings(_playerPosition: THREE.Vector3): void {
    // no-op
  }

  getLightingState(): any {
    return { sunAngle: 0, ambientIntensity: 0.5 };
  }

  getEnvironmentMaterial(): any {
    return { fogColor: new THREE.Color(0x87ceeb), ambientLight: 0.5 };
  }
}
