import * as THREE from 'three';
import { Grabbable } from './Grabbable';
import { IPersistent } from '../interfaces/IPersistent';
import { IObjectState } from '../interfaces/IState';
import { physicsSystem } from '../engine/PhysicsSystem';

export default class GardeningHoe extends Grabbable implements IPersistent {
  public persistentId: string = '';
  public objectType: string = 'hoe';

  constructor(persistentId: string = '') {
    super();
    this.persistentId = persistentId;
    this.modelPath = 'models/farming_hoe/farming_hoe.glb';

    this.holdPosition.set(0.4, -0.4, -1.0);
    this.holdRotation.set(-Math.PI / 4, 0, 0);
    this.placementYOffset = 0.5;

    this.mesh.userData = { grabbable: true, instance: this };
    this.loadModel();
  }

  protected async onModelLoaded(_model: THREE.Group): Promise<void> {
    _model.scale.setScalar(0.01);
    _model.traverse(c => { if ((c as THREE.Mesh).isMesh) c.layers.set(0); });
  }

  public saveState(): IObjectState {
    return this.saveGrabbableState(this.objectType);
  }

  public loadState(state: IObjectState): void {
    this.loadGrabbableState(state);
  }

  public initPhysics(): void {
    if (!physicsSystem.world) return;
    const { body, collider } = physicsSystem.addDynamicPrimitive(this.mesh, { type: 'box', size: [0.1, 0.6, 0.1] });
    this.rigidBody = body;
    this.collider = collider;
    this.applySavedVelocities();
  }

  public onUse(_target?: any): void {
    // Digging handled by World search for X-spot
  }
}
