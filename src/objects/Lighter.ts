import * as THREE from 'three';
import { Grabbable } from './Grabbable';
import { IPersistent } from '../interfaces/IPersistent';
import { IObjectState } from '../interfaces/IState';
import { physicsSystem } from '../engine/PhysicsSystem';

export default class Lighter extends Grabbable implements IPersistent {
  public persistentId: string = '';

  private isIgnited: boolean = false;
  private flame: THREE.Mesh | null = null;
  private flameTimer: number = 0;

  constructor(persistentId: string = '') {
    super();
    this.persistentId = persistentId;
    this.modelPath = 'models/ligther/constantine_lighter.glb';
    
    // Custom hold positioning for the model
    this.holdPosition.set(0.2, -0.3, -0.6);
    this.holdRotation.set(0, -Math.PI / 4, 0);
    this.placementYOffset = 0.2;

    this.mesh.userData = { grabbable: true, instance: this };
    this.loadModel();
  }

  protected async onModelLoaded(_model: THREE.Group): Promise<void> {
    // Model specific scaling if needed. Assuming 1:1 for now.
    // Ensure it's on Layer 0
    _model.traverse(c => { if ((c as THREE.Mesh).isMesh) c.layers.set(0); });
  }

  public saveState(): IObjectState {
    const worldPos = new THREE.Vector3();
    const worldQuat = new THREE.Quaternion();
    this.mesh.getWorldPosition(worldPos);
    this.mesh.getWorldQuaternion(worldQuat);
    const worldEuler = new THREE.Euler().setFromQuaternion(worldQuat);

    return {
      position: { x: worldPos.x, y: worldPos.y, z: worldPos.z },
      rotation: { x: worldEuler.x, y: worldEuler.y, z: worldEuler.z },
      metadata: { isIgnited: this.isIgnited },
      isHeld: this.isHeld
    };
  }

  public loadState(state: IObjectState): void {
    this.mesh.position.set(state.position.x, state.position.y, state.position.z);
    this.mesh.rotation.set(state.rotation.x, state.rotation.y, state.rotation.z);
    if (state.metadata && state.metadata.isIgnited !== undefined) {
      this.setIgnited(state.metadata.isIgnited);
    }
    this.isHeld = state.isHeld || false;
  }

  public initPhysics(): void {
    if (!physicsSystem.world) return;
    // Box shape matching the lighter model roughly
    const { body, collider } = physicsSystem.addDynamicPrimitive(this.mesh, { type: 'box', size: [0.04, 0.08, 0.02] });
    this.rigidBody = body;
    this.collider = collider;
  }

  public onDrop(throwVel: THREE.Vector3): void {
    super.onDrop(throwVel);
    this.setIgnited(false);
  }

  public onUse(target?: any): void {
    this.setIgnited(true);
    this.flameTimer = 0.5;
    
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
      if (this.flameTimer <= 0) {
        this.setIgnited(false);
      }
    }
  }
}
