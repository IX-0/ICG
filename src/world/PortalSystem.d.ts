import * as THREE from 'three';
import PlatformManager from './PlatformManager';

declare class PortalSystem {
  scene: THREE.Scene;
  camera: THREE.Camera;

  constructor(scene: THREE.Scene, camera: THREE.Camera);
  createPortal(scene: THREE.Scene, platformManager: PlatformManager, targetIndex: number): void;
  dismissPortal(): void;
  hasPortal(): boolean;
  renderPortalTexture(renderer: THREE.WebGLRenderer): void;
  update(deltaTime: number): void;
}

export default PortalSystem;
