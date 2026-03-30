import Player from '../player/Player';
import StateManager from '../engine/StateManager';

export interface IGameController {
  player: Player;
  stateManager: StateManager;
  /**
   * Request to spawn a specific type of object in front of the player.
   * @param type The type alias of the object ('torch', 'lighter', 'bucket', 'chest')
   */
  spawnObject(type: string): void;

  /**
   * Request to spawn the linked portal pair in the environment.
   */
  spawnPortalPair(): void;

  /**
   * Toggle various visual debug helpers.
   * @param item Type of helper ('axes', 'grid', 'sunHelper', etc)
   * @param visible Whether it should be shown
   */
  toggleDebug(item: string, visible: boolean): void;

   /**
    * Triggers a global save of all persistent objects and player state.
    */
   saveGame(): void;
 
   /**
    * Logic for jumping to a specific platform for debug/story testing.
    */
   jumpToPlatform(index: number): void;
 
   /**
    * Spawns an extra torch in front of the player (simulating bringing it from another island).
    */
   spawnExtraTorch(): void;
 }
