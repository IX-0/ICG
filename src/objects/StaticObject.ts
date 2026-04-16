import * as THREE from 'three';
import type RAPIER from '@dimforge/rapier3d-compat';
import { ModeledObject } from './ModeledObject';
import { IStaticObject } from '../interfaces/IStaticObject';
import { physicsSystem } from '../engine/PhysicsSystem';

export abstract class StaticObject extends ModeledObject implements IStaticObject {
  protected colliders: RAPIER.Collider[] = [];
  protected hasPhysics: boolean = true;

  public initPhysics(): void {
    if (!physicsSystem.world || !this.hasPhysics) return;
    
    // Add a static trimesh for each mesh in this group
    this.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        // Ensure transforms are up to date before grabbing geometry for physics
        child.updateWorldMatrix(true, false);
        const collider = physicsSystem.addStaticTrimesh(child);
        if (collider) {
            this.colliders.push(collider);
        }
      }
    });
  }

  public cleanupPhysics(): void {
    for (const collider of this.colliders) {
      physicsSystem.removeCollider(collider);
    }
    this.colliders = [];
  }
}
