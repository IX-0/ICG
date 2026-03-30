import * as THREE from 'three';
import PlatformFactory, { PlatformConfig } from '../platforms/PlatformFactory';
import StateManager from '../engine/StateManager';
import { physicsSystem } from '../engine/PhysicsSystem';
import type RAPIER from '@dimforge/rapier3d-compat';

export default class PlatformManager {
  scene: THREE.Scene;
  stateManager: StateManager;
  factory: PlatformFactory;
  activePlatforms: THREE.Object3D[] = [];
  private meshColliders: Map<THREE.Object3D, RAPIER.Collider> = new Map();

  constructor(scene: THREE.Scene, stateManager: StateManager) {
    this.scene = scene;
    this.stateManager = stateManager;
    this.factory = new PlatformFactory();
  }

  createPlatform(platformIndex: number, offset: THREE.Vector3 = new THREE.Vector3(0, 0, 0)) {
    if (platformIndex < 0 || platformIndex >= 4) {
      console.error(`Invalid platform index: ${platformIndex}`);
      return null;
    }

    const typeMapping = ['sand', 'gravel', 'sand', 'volcanic'] as const;

    const platformConfig: PlatformConfig = {
      index: platformIndex,
      type: typeMapping[platformIndex], 
      variation: 0,
      size: 22,
      height: 8.0,
    };

    const addManagedMesh = (obj: THREE.Object3D) => {
      this.scene.add(obj);
      this.activePlatforms.push(obj);
      if (physicsSystem.world) {
        this.initPhysicsForObject(obj);
      }
    };

    const platformMesh = this.factory.createPlatformMesh(platformConfig);
    platformMesh.position.y = -platformConfig.height / 2;
    platformMesh.position.add(offset); // Apply Offset
    addManagedMesh(platformMesh);

    return { mesh: platformMesh, config: platformConfig, objects: [], offset };


  }

  private _loadObjectState(obj: any): boolean {
    if (obj.persistentId && obj.loadState) {
      const state = this.stateManager.getObjectState(obj.persistentId);
      if (state) {
        obj.loadState(state);
        return true;
      }
    }
    return false;
  }


  initPhysics() {
    this.activePlatforms.forEach(obj => this.initPhysicsForObject(obj));
  }

  public initPhysicsForObject(obj: THREE.Object3D) {
    if (!physicsSystem.world || this.meshColliders.has(obj)) return;

    if (obj instanceof THREE.Mesh) {
      const collider = physicsSystem.addStaticTrimesh(obj);
      this.meshColliders.set(obj, collider);
    } else if (obj instanceof THREE.Group) {
      // Recurse for groups to find all meshes (like Palm Trees)
      obj.traverse((child) => {
        if (child instanceof THREE.Mesh && !this.meshColliders.has(child)) {
          const collider = physicsSystem.addStaticTrimesh(child);
          this.meshColliders.set(child, collider);
        }
      });
    }
  }

  clearPlatforms() {
    [...this.activePlatforms].forEach((obj) => {
      this.removePlatform(obj);
    });
  }

  public removePlatform(obj: THREE.Object3D) {
    this.scene.remove(obj);
    // Remove and dispose colliders for this object and its children
    const toRemove: THREE.Object3D[] = [];
    obj.traverse(child => toRemove.push(child));
    
    toRemove.forEach(target => {
      const collider = this.meshColliders.get(target);
      if (collider) {
        physicsSystem.removeCollider(collider);
        this.meshColliders.delete(target);
      }
    });

    this.activePlatforms = this.activePlatforms.filter(p => p !== obj);
    
    // Dispose resources
    const anyObj: any = obj;
    if (anyObj.geometry) anyObj.geometry.dispose();
    if (anyObj.material) {
      if (Array.isArray(anyObj.material)) anyObj.material.forEach((m: any) => m.dispose());
      else anyObj.material.dispose();
    }
  }

  getActivePlatform(): THREE.Object3D | null {
    return this.activePlatforms.length > 0 ? this.activePlatforms[0] : null;
  }

  getInteractiveObjects(): THREE.Object3D[] {
    return this.activePlatforms.filter((obj) => (obj as any).userData?.interactive === true);
  }
}
