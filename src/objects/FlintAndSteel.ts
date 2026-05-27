import * as THREE from 'three';
import { Grabbable } from './Grabbable';
import { IPersistent } from '../interfaces/IPersistent';
import { IObjectState } from '../interfaces/IState';
import { physicsSystem } from '../engine/PhysicsSystem';

export default class FlintAndSteel extends Grabbable implements IPersistent {
  public persistentId: string = '';
  public objectType: string = 'lighter';

  private isIgnited: boolean = false;
  private flame: THREE.Mesh | null = null;
  private flameTimer: number = 0;
  private _igniteLight: THREE.PointLight | null = null;
  private _igniteLightTimer: number = 0;

  constructor(persistentId: string = '') {
    super();
    this.persistentId = persistentId;
    this.modelPath = 'models/lighter/constantine_lighter.glb';
    
    // Custom hold positioning for the model
    this.holdPosition.set(0.2, -0.3, -0.6);
    this.holdRotation.set(0, -Math.PI / 4, 0);
    this.placementYOffset = 0.2;

    this.mesh.userData = { grabbable: true, instance: this };
    this.loadModel();
  }

  protected async onModelLoaded(_model: THREE.Group): Promise<void> {
    _model.scale.setScalar(0.01);
    _model.traverse(c => { if ((c as THREE.Mesh).isMesh) c.layers.set(0); });
  }

  public saveState(): IObjectState {
    const state = this.saveGrabbableState(this.objectType);
    state.metadata = { isIgnited: this.isIgnited };
    return state;
  }

  public loadState(state: IObjectState): void {
    this.loadGrabbableState(state);
    if (state.metadata && state.metadata.isIgnited !== undefined) {
      this.setIgnited(state.metadata.isIgnited);
    }
  }

  public initPhysics(): void {
    if (!physicsSystem.world) return;
    const { body, collider } = physicsSystem.addDynamicPrimitive(this.mesh, { type: 'box', size: [0.04, 0.08, 0.02] });
    this.rigidBody = body;
    this.collider = collider;
    this.applySavedVelocities();
  }

  public onDrop(throwVel: THREE.Vector3): void {
    super.onDrop(throwVel);
    this.setIgnited(false);
  }

  public onUse(target?: any): void {
    this.setIgnited(true);
    this.flameTimer = 0.5;

    // Brief spark flash — creates or resets a point light pulse
    if (!this._igniteLight) {
      this._igniteLight = new THREE.PointLight(0xffcc44, 0, 6);
      this._igniteLight.position.set(0, 0.08, 0);
      this.mesh.add(this._igniteLight);
    }
    this._igniteLight.intensity = 6;
    this._igniteLightTimer = 0.25;

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
    const flameGeo = new THREE.SphereGeometry(0.02, 6, 6);
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
    this.flame = new THREE.Mesh(flameGeo, flameMat);
    // Position flame at the top of the lighter model
    this.flame.position.y = 0.08; 
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
      if (this.flameTimer <= 0) this.setIgnited(false);
    }

    if (this._igniteLightTimer > 0 && this._igniteLight) {
      this._igniteLightTimer -= dt;
      this._igniteLight.intensity = Math.max(0, (this._igniteLightTimer / 0.25) * 6);
    }
  }
}
