import * as THREE from 'three';
import { Interactable } from './Interactable';
import { IPersistent } from '../interfaces/IPersistent';
import { IObjectState } from '../interfaces/IState';
import Player from '../player/Player';
import { IGrabbable } from '../interfaces/IGrabbable';
import Crown from './Crown';
import { physicsSystem } from '../engine/PhysicsSystem';

export default class Throne extends Interactable implements IPersistent {
  public mesh: THREE.Group;
  public persistentId: string = '';
  private isOccupied: boolean = false;
  private hasCrown: boolean = false;
  
  public onCrownPlaced?: () => void;

  constructor(persistentId: string = '') {
    super();
    this.persistentId = persistentId;
    this.mesh = new THREE.Group();
    
    this._createVisuals();
    
    this.mesh.userData = { interactable: true, instance: this };
  }

  private _createVisuals() {
    // Basic wooden throne
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.8 });
    
    // Seat
    const seatGeo = new THREE.BoxGeometry(1.2, 0.2, 1.0);
    const seat = new THREE.Mesh(seatGeo, woodMat);
    seat.position.y = 0.5;
    this.mesh.add(seat);
    
    // Backrest
    const backGeo = new THREE.BoxGeometry(1.2, 1.8, 0.15);
    const back = new THREE.Mesh(backGeo, woodMat);
    back.position.set(0, 1.4, -0.45);
    this.mesh.add(back);
    
    // Armrests
    const armGeo = new THREE.BoxGeometry(0.15, 0.6, 0.9);
    const armL = new THREE.Mesh(armGeo, woodMat);
    armL.position.set(-0.525, 0.8, 0);
    this.mesh.add(armL);
    
    const armR = new THREE.Mesh(armGeo, woodMat);
    armR.position.set(0.525, 0.8, 0);
    this.mesh.add(armR);
  }

  public saveState(): IObjectState {
    return {
      position: { x: this.mesh.position.x, y: this.mesh.position.y, z: this.mesh.position.z },
      rotation: { x: this.mesh.rotation.x, y: this.mesh.rotation.y, z: this.mesh.rotation.z },
      metadata: {
        isOccupied: this.isOccupied,
        hasCrown: this.hasCrown
      }
    };
  }

  public loadState(state: IObjectState): void {
    this.mesh.position.set(state.position.x, state.position.y, state.position.z);
    this.mesh.rotation.set(state.rotation.x, state.rotation.y, state.rotation.z);
    if (state.metadata) {
      this.isOccupied = !!state.metadata.isOccupied;
      this.hasCrown = !!state.metadata.hasCrown;
    }
  }

  public onInteract(player: Player, heldItem: IGrabbable | null): void {
    const isCrown = heldItem && ((heldItem as any).mesh.userData?.type === 'crown' || heldItem instanceof Crown);
    if (isCrown && !this.hasCrown) {
      console.log("Crown placed on the throne!");
      
      // 1. Consume the Crown
      if (player.heldItem === heldItem) {
        player.drop();
      }
      
      this.hasCrown = true;
      if (this.onCrownPlaced) {
        this.onCrownPlaced();
      }
    } else {
      console.log("Interacted with Throne. Need the Crown.");
    }
  }

  public initPhysics(): void {
    if (!physicsSystem.world) return;
    // Static collider for the throne
    const { body, collider } = physicsSystem.addFixedPrimitive(this.mesh, { type: 'box', size: [0.6, 0.8, 0.5] });
    this.rigidBody = body;
    this.collider = collider;
  }

  public getHasCrown(): boolean {
    return this.hasCrown;
  }

  public update(_dt: number): void {}
}
