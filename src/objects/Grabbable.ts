import * as THREE from 'three';
import { IGrabbable } from '../interfaces/IGrabbable';
import { IUpdatable } from '../interfaces/IUpdatable';
import RAPIER from '@dimforge/rapier3d-compat';

export abstract class Grabbable implements IGrabbable, IUpdatable {
  public abstract mesh: THREE.Object3D;
  public rigidBody: RAPIER.RigidBody | null = null;
  public collider: RAPIER.Collider | null = null;
  public isHeld: boolean = false;
  
  public holdPosition: THREE.Vector3 = new THREE.Vector3(0.5, -0.4, -0.8);
  public holdRotation: THREE.Euler = new THREE.Euler(0, 0, 0);

  public abstract initPhysics(): void;

  public onGrab(): void {
    this.isHeld = true;
    if (this.rigidBody) {
      // Switch to kinematic position-based to prevent gravity and collisions affecting it while held
      this.rigidBody.setBodyType(RAPIER.RigidBodyType.KinematicPositionBased, true);
    }
    if (this.collider) {
      // Disable collisions while held
      this.collider.setEnabled(false);
    }
  }

  public onDrop(throwVelocity: THREE.Vector3 = new THREE.Vector3()): void {
    this.isHeld = false;
    if (this.rigidBody) {
      // Set back to dynamic
      this.rigidBody.setBodyType(RAPIER.RigidBodyType.Dynamic, true);
      // Wake up
      this.rigidBody.wakeUp();
      // Apply linear velocity
      this.rigidBody.setLinvel(throwVelocity, true);
      
      // Update its starting position/rotation to match where it was dropped from
      const pos = new THREE.Vector3();
      const quat = new THREE.Quaternion();
      this.mesh.getWorldPosition(pos);
      this.mesh.getWorldQuaternion(quat);
      this.rigidBody.setTranslation(pos, true);
      this.rigidBody.setRotation(quat, true);
    }
    if (this.collider) {
      this.collider.setEnabled(true);
    }
  }

  public abstract onUse(): void;

  public update(_dt: number): void {
    if (!this.isHeld && this.rigidBody) {
      // Sync three.js mesh to Rapier rigid body
      const pos = this.rigidBody.translation();
      const rot = this.rigidBody.rotation();
      this.mesh.position.set(pos.x, pos.y, pos.z);
      this.mesh.quaternion.set(rot.x, rot.y, rot.z, rot.w);
      this.mesh.updateMatrix();
    }
  }
}
