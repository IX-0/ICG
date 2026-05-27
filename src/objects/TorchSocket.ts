import * as THREE from 'three';
import { Interactable } from './Interactable';
import { IPersistent } from '../interfaces/IPersistent';
import { IObjectState } from '../interfaces/IState';
import { physicsSystem } from '../engine/PhysicsSystem';
import Player from '../player/Player';
import { IGrabbable } from '../interfaces/IGrabbable';
import TikiTorch from './TikiTorch';
import { createTorchSocketPlaceholder } from './placeholders/PlaceholderFactory';

export default class TorchSocket extends Interactable implements IPersistent {
  public persistentId: string = '';
  public socketIndex: number;
  public acceptedItem: string = 'torch';
  public currentItem: TikiTorch | null = null;
  public onItemPlaced: ((socket: TorchSocket) => void) | null = null;
  private placeholder: THREE.Group;
  private pendingItemId: string | null = null;

  constructor(socketIndex: number, persistentId: string = '') {
    super();
    this.socketIndex = socketIndex;
    this.persistentId = persistentId;
    // Swap: set modelPath to 'models/torch_socket/torch_socket.glb' when asset arrives.
    this.modelPath = '';

    this.placeholder = createTorchSocketPlaceholder();
    this.mesh.add(this.placeholder);
    this.mesh.userData = { interactable: true, instance: this };
  }

  protected async onModelLoaded(model: THREE.Group): Promise<void> {
    this.mesh.remove(this.placeholder);
    model.scale.setScalar(1.0);
    model.traverse(c => { if ((c as THREE.Mesh).isMesh) { c.castShadow = true; c.receiveShadow = true; } });
  }

  public onInteract(_player: Player, heldItem: IGrabbable | null): void {
    if (this.currentItem) {
      // Light the torch already in the socket
      this.currentItem.setLit(true);
      return;
    }
    
    if (!heldItem || !(heldItem instanceof TikiTorch)) return;

    this.currentItem = heldItem as TikiTorch;
    this.currentItem.inSocket = true;
    _player.drop();
    
    const game = (window as any).gameEngine;
    if (game) {
      game.world.interaction.registerInteractive(this.currentItem.mesh);
    }
    
    // Stop physics so it stays put and loses collision while in the socket
    if (this.currentItem.rigidBody) {
      this.currentItem.cleanupPhysics();
    }
    
    this.currentItem.mesh.position.copy(this.mesh.position);
    this.currentItem.mesh.position.y += 0.5;
    this.currentItem.mesh.rotation.set(0, 0, 0); // Straight up
    this.currentItem.mesh.updateMatrix();
    this.currentItem.mesh.updateMatrixWorld(true);

    // [AUTOSAVE_DISABLED] auto-save on torch socket
    // if (game) game.saveGame();

    // If grabbed from the socket, clear it
    const torch = this.currentItem;
    torch.onGrab = () => {
      delete (torch as any).onGrab; // Restore prototype method
      torch.onGrab(); // Call it
      this.currentItem = null;
    };

    this.onItemPlaced?.(this);
  }

  public getIsOccupied(): boolean {
    return this.currentItem !== null;
  }

  public getIsLit(): boolean {
    return this.currentItem?.getIsLit() ?? false;
  }

  public objectType: string = 'socket';

  public saveState(): IObjectState {
    const state = this.savePose(this.objectType);
    state.metadata = {
      hasItem: !!this.currentItem,
      itemId: this.currentItem ? this.currentItem.persistentId : null,
      isLit: this.getIsLit(),
    };
    return state;
  }

  public loadState(state: IObjectState): void {
    this.loadPose(state);
    if (state.metadata?.hasItem && state.metadata.itemId) {
      this.pendingItemId = state.metadata.itemId;
    }
  }

  public initPhysics(): void {
    if (!physicsSystem.world) return;
    physicsSystem.addFixedPrimitive(this.mesh, { type: 'box', size: [0.2, 0.2, 0.2] });
  }

  public update(_dt: number): void {
    if (this.pendingItemId) {
      const game = (window as any).gameEngine;
      if (game && game.world) {
        const torch = game.world.puzzleObjects.find((o: any) => o.persistentId === this.pendingItemId);
        if (torch) {
          const torchObj = torch as TikiTorch;
          this.currentItem = torchObj;
          
          // CRITICAL: Ensure physics is cleaned up and state is synced
          torchObj.inSocket = true;
          if (torchObj.cleanupPhysics) {
            torchObj.cleanupPhysics();
          }

          // Teleport to socket visual position in case it was saved in a glitched position
          torchObj.mesh.position.copy(this.mesh.position);
          torchObj.mesh.position.y += 0.5;
          torchObj.mesh.rotation.set(0, 0, 0);
          torchObj.mesh.updateMatrix();
          torchObj.mesh.updateMatrixWorld(true);

          // Re-register with interaction manager so it can be lit while in socket
          if (game.world && game.world.interaction) {
            game.world.interaction.registerInteractive(torchObj.mesh);
          }

          torchObj.onGrab = () => {
            delete (torchObj as any).onGrab;
            torchObj.onGrab();
            this.currentItem = null;
          };
          
          this.pendingItemId = null;
        }
 else {
          console.warn(`[TorchSocket] Could not find pending item ${this.pendingItemId} in puzzleObjects yet.`);
        }
      }
    }
  }
}
