import * as THREE from 'three';
import World from '../world/World';
import Player from '../player/Player';
import UIManager from '../ui/UIManager';
import GameState from '../state/GameState';

declare class GameEngine {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  world: World;
  player: Player;
  ui: UIManager;
  gameState: GameState;

  constructor();
  start(): void;
  animate(): void;
  onWindowResize(): void;
  transitionToNextPlatform(): void;
  gameComplete(): void;
}

export default GameEngine;
