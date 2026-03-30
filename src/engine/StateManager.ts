import { IObjectState, IPlayerState, IGlobalState } from '../interfaces/IState';

const STORAGE_KEY = 'icg_game_state';

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

  getCurrentType(): number {
    return this.global.currentPlatformIndex;
  }

  getCurrentVariation(): number {
    return 0;
  }

  getStoryClue(): string {
    const idx = this.global.currentPlatformIndex;
    if (idx === 0) return 'Where am I?';
    if (idx === 1) return 'This looks familiar...';
    if (idx === 2) return "It's repeating. I'm trapped in a loop.";
    return "This must be the end.";
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

    const data = {
      global: this.global,
      objectStates: this.objectStates,
      playerState: this.playerState
    };
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    console.log('Game state saved to storage.');
  }

  /**
   * Deserializes state from localStorage.
   */
  loadFromStorage(): void {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    try {
      const data = JSON.parse(raw);
      if (data.global) this.global = data.global;
      if (data.objectStates) this.objectStates = data.objectStates;
      if (data.playerState) this.playerState = data.playerState;
    } catch (e) {
      console.error('Failed to parse GameState from localStorage:', e);
    }
  }

  /**
   * Wipes localStorage and resets in-memory state.
   */
  hardReset(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.reset();
  }

  resetState(): void {
    this.reset();
    localStorage.removeItem(STORAGE_KEY);
    console.log('Game state fully reset.');
  }

  reset(): void {
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

  getElapsedTime(): number {
    return (Date.now() - this.global.gameStartTime) / 1000;
  }
}
