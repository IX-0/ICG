import * as THREE from 'three';
import { Grabbable } from './Grabbable';
import { IPersistent } from '../interfaces/IPersistent';
import { IObjectState } from '../interfaces/IState';
import { physicsSystem } from '../engine/PhysicsSystem';

export default class TikiTorch extends Grabbable implements IPersistent {
  public persistentId: string = '';

  private isLit: boolean = false;
  private modelFlameParts: THREE.Object3D[] = [];
  private light: THREE.PointLight | null = null;
  private mixer: THREE.AnimationMixer | null = null;
  private flameActions: THREE.AnimationAction[] = [];
  private isModelReady: boolean = false;

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
    // GameEngine._handleUse returns early after calling onInteract, so lighter.onUse(torch)
    // is never reached. We handle torch lighting here directly instead.
    if (heldItem && typeof heldItem.setIgnited === 'function') {
      // Held item is a lighter — light the torch and trigger the lighter's flame
      this.setLit(true);
      heldItem.setIgnited(true);
    }
  }

  protected override async onModelLoaded(model: THREE.Group): Promise<void> {
    model.scale.setScalar(1.0); // Reset or adjust scale if needed
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
      // Matches Flame0_0, Flame1_0, Flame2_0, Flame3_0, fire_animation nodes, etc.
      if (name.includes('fire') || name.includes('flame')) {
        child.visible = false;
        this.modelFlameParts.push(child);
      }
    });
    console.log(`[TikiTorch] Found ${this.modelFlameParts.length} flame part(s).`);

    this.initPhysics();
    this.isModelReady = true;
    
    // Sync the visual state with isLit
    this.setLit(this.isLit, true);
  }

  private savedLinvel: any = null;
  private savedAngvel: any = null;

  public saveState(): IObjectState {
    const worldPos = new THREE.Vector3();
    const worldQuat = new THREE.Quaternion();
    this.mesh.getWorldPosition(worldPos);
    this.mesh.getWorldQuaternion(worldQuat);
    const worldEuler = new THREE.Euler().setFromQuaternion(worldQuat);

    const state: IObjectState = {
      position: { x: worldPos.x, y: worldPos.y, z: worldPos.z },
      rotation: { x: worldEuler.x, y: worldEuler.y, z: worldEuler.z },
      metadata: { isLit: this.isLit },
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
    
    if (state.metadata && state.metadata.isLit !== undefined) {
      this.isLit = state.metadata.isLit;
      if (this.isModelReady) {
        this.setLit(this.isLit, true);
      }
    }

    if (state.linearVelocity) this.savedLinvel = state.linearVelocity;
    if (state.angularVelocity) this.savedAngvel = state.angularVelocity;
    this.isHeld = state.isHeld || false;
  }

  public initPhysics(): void {
    if (!physicsSystem.world) return;
    const { body, collider } = physicsSystem.addDynamicPrimitive(this.mesh, { type: 'cylinder', size: [1.0, 0.1] });
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
    } else {
      this._disableFlame();
      this.flameActions.forEach(a => a.stop());
    }
  }

  private _enableFlame(): void {
    // 1. Model parts
    this.modelFlameParts.forEach(p => p.visible = true);

    // 2. Light
    if (!this.light) {
      this.light = new THREE.PointLight(0xffaa00, 2.0, 12);
      this.light.position.set(0, 0.85, 0);
      this.mesh.add(this.light);
    }
    this.light.visible = true;
    this.light.intensity = 2.0;
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

