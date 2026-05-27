import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { IGrabbable } from '../interfaces/IGrabbable';
import { IUpdatable } from '../interfaces/IUpdatable';
import { IObjectState } from '../interfaces/IState';
import { physicsSystem } from '../engine/PhysicsSystem';
import { ModeledObject } from './ModeledObject';

export abstract class Grabbable extends ModeledObject implements IGrabbable, IUpdatable {
  public rigidBody: RAPIER.RigidBody | null = null;
  public collider: RAPIER.Collider | null = null;
  public isHeld: boolean = false;

  public holdPosition: THREE.Vector3 = new THREE.Vector3(0.5, -0.4, -0.8);
  public holdRotation: THREE.Euler = new THREE.Euler(0, 0, 0);
  public placementYOffset: number = 0.5;

  /** Restored on first physics init after a save load. Cleared after applied. */
  protected savedLinvel: { x: number; y: number; z: number } | null = null;
  protected savedAngvel: { x: number; y: number; z: number } | null = null;

  public abstract initPhysics(): void;

  /** Build a base IObjectState including pose, isHeld, and velocities (when bodied). */
  protected saveGrabbableState(objectType: string): IObjectState {
    const state = this.savePose(objectType);
    state.isHeld = this.isHeld;
    if (this.rigidBody) {
      const lv = this.rigidBody.linvel();
      const av = this.rigidBody.angvel();
      state.linearVelocity = { x: lv.x, y: lv.y, z: lv.z };
      state.angularVelocity = { x: av.x, y: av.y, z: av.z };
    }
    return state;
  }

  /** Apply pose + isHeld + queue velocities for next initPhysics(). */
  protected loadGrabbableState(state: IObjectState): void {
    this.loadPose(state);
    this.isHeld = !!state.isHeld;
    this.savedLinvel = state.linearVelocity ?? null;
    this.savedAngvel = state.angularVelocity ?? null;
  }

  /** Apply queued velocities to the freshly-created body, then clear them. */
  protected applySavedVelocities(): void {
    if (!this.rigidBody) return;
    if (this.savedLinvel) {
      this.rigidBody.setLinvel(this.savedLinvel, true);
      this.savedLinvel = null;
    }
    if (this.savedAngvel) {
      this.rigidBody.setAngvel(this.savedAngvel, true);
      this.savedAngvel = null;
    }
  }

  public onGrab(): void {
    this.isHeld = true;
    
    if (this.rigidBody) {
      physicsSystem.removeBody(this.rigidBody);
      this.rigidBody = null;
      this.collider = null;
    }
  }

  public cleanupPhysics(): void {
    if (this.rigidBody) {
      physicsSystem.removeBody(this.rigidBody);
      this.rigidBody = null;
      this.collider = null;
    }
  }

  public onDrop(throwVelocity: THREE.Vector3 = new THREE.Vector3()): void {
    this.isHeld = false;
    
    // Recreate the physics body from scratch at the current mesh position
    this.initPhysics();

    if (this.rigidBody) {
      this.rigidBody.setLinvel(throwVelocity, true);
      this.rigidBody.setLinearDamping(0.5);
      this.rigidBody.setAngularDamping(1.5);
      this.rigidBody.wakeUp();
    }
  }

  public abstract onUse(target?: any): void;


  public update(dt: number): void {
    if (this.isHeld || !this.rigidBody) return;

    // Frame-rate independent lerp: ~98% convergence per second at any FPS.
    const t = 1 - Math.pow(0.01, dt);
    const pos = this.rigidBody.translation();
    const rot = this.rigidBody.rotation();

    this.mesh.position.lerp(new THREE.Vector3(pos.x, pos.y, pos.z), t);
    this.mesh.quaternion.slerp(new THREE.Quaternion(rot.x, rot.y, rot.z, rot.w), t);
    this.mesh.updateMatrix();
  }

}
