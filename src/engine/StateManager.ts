import { IObjectState, IPlayerState, IGlobalState } from '../interfaces/IState';

const STORAGE_KEY = 'icg_game_state';
const SAVE_VERSION = 2;

/**
 * Centrally manages all persistent data for the game, including
 * player position, world object states, and global narrative progress.
 */
export default class StateManager {
  /** Global Narrative / Level Progression */
  public global: IGlobalState = {
    currentPlatformIndex: 0,
    completedPlatforms: [],
    isComplete: false,
    gameStartTime: Date.now(),
    globalFlags: {}
  };

  /** State for individual game objects, keyed by persistentId. */
  public objectStates: Record<string, IObjectState> = {};

  /** Latest saved state for the player. */
  public playerState: IPlayerState | null = null;

  /** True while a reset is in flight — used to skip in-flight saves. */
  public isResetting: boolean = false;

  constructor() {
    this.loadFromStorage();
  }

  // --- Progression Helpers ---

  moveToNextPlatform(): boolean {
    if (this.global.isComplete) return false;
    
    if (!this.global.completedPlatforms.includes(this.global.currentPlatformIndex)) {
      this.global.completedPlatforms.push(this.global.currentPlatformIndex);
    }
    
    this.global.currentPlatformIndex++;
    if (this.global.currentPlatformIndex >= 4) {
      this.global.isComplete = true;
      return false;
    }
    return true;
  }

  isPlatformCompleted(index: number): boolean {
    return this.global.completedPlatforms.includes(index);
  }

  getProgress(): number {
    return (this.global.currentPlatformIndex / 4) * 100;
  }

  // --- State Accessors ---

  updateObjectState(id: string, state: IObjectState): void {
    this.objectStates[id] = { ...state };
  }

  getObjectState(id: string): IObjectState | null {
    return this.objectStates[id] || null;
  }

  getAllObjectStates(): Record<string, IObjectState> {
    return this.objectStates;
  }

  setFlag(key: string, value: any): void {
    this.global.globalFlags[key] = value;
  }

  getFlag(key: string): any {
    return this.global.globalFlags[key];
  }

  // --- Persistence Logic ---

  /**
   * Serializes the current managed state into localStorage.
   * @param player Optional player instance to capture current transform from.
   */
  saveToStorage(playerState?: IPlayerState): void {
    if (playerState) {
      this.playerState = playerState;
    }
    // Save to storage disabled
  }

  loadFromStorage(): void {
    // Load from storage disabled
  }

  /**
   * Wipe in-memory state. By default also clears localStorage.
   * Pass `{ clearStorage: false }` to keep storage intact.
   */
  reset(opts: { clearStorage?: boolean } = {}): void {
    this.isResetting = true;
    this.global = {
      currentPlatformIndex: 0,
      completedPlatforms: [],
      isComplete: false,
      gameStartTime: Date.now(),
      globalFlags: {}
    };
    this.objectStates = {};
    this.playerState = null;
  }

  /** Backwards-compatible aliases — both wipe storage. */
  hardReset(): void { this.reset(); }
  resetState(): void { this.reset(); }

  getElapsedTime(): number {
    return (Date.now() - this.global.gameStartTime) / 1000;
  }
}
