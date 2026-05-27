import * as THREE from 'three';
import PlatformFactory, { PlatformConfig } from '../../platforms/PlatformFactory';
import StateManager from '../../engine/StateManager';
import { physicsSystem } from '../../engine/PhysicsSystem';
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
    // Check if it already exists at this index/offset to avoid duplicates
    const existing = this.activePlatforms.find(p => (p as any).userData?.index === platformIndex);
    if (existing) return { mesh: existing, config: (existing as any).userData.config, objects: [], offset };

    if (platformIndex < 0 || platformIndex >= 4) {
      console.error(`Invalid platform index: ${platformIndex}`);
      return null;
    }

    const typeMapping = ['sand', 'sand', 'sand', 'sand'] as const;

    const platformConfig: PlatformConfig = {
      index: platformIndex,
      type: typeMapping[platformIndex], 
      variation: 0,
      size: 16,
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
    (platformMesh as any).onLoaded = () => {
      if (physicsSystem.world) {
        this.initPhysicsForObject(platformMesh);
      }
    };
    platformMesh.position.y = -platformConfig.height / 2;
    platformMesh.position.add(offset);
    platformMesh.userData = { index: platformIndex, config: platformConfig }; // Tag it
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

    // Check if the object explicitly disables physics via an instance (like Foliage/PalmTree)
    const instance = (obj as any).userData?.instance;
    if (instance && instance.hasPhysics === false) {
        return;
    }

    if (obj instanceof THREE.Mesh) {
      physicsSystem.addStaticTrimeshAsync(obj).then(collider => {
        if (collider) this.meshColliders.set(obj, collider);
      });
    } else if (obj instanceof THREE.Group) {
      // Recurse for groups to find all meshes (like Palm Trees)
      obj.traverse((child) => {
        if (child instanceof THREE.Mesh && !this.meshColliders.has(child)) {
          physicsSystem.addStaticTrimeshAsync(child).then(collider => {
            if (collider) this.meshColliders.set(child, collider);
          });
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
    
    // Dispose all GPU resources (geometries, materials, textures) recursively
    disposeObjectTree(obj);
  }

  getActivePlatform(): THREE.Object3D | null {
    return this.activePlatforms.length > 0 ? this.activePlatforms[0] : null;
  }

  getInteractiveObjects(): THREE.Object3D[] {
    return this.activePlatforms.filter((obj) => (obj as any).userData?.interactive === true);
  }
}

function disposeObjectTree(object: THREE.Object3D): void {
  object.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      if (mesh.geometry) {
        mesh.geometry.dispose();
      }
      if (mesh.material) {
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const mat of materials) {
          for (const key of Object.keys(mat)) {
            const val = (mat as any)[key];
            if (val && typeof val === 'object' && 'isTexture' in val && val.isTexture) {
              val.dispose();
            }
          }
          mat.dispose();
        }
      }
    }
  });
}
