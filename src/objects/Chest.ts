import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { Interactable } from './Interactable';
import { IPersistent } from '../interfaces/IPersistent';
import { IGrabbable } from '../interfaces/IGrabbable';
import { IObjectState } from '../interfaces/IState';
import { physicsSystem } from '../engine/PhysicsSystem';
import Player from '../player/Player';

/** A track in a kinematic body registry entry. */
interface KinematicEntry {
  body: RAPIER.RigidBody;
  mesh: THREE.Mesh;
}

export default class Chest extends Interactable implements IPersistent {

  // ── IPersistent ────────────────────────────────────────────────────────────

  public persistentId: string = '';

  public saveState(): IObjectState {
    return {
      position: this.mesh.position.clone(),
      rotation: { x: this.mesh.rotation.x, y: this.mesh.rotation.y, z: this.mesh.rotation.z },
      metadata: { isOpen: this.isOpen, spawnedItem: this.spawnedItem }
    };
  }

  public loadState(state: IObjectState): void {
    this.mesh.position.set(state.position.x, state.position.y, state.position.z);
    this.mesh.rotation.set(state.rotation.x, state.rotation.y, state.rotation.z);
    if (state.metadata) {
      if (state.metadata.isOpen) this.setOpen(true, true);
      this.spawnedItem = !!state.metadata.spawnedItem;
    }
  }

  // ── Animation ─────────────────────────────────────────────────────────────

  private mixer: THREE.AnimationMixer | null = null;
  /**
   * One AnimationAction per clip in the GLB.
   * All actions are kept in sync (same timeScale, paused state) so a single
   * baked clip or multiple legacy NLA-track clips both work transparently.
   */
  private openActions: THREE.AnimationAction[] = [];

  // ── Physics ────────────────────────────────────────────────────────────────

  /** Colliders owned by this chest (static + kinematic). Tracked for cleanup. */
  private ownedColliders: RAPIER.Collider[] = [];
  /** Kinematic body + mesh pairs — pose is pushed to Rapier every frame. */
  private kinematicEntries: KinematicEntry[] = [];

  // ── Domain state ───────────────────────────────────────────────────────────

  private isOpen: boolean = false;
  private contents: unknown = null;
  private spawnedItem: boolean = false;

  /** Callback fired once when the chest reaches the fully-open position. */
  public onOpen?: (item: unknown) => void;

  // ── Construction ───────────────────────────────────────────────────────────

  constructor(contents: unknown = null, persistentId: string = '') {
    super();
    this.contents = contents;
    this.persistentId = persistentId;
    this.modelPath = 'models/chest/separated.glb';
    this.mesh.userData = { interactable: true, instance: this, type: 'chest' };
    this.loadModel();
  }

  // ── ModeledObject hook ─────────────────────────────────────────────────────

  /**
   * Called automatically by ModeledObject.loadModel() once the GLB is available.
   * Sets up scale, animation mixer, and physics.
   */
  protected override async onModelLoaded(model: THREE.Group): Promise<void> {
    model.scale.setScalar(60);
    // Flush transforms so bounding boxes and world positions are accurate
    // before we build physics colliders and animation tracks.
    this.mesh.updateWorldMatrix(true, true);

    this._setupAnimations();
    this.initPhysics();

    // Restore open state if this chest was previously loaded from saved state
    if (this.isOpen) this.setOpen(true, true);
  }

  // ── Animations ────────────────────────────────────────────────────────────

  private _setupAnimations(): void {
    if (!this.animations.length) {
      console.warn(`[Chest] No animation clips found in "${this.modelPath}".`);
      return;
    }

    // Root must be this.mesh (not just this.model) so that all nodes,
    // regardless of their nesting depth, are reachable by the mixer.
    this.mixer = new THREE.AnimationMixer(this.mesh);

    for (const clip of this.animations) {
      console.log(
        `[Chest] Clip "${clip.name}" ${clip.duration.toFixed(2)}s ` +
        `| ${clip.tracks.length} track(s): ${clip.tracks.map(t => t.name).join(', ')}`
      );
      const action = this.mixer.clipAction(clip);
      action.loop = THREE.LoopOnce;
      action.clampWhenFinished = true;
      action.play();
      action.paused = true;
      action.time = 0;
      this.openActions.push(action);
    }
  }

  // ── Physics ────────────────────────────────────────────────────────────────

  public override initPhysics(): void {
    if (!physicsSystem.world) return;
    this._destroyColliders();
    if (!this.model) return;

    // Determine which object names appear in animation tracks.
    // These meshes (and their children) need kinematic bodies.
    const animatedNames = this._collectAnimatedNames();

    this.model.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;

      if (this._isAnimated(mesh, animatedNames)) {
        const { body, collider } = physicsSystem.addKinematicTrimesh(mesh);
        this.kinematicEntries.push({ body, mesh });
        this.ownedColliders.push(collider);
      } else {
        const collider = physicsSystem.addStaticTrimesh(mesh);
        this.ownedColliders.push(collider);
      }
    });

    console.log(
      `[Chest] ${this.ownedColliders.length} collider(s), ` +
      `${this.kinematicEntries.length} kinematic.`
    );
  }

  /** Removes all owned colliders and kinematic bodies from the physics world. */
  public override cleanupPhysics(): void {
    this._destroyColliders();
    super.cleanupPhysics(); // removes this.rigidBody if set
  }

  private _destroyColliders(): void {
    for (const c of this.ownedColliders) physicsSystem.removeCollider(c);
    this.ownedColliders = [];
    for (const { body } of this.kinematicEntries) physicsSystem.removeBody(body);
    this.kinematicEntries = [];
  }

  /** Returns the set of animated node names derived from all clip tracks. */
  private _collectAnimatedNames(): Set<string> {
    const names = new Set<string>();
    for (const clip of this.animations) {
      for (const track of clip.tracks) {
        // Track names are formatted as "NodeName.property"
        names.add(track.name.split('.')[0].toLowerCase());
      }
    }
    return names;
  }

  /** Returns true if the object or any ancestor appears in the animated set. */
  private _isAnimated(obj: THREE.Object3D, animatedNames: Set<string>): boolean {
    let current: THREE.Object3D | null = obj;
    while (current) {
      if (animatedNames.has(current.name.toLowerCase())) return true;
      current = current.parent;
    }
    return false;
  }

  // ── Interaction ───────────────────────────────────────────────────────────

  /** Toggle: interact once to open, interact again to close. */
  public onInteract(_player: Player, _heldItem: IGrabbable | null): void {
    if (!this.openActions.length) return;
    this.isOpen ? this._playClose() : this._playOpen();
  }

  private _playOpen(): void {
    this.isOpen = true;
    for (const a of this.openActions) {
      if (a.time >= a.getClip().duration) a.time = 0;
      a.timeScale = 1;
      a.paused = false;
    }
    this._onFullyOpen();
  }

  private _playClose(): void {
    this.isOpen = false;
    for (const a of this.openActions) {
      if (a.time <= 0) a.time = a.getClip().duration;
      a.timeScale = -1;
      a.paused = false;
    }
  }

  // ── Update ────────────────────────────────────────────────────────────────

  public update(dt: number): void {
    this.mixer?.update(dt);
    // After the mixer moves objects, push updated poses to Rapier
    for (const { body, mesh } of this.kinematicEntries) {
      physicsSystem.updateKinematicBodyPose(body, mesh);
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Programmatically set the chest's open state.
   * @param open    Target state.
   * @param immediate Jump directly to the target frame without animating.
   */
  public setOpen(open: boolean, immediate: boolean = false): void {
    this.isOpen = open;

    if (immediate || !this.openActions.length) {
      for (const a of this.openActions) {
        a.time = open ? a.getClip().duration : 0;
        a.paused = true;
      }
      this.mixer?.update(0);
      if (open) this.spawnedItem = true;
    } else {
      open ? this._playOpen() : this._playClose();
    }
  }

  public getIsOpen(): boolean {
    return this.isOpen;
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private _onFullyOpen(): void {
    if (this.spawnedItem || !this.contents) return;
    this.spawnedItem = true;
    this.onOpen?.(this.contents);
  }
}
