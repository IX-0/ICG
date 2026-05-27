import * as THREE from 'three';
import { Grabbable } from './Grabbable';
import { IPersistent } from '../interfaces/IPersistent';
import { IObjectState } from '../interfaces/IState';
import TikiTorch from './TikiTorch';
import { physicsSystem } from '../engine/PhysicsSystem';

export default class WaterBucket extends Grabbable implements IPersistent {
  public persistentId: string = '';
  public objectType: string = 'bucket';

  constructor(persistentId: string = '') {
    super();
    this.persistentId = persistentId;
    
    // Custom hold positioning
    this.holdPosition.set(0.4, -0.6, -1.0);
    this.holdRotation.set(-0.2, 0, 0); 
    this.placementYOffset = 0.3;

    // Bucket body
    const bodyGeo = new THREE.CylinderGeometry(0.3, 0.25, 0.5, 16);
    // Open top, double sided or simple
    const bodyMat = new THREE.MeshStandardMaterial({ 
      color: 0x888888, 
      roughness: 0.6,
      metalness: 0.3,
      side: THREE.DoubleSide
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    this.mesh.add(body);

    // Water surface
    const waterGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.4, 16);
    const waterMat = new THREE.MeshStandardMaterial({
        color: 0x00AACC,
        roughness: 0.1,
        metalness: 0.1,
        transparent: true,
        opacity: 0.8
    });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.position.y = 0.02; // Slightly below brim
    this.mesh.add(water);

    this.mesh.userData = { grabbable: true, instance: this };
  }

  public saveState(): IObjectState {
    return this.saveGrabbableState(this.objectType);
  }

  public loadState(state: IObjectState): void {
    this.loadGrabbableState(state);
  }

  public initPhysics(): void {
    const { body, collider } = physicsSystem.addDynamicPrimitive(this.mesh, { type: 'cylinder', size: [0.25, 0.3] });
    this.rigidBody = body;
    this.collider = collider;
    this.applySavedVelocities();
  }

  public onDrop(throwVel: THREE.Vector3): void {
    super.onDrop(throwVel);
    if (this.rigidBody) {
      this.rigidBody.setAngvel({
        x: (Math.random() - 0.5) * 4,
        y: (Math.random() - 0.5) * 4,
        z: (Math.random() - 0.5) * 4
      }, true);
    }
  }

  public onUse(target?: any): void {
    if (target instanceof TikiTorch) {
      target.setLit(false);
    }
  }

}
