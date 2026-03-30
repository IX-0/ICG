import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import Player from '../player/Player';
import { physicsSystem } from '../engine/PhysicsSystem';
import { IInteractable } from '../interfaces/IInteractable';
import { IUpdatable } from '../interfaces/IUpdatable';
import { IGrabbable } from '../interfaces/IGrabbable';
import { ModeledObject } from './ModeledObject';

/**
 * Abstract base for all interactable objects.
 * Extends ModeledObject so every Interactable automatically supports GLTF
 * loading and texture swapping without extra boilerplate.
 *
 * Subclasses must implement:
 *   - initPhysics()  — register colliders with PhysicsSystem
 *   - onInteract()   — respond to player interaction
 *   - update()       — per-frame logic / animations
 */
export abstract class Interactable extends ModeledObject implements IInteractable, IUpdatable {

  // ── Physics handles ────────────────────────────────────────────────────────

  /** Primary rigid body (legacy single-body objects). May be null for multi-body objects. */
  protected rigidBody: RAPIER.RigidBody | null = null;
  /** Primary collider paired with rigidBody. */
  protected collider: RAPIER.Collider | null = null;

  // ── Abstract contract ──────────────────────────────────────────────────────

  /** Register all Rapier colliders for this object. Called after the model loads. */
  public abstract initPhysics(): void;

  /** Respond to a player interaction event. */
  public abstract onInteract(player: Player, heldItem: IGrabbable | null): void;

  /** Per-frame update (animations, logic). */
  public abstract update(dt: number): void;

  // ── Shared physics cleanup ─────────────────────────────────────────────────

  /**
   * Removes the single tracked rigidBody from the physics world.
   * Subclasses that manage multiple bodies should override this method
   * or call physicsSystem.removeBody() / physicsSystem.removeCollider() directly.
   */
  public cleanupPhysics(): void {
    if (this.rigidBody) {
      physicsSystem.removeBody(this.rigidBody);
      this.rigidBody = null;
      this.collider = null;
    }
  }
}
