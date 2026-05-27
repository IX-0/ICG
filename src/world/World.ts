import * as THREE from 'three';
import PlatformManager from './platforms/PlatformManager';
import PortalSystem from './portals/PortalSystem';
import EnvironmentManager from './lighting/EnvironmentManager';
import InteractionManager from './interaction/InteractionManager';
import LightingSystem from './lighting/LightingSystem';
import ShadowSystem from './lighting/ShadowSystem';
import PostProcessing from './lighting/PostProcessing';
import WaterSystem from './water/WaterSystem';
import StateManager from '../engine/StateManager';
import Player from '../player/Player';
import PuzzleManager from './puzzles/PuzzleManager';
import Crown from '../objects/Crown';
import Boat from '../objects/Boat';
import TriggerZone from './interaction/TriggerZone';
import { IslandContext } from './islands/IslandContext';
import { setupRiseIsland } from './islands/RiseIsland';
import { setupTragedyIsland } from './islands/TragedyIsland';
import { setupIsolationIsland } from './islands/IsolationIsland';
import { setupReturnIsland } from './islands/ReturnIsland';
import { WORLD_CONFIG } from '../config/WorldConfig';
import { ISLAND_PRESETS } from '../config/IslandLightingPresets';
import { RendererCapabilities } from '../engine/Renderer';
import PlacementUtility from '../utils/PlacementUtility';

/** Object types whose saved transform always overrides island-setup positions. */
const DYNAMIC_OBJECT_TYPES = new Set(['torch', 'bucket', 'lighter', 'hoe', 'crown']);

type IslandSetupFn = (ctx: IslandContext) => void;

interface IslandData {
  mesh: THREE.Object3D;
  config: any;
  objects: any[];
  offset: THREE.Vector3;
}export default class World {
  scene: THREE.Scene;
  camera: THREE.Camera;
  stateManager: StateManager;
  platformManager: PlatformManager;
  portalSystem: PortalSystem;
  environment: EnvironmentManager;
  interaction: InteractionManager;
  lighting: LightingSystem;
  shadows: ShadowSystem;
  postFx: PostProcessing;
  water: WaterSystem;
  public currentPlatform: any = null;
  puzzleManager: PuzzleManager;
  private activeZones: TriggerZone[] = [];
  private puzzleObjects: any[] = [];
  private islandActivations: Map<number, () => void> = new Map();
  private islandPuzzleObjects: Map<number, any[]> = new Map();
  private islandStaticMeshes: Map<number, THREE.Object3D[]> = new Map();
  private loadedIslands: Map<number, IslandData> = new Map();
  private loadedPersistentIds: Set<string> = new Set();
  private placementUtility?: PlacementUtility;

  private islandManifests: Record<number, IslandSetupFn> = {
    0: setupRiseIsland,
    1: setupTragedyIsland,
    2: setupIsolationIsland,
    3: setupReturnIsland
  };

  public onTransition?: () => void;
  public onCompileNeeded?: (scene: THREE.Scene) => void;

  constructor(scene: THREE.Scene, camera: THREE.Camera, stateManager: StateManager, renderer: THREE.WebGLRenderer, caps?: RendererCapabilities) {
    this.scene = scene;
    this.camera = camera;
    this.stateManager = stateManager;

    this.lighting = new LightingSystem(scene, renderer);
    this.lighting.setSunTime(14);

    this.water = new WaterSystem(scene);
    this.water.create(this.lighting.getSunPosition());

    this.environment = new EnvironmentManager(scene, camera);
    this.environment.setup(this.lighting);

    const defaultCaps: RendererCapabilities = { isWebGPU: false, supportsTSL: false, shadowQuality: 'medium' };
    const resolvedCaps = caps ?? defaultCaps;
    this.shadows = new ShadowSystem(renderer, scene, camera as THREE.PerspectiveCamera, resolvedCaps);
    this.postFx = new PostProcessing(renderer, scene, camera as THREE.PerspectiveCamera, resolvedCaps);

    this.platformManager = new PlatformManager(scene, stateManager);
    this.portalSystem = new PortalSystem(scene, camera);
    this.puzzleManager = new PuzzleManager();

    this.interaction = new InteractionManager(camera);
    this.placementUtility = new PlacementUtility(scene, camera);
  }

  public initIsland(i: number): IslandData | null {
    if (this.loadedIslands.has(i)) return this.loadedIslands.get(i)!;

    const setupFn = this.islandManifests[i];
    if (!setupFn) return null;

    const offset = new THREE.Vector3(i * WORLD_CONFIG.ISLAND_OFFSET, 0, 0);
    const platform = this.platformManager.createPlatform(i, offset);
    if (!platform) return null;

    const ctx = this._createContext(platform, offset);
    setupFn(ctx);

    const islandData: IslandData = {
      mesh: platform.mesh,
      config: platform.config,
      objects: platform.objects,
      offset: offset
    };
    this.loadedIslands.set(i, islandData);

    // After manual setup, reconstruct any extra dynamic objects from save state
    this._reconstructIslandObjects(i, offset);

    return islandData;
  }

  public async initAllIslands(): Promise<void> {
    console.log(`[World] Initializing all 4 islands at startup...`);

    // Eagerly load all 4 islands at startup
    for (let i = 0; i < 4; i++) {
      this.initIsland(i);
    }

    const startIndex = this.stateManager.global.currentPlatformIndex;
    this.currentPlatform = this.loadedIslands.get(startIndex);

    const startCb = this.islandActivations.get(startIndex);
    if (startCb) startCb();
  }

  /** @deprecated Use loadPlatform only for dev tooling. Not used in the main flow. */
  public loadPlatform(platformIndex: number, offset: THREE.Vector3 = new THREE.Vector3(0, 0, 0)) {
    this.platformManager.clearPlatforms();
    this.puzzleObjects.forEach(obj => {
      if (obj.cleanupPhysics) obj.cleanupPhysics();
      if (obj.mesh) {
        this.scene.remove(obj.mesh);
        this.interaction.unregisterInteractive(obj.mesh);
      }
    });

    const platform = this.platformManager.createPlatform(platformIndex, offset);
    this.currentPlatform = platform;
    this.activeZones = [];
    this.puzzleObjects = platform ? [...platform.objects] : [];

    if (platform) {
      const ctx = this._createContext(platform, offset);
      const setupFn = this.islandManifests[platformIndex];
      if (setupFn) {
        setupFn(ctx);
      }
    }

    return platform;
  }

  private _createContext(platform: any, offset: THREE.Vector3): IslandContext {
    const islandIndex: number = platform.config.index;
    if (!this.islandPuzzleObjects.has(islandIndex)) this.islandPuzzleObjects.set(islandIndex, []);
    if (!this.islandStaticMeshes.has(islandIndex)) this.islandStaticMeshes.set(islandIndex, []);

    const self = this;
    return {
      scene: this.scene,
      platform,
      offset,
      lighting: this.lighting,
      portalSystem: this.portalSystem,
      interaction: this.interaction,
      puzzleManager: this.puzzleManager,
      stateManager: this.stateManager,
      platformManager: this.platformManager,
      factory: this.platformManager.factory,
      get puzzleObjects() { return self.puzzleObjects; },
      get activeZones() { return self.activeZones; },
      addPuzzleObject: (obj: any) => {
        this.addPuzzleObject(obj);
        this.islandPuzzleObjects.get(islandIndex)!.push(obj);
      },
      removePuzzleObject: (obj: any) => {
        this.puzzleObjects = this.puzzleObjects.filter(o => o !== obj);
        const list = this.islandPuzzleObjects.get(islandIndex);
        if (list) this.islandPuzzleObjects.set(islandIndex, list.filter(o => o !== obj));
        if (obj.mesh) this.interaction.unregisterInteractive(obj.mesh);
      },
      addStaticMesh: (mesh: THREE.Object3D) => {
        this.scene.add(mesh);
        this.platformManager.activePlatforms.push(mesh);
        this.islandStaticMeshes.get(islandIndex)!.push(mesh);
      },
      loadObjectState: (obj: any, opts?: { restoreTransform?: boolean }) => this._loadObjectState(obj, islandIndex, opts),
      spawnCrown: (id: string, pos?: THREE.Vector3) => this._spawnCrown(id, pos),
      animateBoatArrival: (
        dockPos: THREE.Vector3,
        onArrived: () => void,
        onTick?: (pos: THREE.Vector3) => void
      ) => {
        return Boat.animateArrival(this.scene, dockPos, onArrived, onTick);
      },
      onTransition: (nextIndex: number, oldPlat: any, newPlat: any) => {
        const prevIndex: number = oldPlat.config.index;
        console.log(`[World] Transitioning from island ${prevIndex} to ${nextIndex}`);

        this.currentPlatform = newPlat;
        this.portalSystem.clearPortals();

        // Advance save state so GameEngine.onTransition reads the correct island index
        this.stateManager.moveToNextPlatform();



        const cb = this.islandActivations.get(nextIndex);
        if (cb) cb();
        this.onTransition?.();
        this.onCompileNeeded?.(this.scene);
      },
      registerActivation: (cb: () => void) => {
        this.islandActivations.set(islandIndex, cb);
      }
    };
  }

  private _unloadIsland(islandIndex: number): void {
    const puzzleObjs = this.islandPuzzleObjects.get(islandIndex) ?? [];
    const unloadedObjs: any[] = [];

    puzzleObjs.forEach(obj => {
      // Don't unload items the player is actively carrying through the portal!
      if (obj.isHeld) {
        console.log(`[World] Preserving held object ${obj.persistentId} during island unload.`);
        return;
      }

      if (obj.mesh) {
        this.scene.remove(obj.mesh);
        this.interaction.unregisterInteractive(obj.mesh);
      }
      if (obj.cleanupPhysics) obj.cleanupPhysics();
      if (typeof obj.dispose === 'function') obj.dispose();
      if (obj.persistentId) this.loadedPersistentIds.delete(obj.persistentId);
      unloadedObjs.push(obj);
    });

    // Only remove the ones we actually unloaded from the global pool
    this.puzzleObjects = this.puzzleObjects.filter(o => !unloadedObjs.includes(o));
    this.islandPuzzleObjects.set(islandIndex, puzzleObjs.filter(o => !unloadedObjs.includes(o)));

    const staticMeshes = this.islandStaticMeshes.get(islandIndex) ?? [];
    staticMeshes.forEach(mesh => {
      this.scene.remove(mesh);
      this.platformManager.removePlatform(mesh);
    });
    this.islandStaticMeshes.delete(islandIndex);

    console.log(`[World] Unloaded island ${islandIndex} (${puzzleObjs.length} puzzle objs, ${staticMeshes.length} static meshes)`);
  }

  /**
   * Restores an object's saved state (metadata) from the StateManager.
   *
   * By default the object's current position and rotation are **preserved**
   * — only gameplay metadata (isOpen, isLit, hasCrown, etc.) is restored.
   * This prevents island-setup positions from being overwritten by stale
   * absolute coordinates stored in a previous save.
   *
   * Pass `{ restoreTransform: true }` when the caller explicitly needs the
   * saved world-space position (e.g. a dropped Crown that must reappear
   * where the player left it).
   */
  private _loadObjectState(obj: any, islandIndex: number, opts?: { restoreTransform?: boolean }): boolean {
    if (obj.persistentId && obj.loadState) {
      this.loadedPersistentIds.add(obj.persistentId);

      const state = this.stateManager.getObjectState(obj.persistentId);
      if (state) {
        const isDynamicType = DYNAMIC_OBJECT_TYPES.has(obj.objectType);
        const shouldRestoreTransform = opts?.restoreTransform || state.islandIndex !== islandIndex || isDynamicType;

        if (shouldRestoreTransform) {
          obj.loadState(state);
        } else {
          const savedPos = obj.mesh.position.clone();
          const savedRot = { x: obj.mesh.rotation.x, y: obj.mesh.rotation.y, z: obj.mesh.rotation.z };
          obj.loadState(state);
          obj.mesh.position.copy(savedPos);
          obj.mesh.rotation.set(savedRot.x, savedRot.y, savedRot.z);
        }
        return true;
      }
    }
    return false;
  }

  private _reconstructIslandObjects(islandIndex: number, offset: THREE.Vector3): void {
    const allStates = this.stateManager.getAllObjectStates();

    for (const [id, state] of Object.entries(allStates)) {
      if (state.islandIndex === islandIndex && !this.loadedPersistentIds.has(id)) {
        console.log(`[World] Reconstructing dynamic object: ${id} (${state.type})`);

        // Use factory to spawn based on type
        let obj: any = null;
        const pos = new THREE.Vector3(state.position.x + offset.x, state.position.y, state.position.z);

        switch (state.type) {
          case 'torch': obj = this.platformManager.factory.createTikiTorch(pos, id); break;
          case 'crown': obj = this.platformManager.factory.createCrown(id); break;
          case 'bucket': obj = this.platformManager.factory.createWaterBucket(pos, id); break;
          case 'lighter': obj = this.platformManager.factory.createFlintAndSteel(pos, id); break;
          case 'hoe': obj = this.platformManager.factory.createGardeningHoe(pos, id); break;
          case 'chest': obj = this.platformManager.factory.createChest(pos, id); break;
          case 'skeleton': obj = this.platformManager.factory.createSkeleton(pos, false, true, id); break;
          case 'throne': obj = this.platformManager.factory.createThrone(pos, id); break;
          case 'socket': obj = this.platformManager.factory.createTorchSocket(pos, 0, id); break;
          case 'mirror': obj = this.platformManager.factory.createMirror(pos, id); break;
          case 'coffin': obj = this.platformManager.factory.createCoffin(pos, id); break;
          default:
            console.warn(`[World] Unknown object type "${state.type}" for reconstruction of ${id}`);
            continue;
        }

        if (obj) {
          this.loadedPersistentIds.add(id);
          this._loadObjectState(obj, islandIndex, { restoreTransform: true });
          this.scene.add(obj.mesh);
          this.addPuzzleObject(obj);
          this.islandPuzzleObjects.get(islandIndex)!.push(obj);
          if (obj.initPhysics) obj.initPhysics();
        }
      }
    }
  }

  public transitionPlatform(nextPlatformIndex: number): void {
    this.loadPlatform(nextPlatformIndex);
  }

  public initPhysics(): void {
    this.water.initPhysics();
    this.platformManager.initPhysics();
    this.portalSystem.initPhysics();
    this.puzzleObjects.forEach(obj => {
      if (obj.initPhysics) obj.initPhysics();
    });
  }

  public update(deltaTime: number, player: Player, grabbables: any[] = []): void {
    this.water.update(deltaTime);
    if (this.placementUtility && player) {
      this.placementUtility.update(player.position, this.currentPlatform?.mesh.position);
    }
    if (player) {
      const allGrabbables = [...grabbables, ...this.puzzleObjects.filter(o => o.isHeld !== undefined)];
      this.portalSystem.updateSystem(player, allGrabbables);
      this.puzzleManager.update(deltaTime);

      this.puzzleObjects.forEach(obj => { if (typeof obj.update === 'function') obj.update(deltaTime); });
      this.activeZones.forEach(z => {
        z.setTrackedObjects(allGrabbables.map(g => g.mesh));
        z.update(deltaTime);
      });
    }
  }



  public applyIslandPreset(islandIndex: number): void {
    const preset = ISLAND_PRESETS[0];
    if (!preset) return;
    const offset = new THREE.Vector3(islandIndex * WORLD_CONFIG.ISLAND_OFFSET, 0, 0);
    this.lighting.applyPreset(preset, offset);
    this.postFx.setEnabled(preset.postFx).catch((e) =>
      console.warn('[World] PostFx setEnabled failed:', e)
    );
  }

  public getCurrentPlatform() { return this.currentPlatform; }
  public getEnvironment() { return this.environment; }

  public getPersistentObjects(): any[] {
    const persistent: any[] = [];

    this.puzzleObjects.forEach(obj => {
      if (obj && typeof obj.saveState === 'function') {
        persistent.push(obj);
      }
    });

    this.platformManager.activePlatforms.forEach(mesh => {
      const instance = (mesh as any).userData?.instance;
      if (instance && typeof instance.saveState === 'function' && !persistent.includes(instance)) {
        persistent.push(instance);
      }
    });

    return persistent;
  }

  public addPuzzleObject(obj: any): void {
    if (!this.puzzleObjects.includes(obj)) {
      this.puzzleObjects.push(obj);
      if (obj.mesh) {
        this.interaction.registerInteractive(obj.mesh);
      }
    }
  }

  private _spawnCrown(id: string, position?: THREE.Vector3): Crown {
    console.log(`[World] Spawning Crown identified by: ${id}`);
    const crown = new Crown();
    crown.persistentId = id;
    const islandIndex = position ? Math.round(position.x / WORLD_CONFIG.ISLAND_OFFSET) : (this.currentPlatform?.config.index ?? 0);
    const loaded = this._loadObjectState(crown, islandIndex, { restoreTransform: true });
    console.log(`[World] Crown ${id} state loaded: ${loaded}`);

    if (!loaded) {
      if (position) {
        crown.mesh.position.copy(position);
        console.log(`[World] Crown ${id} set to requested position:`, position);
      } else {
        crown.mesh.position.set(5.2, 0.5, 5.2);
        console.log(`[World] Crown ${id} set to default position: [5.2, 0.5, 5.2]`);
      }
    } else {
      console.log(`[World] Crown ${id} restored to saved position:`, crown.mesh.position.clone());
    }

    this.scene.add(crown.mesh);
    this.puzzleObjects.push(crown);
    if (!this.islandPuzzleObjects.has(islandIndex)) {
      this.islandPuzzleObjects.set(islandIndex, []);
    }
    this.islandPuzzleObjects.get(islandIndex)!.push(crown);
    this.interaction.registerInteractive(crown.mesh);
    crown.initPhysics();
    return crown;
  }

  /**
   * Traverses all meshes in the scene and groups duplicate static scenery/platform meshes 
   * into highly optimized InstancedMeshes, reducing draw calls and traversal overhead dramatically.
   */
  public optimizeStaticMeshes(): void {
    console.log('[World] Starting automatic mesh instancing optimization...');
    const meshesToInstance: THREE.Mesh[] = [];

    this.scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (this._isStaticMesh(mesh)) {
          meshesToInstance.push(mesh);
        }
      }
    });

    console.log(`[World] Found ${meshesToInstance.length} static candidate meshes.`);

    const groups = new Map<string, {
      geometry: THREE.BufferGeometry;
      material: THREE.Material;
      meshes: { mesh: THREE.Mesh; worldMatrix: THREE.Matrix4 }[];
    }>();

    for (const mesh of meshesToInstance) {
      if (!mesh.geometry || !mesh.material) continue;

      mesh.updateWorldMatrix(true, false);
      const worldMatrix = mesh.matrixWorld.clone();

      const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
      const key = `${mesh.geometry.uuid}_${mat.uuid}`;

      if (!groups.has(key)) {
        groups.set(key, {
          geometry: mesh.geometry,
          material: mat,
          meshes: []
        });
      }
      groups.get(key)!.meshes.push({ mesh, worldMatrix });
    }

    let instancedCount = 0;
    let originalDrawCallsSaved = 0;

    for (const [key, group] of groups.entries()) {
      if (group.meshes.length <= 1) {
        continue;
      }

      const count = group.meshes.length;
      const instancedMesh = new THREE.InstancedMesh(group.geometry, group.material, count);
      instancedMesh.castShadow = true;
      instancedMesh.receiveShadow = true;

      for (let i = 0; i < count; i++) {
        instancedMesh.setMatrixAt(i, group.meshes[i].worldMatrix);
      }
      instancedMesh.instanceMatrix.needsUpdate = true;

      this.scene.add(instancedMesh);

      // Hide original meshes so they aren't rendered, keeping them in the graph for physics/logic
      for (const item of group.meshes) {
        item.mesh.visible = false;
      }

      instancedCount++;
      originalDrawCallsSaved += (count - 1);
    }

    console.log(`[World] Auto-instancing complete! Created ${instancedCount} InstancedMeshes, saving ~${originalDrawCallsSaved} draw calls!`);
  }

  private _isStaticMesh(mesh: THREE.Mesh): boolean {
    let parent: THREE.Object3D | null = mesh;
    while (parent) {
      if (parent.userData) {
        if (parent.userData.type === 'platform') return true;
        const inst = parent.userData.instance;
        if (inst) {
          const className = inst.constructor.name;
          if (
            className === 'PalmTree' ||
            className === 'Foliage' ||
            className === 'Rock' ||
            className === 'TorchSocket' ||
            className === 'Dock'
          ) {
            return true;
          }
        }
      }
      parent = parent.parent;
    }
    return false;
  }
}
