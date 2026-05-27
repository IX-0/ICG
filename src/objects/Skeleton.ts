import * as THREE from 'three';
import { Interactable } from './Interactable';
import { IPersistent } from '../interfaces/IPersistent';
import { IObjectState } from '../interfaces/IState';
import Player from '../player/Player';
import { IGrabbable } from '../interfaces/IGrabbable';
import { physicsSystem } from '../engine/PhysicsSystem';
import { assetLoader } from '../engine/AssetLoader';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

export default class Skeleton extends Interactable implements IPersistent {
  public persistentId: string = '';
  public objectType: string = 'skeleton';

  private hasCrown: boolean = true;
  private crownRef: THREE.Object3D | null = null;
  private skeletonMesh: THREE.Group | null = null;
  private ownedColliders: RAPIER.Collider[] = [];

  public onInteractTakeCrown?: () => void;

  constructor(hasCrown: boolean = true, persistentId: string = '') {
    super();
    this.hasCrown = hasCrown;
    this.persistentId = persistentId;
    this.mesh.userData = { interactable: true, instance: this };

    const task = assetLoader.fetchGltf('models/skeleton/remains.glb').then((gltf) => {
      this.skeletonMesh = SkeletonUtils.clone(gltf.scene);
      this.skeletonMesh.scale.setScalar(0.5);
      this.mesh.add(this.skeletonMesh);

      if (this.hasCrown) this._addCrown();

      // Auto-initialize static trimesh physics colliders once mesh is ready
      this.mesh.updateWorldMatrix(true, true);
      this.initPhysics();
    });
    assetLoader.trackInstance(task);
  }

  public saveState(): IObjectState {
    const state = this.savePose(this.objectType);
    state.metadata = { hasCrown: this.hasCrown };
    return state;
  }

  public loadState(state: IObjectState): void {
    this.loadPose(state);
    if (state.metadata) {
      this.hasCrown = !!state.metadata.hasCrown;
    }
  }

  private _addCrown(): void {
    if (!this.skeletonMesh) return;
    const task = assetLoader.fetchGltf('models/crown/crown.glb').then((gltf) => {
      if (!this.hasCrown) return;
      const model = SkeletonUtils.clone(gltf.scene);
      model.scale.set(0.01, 0.01, 0.01);
      model.position.set(4.9, 0.8, -2.2);
      model.traverse((child) => {
        (child as THREE.Mesh).userData.noPhysics = true;
      });
      this.skeletonMesh!.add(model);
      this.crownRef = model;
    });
    assetLoader.trackInstance(task);
  }

  public onInteract(_player: Player, _heldItem: IGrabbable | null): void {
    if (!this.hasCrown) return;
    this.hasCrown = false;
    if (this.crownRef) {
      this.skeletonMesh?.remove(this.crownRef);
      this.crownRef = null;
    }
    this.cleanupPhysics();
    this.onInteractTakeCrown?.();
  }

  public initPhysics(): void {
    if (!physicsSystem.world || !this.skeletonMesh) return;
    this._destroyColliders();

    this.skeletonMesh.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return;
      const collider = physicsSystem.addStaticTrimesh(child as THREE.Mesh);
      this.ownedColliders.push(collider);
    });
  }

  private _destroyColliders(): void {
    this.ownedColliders.forEach(c => physicsSystem.removeCollider(c));
    this.ownedColliders = [];
  }

  public override cleanupPhysics(): void {
    this._destroyColliders();
    super.cleanupPhysics();
  }

  public getHasCrown(): boolean { return this.hasCrown; }

  public forceNoCrown(): void {
    this.hasCrown = false;
    if (this.crownRef) {
      this.skeletonMesh?.remove(this.crownRef);
      this.crownRef = null;
    }
  }

  public update(_dt: number): void { }
}
