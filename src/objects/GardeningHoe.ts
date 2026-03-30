import * as THREE from 'three';
import { Grabbable } from './Grabbable';
import { IPersistent } from '../interfaces/IPersistent';
import { IObjectState } from '../interfaces/IState';
import { physicsSystem } from '../engine/PhysicsSystem';

export default class GardeningHoe extends Grabbable implements IPersistent {
  public persistentId: string = '';

  constructor(persistentId: string = '') {
    super();
    this.persistentId = persistentId;
    
    // Visuals
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x5d4037 });
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.8 });

    // Handle
    const handleGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.2, 6);
    const handle = new THREE.Mesh(handleGeo, woodMat);
    this.mesh.add(handle);

    // Blade
    const bladeGeo = new THREE.BoxGeometry(0.3, 0.1, 0.05);
    const blade = new THREE.Mesh(bladeGeo, ironMat);
    blade.position.y = 0.6;
    blade.rotation.x = Math.PI / 2;
    this.mesh.add(blade);

    this.mesh.userData = { grabbable: true, instance: this };
    this.holdPosition.set(0.4, -0.4, -1.0);
    this.holdRotation.set(-Math.PI / 4, 0, 0);
  }

  public saveState(): IObjectState {
    return {
      position: { x: this.mesh.position.x, y: this.mesh.position.y, z: this.mesh.position.z },
      rotation: { x: this.mesh.rotation.x, y: this.mesh.rotation.y, z: this.mesh.rotation.z },
      isHeld: this.isHeld
    };
  }

  public loadState(state: IObjectState): void {
    this.mesh.position.set(state.position.x, state.position.y, state.position.z);
    this.mesh.rotation.set(state.rotation.x, state.rotation.y, state.rotation.z);
    this.isHeld = !!state.isHeld;
  }

  public initPhysics(): void {
    if (!physicsSystem.world) return;
    const { body, collider } = physicsSystem.addDynamicPrimitive(this.mesh, { type: 'box', size: [0.1, 0.6, 0.1] });
    this.rigidBody = body;
    this.collider = collider;
  }

  public onUse(_target?: any): void {

    // Digging handled by World search for X-spot
  }

  public update(dt: number): void {
    super.update(dt);
  }
}
