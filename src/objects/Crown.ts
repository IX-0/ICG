import * as THREE from 'three';
import { Grabbable } from './Grabbable';
import { IPersistent } from '../interfaces/IPersistent';
import { IObjectState } from '../interfaces/IState';
import { physicsSystem } from '../engine/PhysicsSystem';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export default class Crown extends Grabbable implements IPersistent {
  public persistentId: string = '';

  constructor() {
    super();
    this.modelPath = 'models/crown/crown.glb';
    
    this.holdPosition.set(0, -0.2, -0.6);
    this.holdRotation.set(-Math.PI / 4, 0, 0);
    this.placementYOffset = 0.2;

    this.mesh.userData = { grabbable: true, instance: this, type: 'crown' };
    this.loadModel();
  }

  protected async onModelLoaded(model: THREE.Group): Promise<void> {
    model.scale.set(0.01, 0.01, 0.01);
    model.traverse(c => { if ((c as THREE.Mesh).isMesh) { c.castShadow = true; c.receiveShadow = true; } });
    if (!this.isHeld) this.initPhysics();
  }

  public objectType: string = 'crown';

  public saveState(): IObjectState {
    return this.saveGrabbableState(this.objectType);
  }

  public loadState(state: IObjectState): void {
    this.loadGrabbableState(state);
  }

  public initPhysics(): void {
    if (!physicsSystem.world) return;
    if (this.rigidBody) {
      physicsSystem.removeBody(this.rigidBody);
      this.rigidBody = null;
      this.collider = null;
    }
    let physicsMesh: THREE.Mesh | null = null;
    this.mesh.traverse((child) => {
      if (!physicsMesh && (child as THREE.Mesh).isMesh) {
        physicsMesh = child as THREE.Mesh;
      }
    });
    if (!physicsMesh) return;
    const { body, collider } = physicsSystem.addDynamicConvexHull(physicsMesh);
    this.rigidBody = body;
    this.collider = collider;
    this.applySavedVelocities();
  }

  public onUse(_target?: any): void {}
}
