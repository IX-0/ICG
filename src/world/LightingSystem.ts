import * as THREE from 'three';

// Minimal LightingSystem stub
export default class LightingSystem {
  scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  setup(): void {
    // no-op
  }

  setSunTime(_hourOfDay: number): void {
    // no-op
  }

  update(_deltaTime: number): void {
    // no-op
  }

  getLightingState(): any {
    return { hourOfDay: 12, sunAngle: 0, ambientIntensity: 0.6 };
  }

  getAmbientIntensity(): number {
    return 0.6;
  }

  getSunLight(): any {
    return null;
  }

  getFogColor(): THREE.Color {
    return new THREE.Color(0x87ceeb);
  }
}
