import * as THREE from 'three';
import PlatformManager from './PlatformManager';
import PortalSystem from './PortalSystem';
import EnvironmentManager from './EnvironmentManager';
import InteractionManager from './InteractionManager';
import GameState from '../state/GameState';

// Minimal World stub that keeps API but avoids heavy logic.
export default class World {
  scene: THREE.Scene;
  camera: THREE.Camera;
  gameState: GameState;
  platformManager: PlatformManager;
  portalSystem: PortalSystem;
  environment: EnvironmentManager;
  interaction: InteractionManager;
  currentPlatform: any | null = null;

  constructor(scene: THREE.Scene, camera: THREE.Camera, gameState: GameState) {
    this.scene = scene;
    this.camera = camera;
    this.gameState = gameState;
    this.platformManager = new PlatformManager(scene, gameState);
    this.portalSystem = new PortalSystem(scene, camera);
    this.environment = new EnvironmentManager(scene);
    this.interaction = new InteractionManager(camera);
  }

  loadPlatform(platformIndex: number) {
    this.platformManager.clearPlatforms();
    const platform = this.platformManager.createPlatform(platformIndex);
    this.currentPlatform = platform;
    return platform;
  }

  transitionPlatform(nextPlatformIndex: number) {
    this.loadPlatform(nextPlatformIndex);
  }

  update(_deltaTime: number, _playerPosition: THREE.Vector3, _camera: THREE.Camera) {
    // no-op stub
  }

  handlePlayerInteraction(_playerPosition: THREE.Vector3, _playerDirection: THREE.Vector3) {
    return null;
  }

  onButtonClick(_buttonObject: THREE.Object3D) {
    return null;
  }

  onPortalEnter() {
    return null;
  }

  triggerEndgame(_player: any) {
    // no-op
  }

  getCurrentPlatform() {
    return this.currentPlatform;
  }

  getEnvironment() {
    return this.environment;
  }
}
