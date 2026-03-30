/**
 * Defines the persistent state for individual game objects.
 */
export interface IObjectState {
  /** Map-relative or platform-relative position. */
  position: { x: number; y: number; z: number };
  /** Euler rotation in radians. */
  rotation: { x: number; y: number; z: number };
  /** Custom object-specific properties (e.g., isLit, isOpen). */
  metadata?: any; 
  /** Physical linear velocity vector (if dynamic). */
  linearVelocity?: { x: number; y: number; z: number };
  /** Physical angular velocity vector (if dynamic). */
  angularVelocity?: { x: number; y: number; z: number };
  /** If true, the object is currently held by the player and its world position is managed via the hand. */
  isHeld?: boolean; 
}

/**
 * Defines the persistent state for the player character.
 */
export interface IPlayerState {
  /** Last known world-space position. */
  position: { x: number; y: number; z: number };
  /** Camera yaw (horizontal) in radians. */
  targetYaw: number;
  /** Camera pitch (vertical) in radians. */
  targetPitch: number;
  /** The persistentId of the item currently being held, if any. */
  heldItemId?: string | null; 
}

/**
 * Defines global progression and narrative flags.
 */
export interface IGlobalState {
  /** The current island the player is on. */
  currentPlatformIndex: number;
  /** List of platform indices that have been 'completed'. */
  completedPlatforms: number[];
  /** Whether the game's final story loop has been reached. */
  isComplete: boolean;
  /** Timestamp of when the current run started. */
  gameStartTime: number;
  /** Custom story flags (e.g., 'skeleton_broken'). */
  globalFlags: Record<string, any>;
}
