import * as THREE from 'three';
import World from '../world/World';
import Player from '../player/Player';
import UIManager from '../ui/UIManager';
import GameState from '../state/GameState';

// Minimal runtime stub for GameEngine. Keeps API surface but no heavy logic.
export default class GameEngine {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  world: World;
  player: Player;
  ui: UIManager;
  gameState: GameState;

  constructor() {
    this.renderer = new THREE.WebGLRenderer();
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, 1, 0.1, 2000);
    this.gameState = new GameState();
    this.world = new World(this.scene, this.camera, this.gameState);
    this.player = new Player(this.camera);
    this.ui = new UIManager();

    (window as any).gameEngine = this;
  }

  start(): void {
    // no-op stub
  }

  animate(): void {
    requestAnimationFrame(() => this.animate());
    this.renderer.render(this.scene, this.camera);
  }

  onWindowResize(): void {
    // no-op stub
  }

  transitionToNextPlatform(): void {
    this.gameState.moveToNextPlatform();
  }

  gameComplete(): void {
    this.gameState.isComplete = true;
  }
}
