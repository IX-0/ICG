import * as THREE from 'three';
import GameState from '../state/GameState';
import { PlatformConfig } from '../platforms/PlatformFactory';

declare class PlatformManager {
  scene: THREE.Scene;
  gameState: GameState;
  factory: any;
  activePlatforms: THREE.Object3D[];

  constructor(scene: THREE.Scene, gameState: GameState);
  createPlatform(platformIndex: number): { mesh: THREE.Object3D; props: THREE.Object3D[]; button: THREE.Object3D; config: PlatformConfig } | null;
  clearPlatforms(): void;
  getActivePlatform(): THREE.Object3D | null;
  getInteractiveObjects(): THREE.Object3D[];
}

export default PlatformManager;
