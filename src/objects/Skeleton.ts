import * as THREE from 'three';
import { Interactable } from './Interactable';
import { IPersistent } from '../interfaces/IPersistent';
import { IObjectState } from '../interfaces/IState';
import Player from '../player/Player';
import { IGrabbable } from '../interfaces/IGrabbable';
import { physicsSystem } from '../engine/PhysicsSystem';

/**
 * A dead skeleton that can be interacted with to get a crown.
 */
export default class Skeleton extends Interactable implements IPersistent {
  public persistentId: string = '';
  private isBones: boolean = false;
  private hasCrown: boolean = true;
  private bonesMesh: THREE.Group;
  private skeletonMesh: THREE.Group;
  private crownRef: THREE.Object3D | null = null;

  public onInteractTakeCrown?: () => void;

  constructor(isBones: boolean = false, hasCrown: boolean = true, persistentId: string = '') {
    super();
    this.isBones = isBones;
    this.hasCrown = hasCrown;
    this.persistentId = persistentId;
    
    this.skeletonMesh = this._createSkeletonMesh();
    this.bonesMesh = this._createBonesMesh();
    
    this._refreshMesh();

    this.mesh.userData = { interactable: !this.isBones, instance: this };
  }

  public saveState(): IObjectState {
    return {
      position: { x: this.mesh.position.x, y: this.mesh.position.y, z: this.mesh.position.z },
      rotation: { x: this.mesh.rotation.x, y: this.mesh.rotation.y, z: this.mesh.rotation.z },
      metadata: {
        isBones: this.isBones,
        hasCrown: this.hasCrown
      }
    };
  }

  public loadState(state: IObjectState): void {
    this.mesh.position.set(state.position.x, state.position.y, state.position.z);
    this.mesh.rotation.set(state.rotation.x, state.rotation.y, state.rotation.z);
    if (state.metadata) {
      this.isBones = !!state.metadata.isBones;
      this.hasCrown = !!state.metadata.hasCrown;
      this._refreshMesh();
    }
  }

  private _refreshMesh(): void {
    this.mesh.remove(this.bonesMesh);
    this.mesh.remove(this.skeletonMesh);
    
    if (this.isBones) {
      this.mesh.add(this.bonesMesh);
      this.mesh.userData.interactable = false;
    } else {
      this.mesh.add(this.skeletonMesh);
      this.mesh.userData.interactable = true;
      if (this.hasCrown) {
        this._addCrown();
      } else if (this.crownRef) {
        this.skeletonMesh.remove(this.crownRef);
        this.crownRef = null;
      }
    }
  }


  private _createSkeletonMesh(): THREE.Group {
    const group = new THREE.Group();
    const boneMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.9 });
    
    // Skull
    const skullGeo = new THREE.SphereGeometry(0.15, 8, 8);
    const skull = new THREE.Mesh(skullGeo, boneMat);
    skull.position.y = 0.8;
    group.add(skull);
    
    // Ribcage
    const ribGeo = new THREE.BoxGeometry(0.4, 0.4, 0.2);
    const ribs = new THREE.Mesh(ribGeo, boneMat);
    ribs.position.y = 0.45;
    group.add(ribs);
    
    // Legs
    const legGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.4, 6);
    const legL = new THREE.Mesh(legGeo, boneMat);
    legL.position.set(-0.15, 0.2, 0);
    legL.rotation.z = 0.1;
    group.add(legL);
    
    const legR = new THREE.Mesh(legGeo, boneMat);
    legR.position.set(0.15, 0.2, 0);
    legR.rotation.z = -0.1;
    group.add(legR);

    // Arms
    const armGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.4, 6);
    const armL = new THREE.Mesh(armGeo, boneMat);
    armL.position.set(-0.25, 0.5, 0);
    armL.rotation.z = 0.5;
    group.add(armL);

    const armR = new THREE.Mesh(armGeo, boneMat);
    armR.position.set(0.25, 0.5, 0);
    armR.rotation.z = -0.5;
    group.add(armR);

    return group;
  }

  private _createBonesMesh(): THREE.Group {
    const group = new THREE.Group();
    const boneMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.9 });
    
    // Scattered parts
    for (let i = 0; i < 8; i++) {
      const bone = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03 + Math.random() * 0.02, 0.03 + Math.random() * 0.02, 0.15 + Math.random() * 0.2, 6),
        boneMat
      );
      bone.position.set((Math.random() - 0.5) * 0.6, 0.05, (Math.random() - 0.5) * 0.6);
      bone.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      group.add(bone);
    }
    
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), boneMat);
    skull.position.set(0.1, 0.1, -0.2);
    skull.rotation.set(0.5, 2.2, 0);
    group.add(skull);

    return group;
  }

  private _addCrown(): void {
    // Basic visual crown for the skeleton
    const crownGeo = new THREE.TorusGeometry(0.16, 0.03, 8, 16);
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.9 });
    const crown = new THREE.Mesh(crownGeo, goldMat);
    crown.position.y = 0.98; // On top of skull
    crown.rotation.x = Math.PI / 2;
    this.skeletonMesh.add(crown);
    this.crownRef = crown;
  }

  public onInteract(_player: Player, _heldItem: IGrabbable | null): void {
    if (this.isBones) return;
    
    console.log("Skeleton broken! Crown taken.");

    // Toggle to bones
    this.isBones = true;
    this.hasCrown = false;
    
    this._refreshMesh();
    
    if (this.onInteractTakeCrown) {
      this.onInteractTakeCrown();
    }
  }

  public initPhysics(): void {
    if (!physicsSystem.world) return;
    // Static collider for the pile/skeleton base
    const { body, collider } = physicsSystem.addFixedPrimitive(this.mesh, { type: 'box', size: [0.4, 0.2, 0.4] });
    this.rigidBody = body;
    this.collider = collider;
  }

  public getIsBones(): boolean {
    return this.isBones;
  }

  public update(_dt: number): void {}
}
