import * as THREE from 'three';

// Minimal WaterSystem stub
export default class WaterSystem {
  scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  create(): void {
    // no-op: keep light weight
  }

  update(_deltaTime: number): void {
    // no-op
  }

  updateForLighting(_lightingState: any): void {
    // no-op
  }
}
