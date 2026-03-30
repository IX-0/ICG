import * as THREE from 'three';
import { Grabbable } from './Grabbable';
import { IPersistent } from '../interfaces/IPersistent';
import { IObjectState } from '../interfaces/IState';
import TikiTorch from './TikiTorch';
import { physicsSystem } from '../engine/PhysicsSystem';

export default class Lighter extends Grabbable implements IPersistent {
  public persistentId: string = '';

  private savedLinvel: any = null;
  private savedAngvel: any = null;

  private isIgnited: boolean = false;
  private flame: THREE.Mesh | null = null;

  constructor(persistentId: string = '') {
    super();
    this.persistentId = persistentId;
    
    // Custom hold positioning: closer, off to the side, slightly angled
    this.holdPosition.set(0.3, -0.2, -0.5);
    this.holdRotation.set(0, -Math.PI / 4, 0);
    this.placementYOffset = 0.25;

    // Body
    const bodyGeo = new THREE.BoxGeometry(0.2, 0.4, 0.1);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.8, roughness: 0.2 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    this.mesh.add(body);

    // Lid (visual hint)
    const lidGeo = new THREE.BoxGeometry(0.2, 0.05, 0.1);
    const lidMat = new THREE.MeshStandardMaterial({ color: 0x999999 });
    const lid = new THREE.Mesh(lidGeo, lidMat);
    lid.position.y = 0.22;
    this.mesh.add(lid);

    this.mesh.userData = { grabbable: true, instance: this };
  }

  public saveState(): IObjectState {
    const state: IObjectState = {
      position: { x: this.mesh.position.x, y: this.mesh.position.y, z: this.mesh.position.z },
      rotation: { x: this.mesh.rotation.x, y: this.mesh.rotation.y, z: this.mesh.rotation.z },
      metadata: { isIgnited: this.isIgnited },
      isHeld: this.isHeld
    };
    if (this.rigidBody) {
      const linvel = this.rigidBody.linvel();
      const angvel = this.rigidBody.angvel();
      state.linearVelocity = { x: linvel.x, y: linvel.y, z: linvel.z };
      state.angularVelocity = { x: angvel.x, y: angvel.y, z: angvel.z };
    }
    return state;
  }

  public loadState(state: IObjectState): void {
    this.mesh.position.set(state.position.x, state.position.y, state.position.z);
    this.mesh.rotation.set(state.rotation.x, state.rotation.y, state.rotation.z);
    if (state.metadata && state.metadata.isIgnited !== undefined) {
      this.setIgnited(state.metadata.isIgnited);
    }
    if (state.linearVelocity) this.savedLinvel = state.linearVelocity;
    if (state.angularVelocity) this.savedAngvel = state.angularVelocity;
    this.isHeld = state.isHeld || false;
  }

  public initPhysics(): void {
    if (!physicsSystem.world) return;
    const { body, collider } = physicsSystem.addDynamicPrimitive(this.mesh, { type: 'box', size: [0.1, 0.225, 0.05] });
    this.rigidBody = body;
    this.collider = collider;

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
    super.onGrab();
  }
  public onDrop(throwVel: THREE.Vector3): void {
    super.onDrop(throwVel);
    this.setIgnited(false);
    if (this.rigidBody) {
      this.rigidBody.setAngvel({
        x: (Math.random() - 0.5) * 8,
        y: (Math.random() - 0.5) * 8,
        z: (Math.random() - 0.5) * 8
      }, true);
    }
  }

  private flameTimer: number = 0;

  public onUse(target?: any): void {
    this.setIgnited(true);
    this.flameTimer = 0.5; // Flame stays for 500ms
    
    // If we're looking at a torch while using the lighter, light it
    // Using property check instead of instanceof to avoid circular dependency/HMR issues
    if (target && typeof target.setLit === 'function') {
      target.setLit(true);
    }
  }

  public setIgnited(ignited: boolean): void {
    this.isIgnited = ignited;
    if (this.isIgnited) {
      this._createFlame();
    } else {
      this._removeFlame();
      this.flameTimer = 0;
    }
  }

  private _createFlame(): void {
    if (this.flame) return;
    const flameGeo = new THREE.SphereGeometry(0.04, 6, 6);
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 }); // Changed to a warmer orange
    this.flame = new THREE.Mesh(flameGeo, flameMat);
    this.flame.position.y = 0.25;
    this.mesh.add(this.flame);
  }

  private _removeFlame(): void {
    if (this.flame) {
      this.mesh.remove(this.flame);
      this.flame = null;
    }
  }

  public update(dt: number): void {
    super.update(dt);
    
    if (this.flameTimer > 0) {
      this.flameTimer -= dt;
      if (this.flameTimer <= 0) {
        this.setIgnited(false);
      }
    }
  }
}
