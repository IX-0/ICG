import * as THREE from 'three';
import GameState from '../state/GameState';
import PlatformManager from './PlatformManager';
import PortalSystem from './PortalSystem';
import EnvironmentManager from './EnvironmentManager';
import InteractionManager from './InteractionManager';

declare class World {
  scene: THREE.Scene;
  camera: THREE.Camera;
  gameState: GameState;
  platformManager: PlatformManager;
  portalSystem: PortalSystem;
  environment: EnvironmentManager;
  interaction: InteractionManager;

  constructor(scene: THREE.Scene, camera: THREE.Camera, gameState: GameState);
  loadPlatform(platformIndex: number): any;
  transitionPlatform(nextPlatformIndex: number): void;
  update(deltaTime: number, playerPosition: THREE.Vector3, camera: THREE.Camera): void;
  handlePlayerInteraction(playerPosition: THREE.Vector3, playerDirection: THREE.Vector3): any;
  onButtonClick(buttonObject: THREE.Object3D): any;
  onPortalEnter(): any;
  triggerEndgame(player: any): void;
  getCurrentPlatform(): any;
  getEnvironment(): EnvironmentManager;
}

export default World;
