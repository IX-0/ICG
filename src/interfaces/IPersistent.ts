import * as THREE from 'three';

/**
 * Interface for objects that need to persist their state across platforms
 * or sessions (via localStorage).
 */
export interface IPersistent {
  /**
   * Unique identifier for this object instance in the game world.
   */
  persistentId: string;

  /**
   * Serializes the object's current state into a plain object.
   */
  saveState(): any;

  /**
   * Restores the object's state from a previously serialized object.
   */
  loadState(state: any): void;
}

/**
 * Common data structure for persistent object states.
 */
export interface IPersistentState {
  position: { x: number, y: number, z: number };
  rotation: { x: number, y: number, z: number };
  metadata?: any; // Custom object-specific data (e.g., isOpen, isLit)
}
