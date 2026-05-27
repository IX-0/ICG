import * as THREE from 'three';
import { Grabbable } from './Grabbable';
import { IPersistent } from '../interfaces/IPersistent';
import { IObjectState } from '../interfaces/IState';
import { physicsSystem } from '../engine/PhysicsSystem';
import { audioManager } from '../engine/AudioManager';

export default class TikiTorch extends Grabbable implements IPersistent {
  public persistentId: string = '';

  private isLit: boolean = false;
  private modelFlameParts: THREE.Object3D[] = [];
  private light: THREE.PointLight | null = null;
  private mixer: THREE.AnimationMixer | null = null;
  private flameActions: THREE.AnimationAction[] = [];
  private isModelReady: boolean = false;
  public inSocket: boolean = false;

  constructor(persistentId: string = '') {
    super();
    this.persistentId = persistentId;
    this.modelPath = 'models/tiki_torch/tiki_torch.glb';
    
    // Custom hold positioning for the new model
    this.holdPosition.set(0.6, -0.8, -1.5);
    this.holdRotation.set(0.3, -0.1, 0); 
    this.placementYOffset = 1.15;

    this.mesh.userData = { grabbable: true, interactable: true, instance: this };
    this.loadModel();
  }

  /** 
   * Required for InteractionManager to find this instance when looked at.
   * Torches do not have a direct hand-interaction (like opening) but can be 
   * targeting targets for items (like Lighter). 
   */
  public onInteract(_player: any, heldItem: any): void {
    // 1. If held item is a lighter, light the torch and ignite the lighter
    if (heldItem && typeof heldItem.setIgnited === 'function') {
      this.setLit(true);
      heldItem.setIgnited(true);
      return;
    }
    
    // 2. If clicked directly (interacting) when not held (in socket or on ground)
    if (!this.isHeld) {
      this.setLit(true);
    }
  }

  protected override async onModelLoaded(model: THREE.Group): Promise<void> {
    model.scale.setScalar(1.0); // Reset or adjust scale if needed
    model.traverse(c => { if ((c as THREE.Mesh).isMesh) { c.castShadow = true; c.receiveShadow = true; } });
    this.mesh.updateWorldMatrix(true, true);

    if (this.animations.length > 0) {
      // Root must be this.model so the mixer can resolve named nodes
      // (Flame0_0 etc. are children of model, not the top-level mesh group)
      this.mixer = new THREE.AnimationMixer(this.model!);
      for (const clip of this.animations) {
        const action = this.mixer.clipAction(clip);
        action.loop = THREE.LoopRepeat;
        this.flameActions.push(action);
      }
    }

    // Reset before traversal in case model reloads
    this.modelFlameParts = [];
    model.traverse((child) => {
      const name = child.name.toLowerCase();
      if (name.includes('fire') || name.includes('flame')) {
        child.visible = false;
        this.modelFlameParts.push(child);
        // Restore emissive on flame meshes (base class zeroes all GLB emissive)
        if ((child as THREE.Mesh).isMesh) {
          const mats = Array.isArray((child as THREE.Mesh).material)
            ? (child as THREE.Mesh).material as THREE.MeshStandardMaterial[]
            : [(child as THREE.Mesh).material as THREE.MeshStandardMaterial];
          mats.forEach((m) => { if ('emissiveIntensity' in m) m.emissiveIntensity = 1; });
        }
      }
    });

    if (!this.inSocket) {
      this.initPhysics();
    }
    this.isModelReady = true;
    
    // Sync the visual state with isLit
    this.setLit(this.isLit, true);
  }

  public objectType: string = 'torch';

  public saveState(): IObjectState {
    const state = this.saveGrabbableState(this.objectType);
    state.metadata = { isLit: this.isLit, inSocket: this.inSocket };
    return state;
  }

  public loadState(state: IObjectState): void {
    this.loadGrabbableState(state);
    if (state.metadata) {
      if (state.metadata.isLit !== undefined) {
        this.isLit = state.metadata.isLit;
        if (this.isModelReady) this.setLit(this.isLit, true);
      }
      if (state.metadata.inSocket !== undefined) {
        this.inSocket = state.metadata.inSocket;
      }
    }
  }

  public initPhysics(): void {
    if (!physicsSystem.world || this.inSocket) return;
    const { body, collider } = physicsSystem.addDynamicPrimitive(this.mesh, { type: 'cylinder', size: [1.0, 0.1] });
    this.rigidBody = body;
    this.collider = collider;
    this.applySavedVelocities();
  }

  public onGrab(): void {
    this.inSocket = false;
    super.onGrab();
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

  public onUse(_target?: any): void {
    // Torch lighting is now handled exclusively by external sources (like a Lighter)
  }

  public getIsLit(): boolean {
    return this.isLit;
  }

  public toggleLit(): void {
    this.setLit(!this.isLit);
  }

  /**
   * Sets the torch's lit state.
   */
  public setLit(lit: boolean, force: boolean = false): void {
    if (this.isLit === lit && !force) return;
    this.isLit = lit;

    if (this.isLit) {
      this._enableFlame();
      this.flameActions.forEach(a => { a.reset(); a.play(); });
      audioManager.play('fire-crackle');
    } else {
      this._disableFlame();
      this.flameActions.forEach(a => a.stop());
    }
  }

  private _enableFlame(): void {
    this.modelFlameParts.forEach(p => p.visible = true);

    if (!this.light) {
      this.light = new THREE.PointLight(0xffaa00, 4.0, 12);
      this.light.position.set(0, 0.85, 0);
      // Request a shadow slot; if none available the light still contributes colour
      const lighting = (window as any).gameEngine?.world?.lighting;
      if (lighting?.requestShadowSlot(this)) {
        this.light.castShadow = true;
        this.light.shadow.mapSize.set(512, 512);
        this.light.shadow.camera.near = 0.1;
        this.light.shadow.camera.far = 12;
        this.light.shadow.bias = -0.005;
        this.light.shadow.normalBias = 0.02;
      }
      this.mesh.add(this.light);
    }
    this.light.visible = true;
    this.light.intensity = 4.0;
  }

  private _disableFlame(): void {
    // 1. Model parts
    this.modelFlameParts.forEach(p => p.visible = false);

    // 2. Light
    if (this.light) {
      this.light.visible = false;
      this.light.intensity = 0;
    }
  }

  public update(dt: number): void {
    super.update(dt);
    this.mixer?.update(dt);

    if (this.isLit) {
      const time = Date.now() * 0.001;
      
      // Animate light intensity flicker
      if (this.light && this.light.visible) {
        const lightFlicker = Math.sin(time * 25) * 0.2 + Math.sin(time * 40) * 0.1;
        this.light.intensity = 2.0 + lightFlicker;
      }
    }
  }
}

