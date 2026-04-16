import * as THREE from 'three';
import { Interactable } from './Interactable';
import { IPersistent } from '../interfaces/IPersistent';
import { IObjectState } from '../interfaces/IState';
import Player from '../player/Player';
import { IGrabbable } from '../interfaces/IGrabbable';
import { physicsSystem } from '../engine/PhysicsSystem';

export default class Coffin extends Interactable implements IPersistent {
  public persistentId: string = '';
  public onClose?: () => void;

  private isClosed: boolean = false;
  private isVisible: boolean = false;

  constructor(persistentId: string = '') {
    super();
    this.persistentId = persistentId;
    this.modelPath = 'models/wooden_coffin/scene.gltf';
    
    this.mesh.userData = { interactable: true, instance: this };
    this.mesh.visible = false; // Start hidden
    this.loadModel();
  }

  protected async onModelLoaded(model: THREE.Group): Promise<void> {
    // Correct scaling/rotation for the coffin asset if necessary
    model.scale.set(0.5, 0.5, 0.5);
    // Ensure on Layer 0
    model.traverse(c => { if ((c as THREE.Mesh).isMesh) c.layers.set(0); });
  }

  public setVisible(visible: boolean) {
    this.isVisible = visible;
    this.mesh.visible = visible;
  }

  public saveState(): IObjectState {
    return {
      position: { x: this.mesh.position.x, y: this.mesh.position.y, z: this.mesh.position.z },
      rotation: { x: this.mesh.rotation.x, y: this.mesh.rotation.y, z: this.mesh.rotation.z },
      metadata: {
        isClosed: this.isClosed,
        isVisible: this.isVisible
      }
    };
  }

  public loadState(state: IObjectState): void {
    this.mesh.position.set(state.position.x, state.position.y, state.position.z);
    this.mesh.rotation.set(state.rotation.x, state.rotation.y, state.rotation.z);
    if (state.metadata) {
      this.isClosed = !!state.metadata.isClosed;
      this.isVisible = !!state.metadata.isVisible;
      this.mesh.visible = this.isVisible;
    }
  }

  public onInteract(_player: Player, _heldItem: IGrabbable | null): void {
    if (!this.isVisible) return;
    if (this.isClosed) return;

    this.isClosed = true;
    console.log("The coffin is closed. The tragedy is complete.");
    
    if (this.onClose) {
      this.onClose();
    }
  }

  public initPhysics(): void {
    if (!physicsSystem.world) return;
    // Using a box for the coffin physics
    const { body, collider } = physicsSystem.addFixedPrimitive(this.mesh, { type: 'box', size: [1.0, 0.25, 0.4] });
    this.rigidBody = body;
    this.collider = collider;
  }

  public update(_dt: number): void {}
}
