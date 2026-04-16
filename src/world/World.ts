import * as THREE from 'three';
import PlatformManager from './PlatformManager';
import PortalSystem from './PortalSystem';
import EnvironmentManager from './EnvironmentManager';
import InteractionManager from './InteractionManager';
import LightingSystem from './LightingSystem';
import WaterSystem from './WaterSystem';
import StateManager from '../engine/StateManager';
import Player from '../player/Player';
import PuzzleManager from './PuzzleManager';
import Crown from '../objects/Crown';
import TriggerZone from './TriggerZone';
import { IslandContext } from './islands/IslandContext';
import { setupRiseIsland } from './islands/RiseIsland';
import { setupIsolationIsland } from './islands/IsolationIsland';
import { setupReturnIsland } from './islands/ReturnIsland';
import { setupTragedyIsland } from './islands/TragedyIsland';


export default class World {
  scene: THREE.Scene;
  camera: THREE.Camera;
  stateManager: StateManager;
  platformManager: PlatformManager;
  portalSystem: PortalSystem;
  environment: EnvironmentManager;
  interaction: InteractionManager;
  lighting: LightingSystem;
  water: WaterSystem;
  public currentPlatform: any = null;
  puzzleManager: PuzzleManager;
  private activeZones: TriggerZone[] = [];
  private puzzleObjects: any[] = [];
  private islandActivations: Map<number, () => void> = new Map();

  constructor(scene: THREE.Scene, camera: THREE.Camera, stateManager: StateManager) {
    this.scene = scene;
    this.camera = camera;
    this.stateManager = stateManager;

    this.lighting = new LightingSystem(scene);
    this.lighting.setSunTime(14); 

    this.water = new WaterSystem(scene);
    this.water.create(this.lighting.getSunPosition());

    this.environment = new EnvironmentManager(scene, camera);
    this.environment.setup(this.lighting);

    this.platformManager = new PlatformManager(scene, stateManager);
    this.portalSystem = new PortalSystem(scene, camera);
    this.puzzleManager = new PuzzleManager();
 
    this.interaction = new InteractionManager(camera);
  }

  public async initAllIslands() {
    console.log('[World] Initializing all 4 islands...');
    
    for (let i = 0; i < 4; i++) {
        const offset = new THREE.Vector3(i * 1000, 0, 0);
        const platform = this.platformManager.createPlatform(i, offset);
        if (platform) {
            if (i === 0) this.currentPlatform = platform;
            const ctx = this._createContext(platform, offset);
            
            if (i === 0) await setupRiseIsland(ctx);
            else if (i === 1) await setupIsolationIsland(ctx);
            else if (i === 2) await setupReturnIsland(ctx);
            else if (i === 3) await setupTragedyIsland(ctx);
            
            // Add objects to global tracking
            this.puzzleObjects.push(...platform.objects);
        }
    }
    
    // Boot up the logic exclusively for the starting island
    const startCb = this.islandActivations.get(0);
    if (startCb) startCb();
  }

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
      if (platformIndex === 0) setupRiseIsland(ctx);
      else if (platformIndex === 1) setupIsolationIsland(ctx);
      else if (platformIndex === 2) setupReturnIsland(ctx);
      else if (platformIndex === 3) setupTragedyIsland(ctx);
    }
    
    return platform;
  }
 
  private _createContext(platform: any, offset: THREE.Vector3): IslandContext {
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
      puzzleObjects: this.puzzleObjects,
      activeZones: this.activeZones,
      addPuzzleObject: (obj: any) => this.addPuzzleObject(obj),
      removePuzzleObject: (obj: any) => {
        this.puzzleObjects = this.puzzleObjects.filter(o => o !== obj);
        if (obj.mesh) this.interaction.unregisterInteractive(obj.mesh);
      },
      addStaticMesh: (mesh: THREE.Object3D) => {
        this.scene.add(mesh);
        this.platformManager.activePlatforms.push(mesh);
      },
      loadObjectState: (obj: any) => this._loadObjectState(obj),
      spawnCrown: (id: string, pos?: THREE.Vector3) => this._spawnCrown(id, pos),
      onTransition: (nextIndex: number, oldPlat: any, newPlat: any) => {
        // In the new architecture, we don't destroy. We just move the player and update context.
        console.log(`[World] Transitioning from island ${oldPlat.config.index} to ${nextIndex}`);
        
        // The portal system handles the physical teleportation if used via portals,
        // but if this is a script-triggered transition:
        const nextOffset = new THREE.Vector3(nextIndex * 1000, 0, 0);
        
        // We find the 'newPlat' which should already exist
        this.currentPlatform = newPlat;
        this.portalSystem.clearPortals();

        const cb = this.islandActivations.get(nextIndex);
        if (cb) cb();
      },
      registerActivation: (cb: () => void) => {
        this.islandActivations.set(platform.config.index, cb);
      }
    };
  }

  private _loadObjectState(obj: any): boolean {
    if (obj.persistentId && obj.loadState) {
      const state = this.stateManager.getObjectState(obj.persistentId);
      if (state) {
        obj.loadState(state);
        return true;
      }
    }
    return false;
  }

  public transitionPlatform(nextPlatformIndex: number): void {
    this.loadPlatform(nextPlatformIndex);
  }

  public initPhysics(): void {
    this.platformManager.initPhysics();
    this.portalSystem.initPhysics();
    this.puzzleObjects.forEach(obj => {
       if (obj.initPhysics) obj.initPhysics();
    });
  }

  public update(deltaTime: number, player: Player, grabbables: any[] = []): void {
    this.water.update(deltaTime);
    if (player) {
      const allGrabbables = [...grabbables, ...this.puzzleObjects.filter(o => o.isHeld !== undefined)];
      this.portalSystem.updateSystem(player, allGrabbables);
      this.puzzleManager.update(deltaTime);
      
      this.puzzleObjects.forEach(obj => obj.update(deltaTime));
      this.activeZones.forEach(z => {
        z.setTrackedObjects(allGrabbables.map(g => g.mesh));
        z.update(deltaTime);
      });
    }
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
    const loaded = this._loadObjectState(crown);
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
    this.interaction.registerInteractive(crown.mesh);
    crown.initPhysics();
    return crown;
  }
}
