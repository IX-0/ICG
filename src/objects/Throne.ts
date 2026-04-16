import * as THREE from 'three';
import { Interactable } from './Interactable';
import { IPersistent } from '../interfaces/IPersistent';
import { IObjectState } from '../interfaces/IState';
import Player from '../player/Player';
import { IGrabbable } from '../interfaces/IGrabbable';
import Crown from './Crown';
import { physicsSystem } from '../engine/PhysicsSystem';

export default class Throne extends Interactable implements IPersistent {

  // ── IPersistent ─────────────────────────────────────────────────────────────

  public persistentId: string = '';

  // ── Domain state ────────────────────────────────────────────────────────────

  private hasCrown: boolean = false;

  /** Fired once when a Crown is successfully placed. */
  public onCrownPlaced?: () => void;

  // ── Owned physics colliders ─────────────────────────────────────────────────

  private ownedColliders: import('@dimforge/rapier3d-compat').Collider[] = [];

  // ── Construction ────────────────────────────────────────────────────────────

  constructor(persistentId: string = '') {
    super();
    this.persistentId = persistentId;
    this.modelPath = 'models/wooden_throne/wooden_throne.glb';

    // Tag the root group so InteractionManager can walk up to find this instance.
    this.mesh.userData = { interactable: true, instance: this };

    this.loadModel();
  }

  // ── ModeledObject hook ──────────────────────────────────────────────────────

  protected override async onModelLoaded(model: THREE.Group): Promise<void> {
    // The GLB is very large (32 MB) and has embedded textures —
    // no manual texture override needed.

    // Calculate bounding box before any transforms to find the natural origin offset
    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    box.getSize(size);

    // Normalize scale: fit it to roughly 2m tall
    const targetHeight = 2.0;
    const uniformScale = targetHeight / size.y;
    model.scale.setScalar(uniformScale);

    // The origin of this model is in the middle, not at the feet.
    // Offset the model position so the base of the bounding box sits at y=0.
    // We use total scale and the min Y from the bounding box.
    model.position.y = -box.min.y * uniformScale;

    // Enable shadows on every mesh in the model.
    model.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    // Flush all transforms for accurate physics trimesh generation.
    this.mesh.updateWorldMatrix(true, true);

    this.initPhysics();
  }

  // ── Physics ─────────────────────────────────────────────────────────────────

  /**
   * Registers static trimesh colliders for all meshes in the loaded model.
   */
  public initPhysics(): void {
    if (!physicsSystem.world || !this.model) return;
    this._destroyColliders();

    this.model.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return;
      const collider = physicsSystem.addStaticTrimesh(child as THREE.Mesh);
      this.ownedColliders.push(collider);
    });

    console.log(`[Throne] ${this.ownedColliders.length} static collider(s) registered.`);
  }

  public override cleanupPhysics(): void {
    this._destroyColliders();
    super.cleanupPhysics();
  }

  private _destroyColliders(): void {
    for (const c of this.ownedColliders) physicsSystem.removeCollider(c);
    this.ownedColliders = [];
  }

  // ── IPersistent ─────────────────────────────────────────────────────────────
  
  public saveState(): IObjectState {
    return {
      position: { x: this.mesh.position.x, y: this.mesh.position.y, z: this.mesh.position.z },
      rotation: { x: this.mesh.rotation.x, y: this.mesh.rotation.y, z: this.mesh.rotation.z },
      metadata: { hasCrown: this.hasCrown }
    };
  }

  public loadState(state: IObjectState): void {
    this.mesh.position.set(state.position.x, state.position.y, state.position.z);
    this.mesh.rotation.set(state.rotation.x, state.rotation.y, state.rotation.z);
    if (state.metadata) {
      this.hasCrown = !!state.metadata.hasCrown;
      this._refreshCrownVisual();
    }
  }

  // ── Interaction ─────────────────────────────────────────────────────────────

  public onInteract(player: Player, heldItem: IGrabbable | null): void {
    const isCrown =
      heldItem &&
      (heldItem instanceof Crown ||
        (heldItem as any).mesh?.userData?.type === 'crown');

    if (isCrown && !this.hasCrown) {
      console.log('[Throne] Crown placed on the throne!');
      if (player.heldItem === heldItem) {
        player.drop();
      }
      this.hasCrown = true;
      this._refreshCrownVisual();
      this.onCrownPlaced?.();
    } else {
      console.log('[Throne] Interacted — need the Crown.');
    }
  }

  private crownVisual: THREE.Mesh | null = null;
  private _refreshCrownVisual(): void {
    if (this.hasCrown) {
      if (!this.crownVisual) {
        // Reuse the procedural crown geometry from Crown or create one specifically for the scene
        const crownGeo = new THREE.TorusGeometry(0.2, 0.04, 8, 24);
        const goldMat = new THREE.MeshStandardMaterial({ 
          color: 0xffd700, metalness: 0.9, roughness: 0.1, emissive: 0x443300, emissiveIntensity: 0.2
        });
        this.crownVisual = new THREE.Mesh(crownGeo, goldMat);
        
        // Position it on the seat
        this.crownVisual.rotation.x = Math.PI / 2;
        this.crownVisual.position.set(0, 0.82, 0.1); 
        this.mesh.add(this.crownVisual);
      }
    } else if (this.crownVisual) {
      this.mesh.remove(this.crownVisual);
      this.crownVisual = null;
    }
  }

  // ── Public API ───────────────────────────────────────────────────────────────

  public getHasCrown(): boolean {
    return this.hasCrown;
  }

  public update(_dt: number): void {
    // Static
  }
}
