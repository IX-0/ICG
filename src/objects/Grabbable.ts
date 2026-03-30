import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { IGrabbable } from '../interfaces/IGrabbable';
import { IUpdatable } from '../interfaces/IUpdatable';
import { physicsSystem } from '../engine/PhysicsSystem';
import { ModeledObject } from './ModeledObject';

export abstract class Grabbable extends ModeledObject implements IGrabbable, IUpdatable {
  public rigidBody: RAPIER.RigidBody | null = null;
  public collider: RAPIER.Collider | null = null;
  public isHeld: boolean = false;
  
  public holdPosition: THREE.Vector3 = new THREE.Vector3(0.5, -0.4, -0.8);
  public holdRotation: THREE.Euler = new THREE.Euler(0, 0, 0);
  public placementYOffset: number = 0.5;
 
  public abstract initPhysics(): void;

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
