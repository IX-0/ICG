import * as THREE from 'three';
import { Grabbable } from './Grabbable';
import { IPersistent } from '../interfaces/IPersistent';
import { IObjectState } from '../interfaces/IState';
import { physicsSystem } from '../engine/PhysicsSystem';

export default class Crown extends Grabbable implements IPersistent {
  public persistentId: string = '';

  private savedLinvel: any = null;
  private savedAngvel: any = null;

  constructor() {
    super();
    
    this.holdPosition.set(0, -0.2, -0.6);
    this.holdRotation.set(-Math.PI / 4, 0, 0);
    this.placementYOffset = 0.2;

    // Crown Base (Ring)
    const baseGeo = new THREE.TorusGeometry(0.2, 0.04, 8, 24);
    const goldMat = new THREE.MeshStandardMaterial({ 
      color: 0xffd700, 
      metalness: 0.9, 
      roughness: 0.1,
      emissive: 0x443300,
      emissiveIntensity: 0.2
    });
    const base = new THREE.Mesh(baseGeo, goldMat);
    base.rotation.x = Math.PI / 2;
    this.mesh.add(base);

    // Points
    for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const pointGeo = new THREE.ConeGeometry(0.04, 0.15, 4);
        const point = new THREE.Mesh(pointGeo, goldMat);
        point.position.x = Math.cos(angle) * 0.2;
        point.position.z = Math.sin(angle) * 0.2;
        point.position.y = 0.08;
        this.mesh.add(point);
    }

    this.mesh.userData = { grabbable: true, instance: this, type: 'crown' };
  }

  public saveState(): IObjectState {
    const state: IObjectState = {
      position: { x: this.mesh.position.x, y: this.mesh.position.y, z: this.mesh.position.z },
      rotation: { x: this.mesh.rotation.x, y: this.mesh.rotation.y, z: this.mesh.rotation.z },
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
    if (state.linearVelocity) this.savedLinvel = state.linearVelocity;
    if (state.angularVelocity) this.savedAngvel = state.angularVelocity;
    this.isHeld = state.isHeld || false;
  }

  public initPhysics(): void {
    if (!physicsSystem.world) return;
    const { body, collider } = physicsSystem.addDynamicPrimitive(this.mesh, { type: 'cylinder', size: [0.1, 0.2] });
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

  public onUse(_target?: any): void {

    // Maybe some sparkle effect?
    console.log("Using the crown...");
  }
}
