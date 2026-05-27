import * as THREE from 'three';
import Player from '../player/Player';
import StateManager from '../engine/StateManager';
import World from '../world/World';
import { Interactable } from '../objects/Interactable';
import DebugManager from '../engine/DebugManager';

export interface IGameController {
  scene: THREE.Scene;
  world: World;
  player: Player;
  stateManager: StateManager;
  interactables: Interactable[];
  grabbables: any[];
  debugManager: DebugManager;

  /**
   * Triggers a global save of all persistent objects and player state.
   */
  saveGame(): void;
}
