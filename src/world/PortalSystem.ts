import * as THREE from 'three';
import PlatformManager from './PlatformManager';

// Clean minimal PortalSystem stub
export default class PortalSystem {
  scene: THREE.Scene;
  camera: THREE.Camera;

  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    this.scene = scene;
    this.camera = camera;
  }

  createPortal(_scene: THREE.Scene, _platformManager: PlatformManager, _targetIndex: number): void {
    // no-op stub
  }

  dismissPortal(): void {
    // no-op stub
  }

  hasPortal(): boolean {
    return false;
  }

  renderPortalTexture(_renderer: THREE.WebGLRenderer): void {
    // no-op stub
  }

  update(_deltaTime: number): void {
    // no-op stub
  }
}
