import * as THREE from 'three';
import World from '../world/World';
import Player from '../player/Player';
import UIManager from './UIManager';
import StateManager from './StateManager';
import { ENV_CONFIG } from '../config/EnvironmentConfig';
import DebugManager from './DebugManager';
import TikiTorch from '../objects/TikiTorch';
import Lighter from '../objects/Lighter';
import WaterBucket from '../objects/WaterBucket';
import Chest from '../objects/Chest';
import Skeleton from '../objects/Skeleton';
import Crown from '../objects/Crown';
import GardeningHoe from '../objects/GardeningHoe';
import { Interactable } from '../objects/Interactable';
import { IGameController } from '../interfaces/IGameController';
import { PORTAL_CONFIG } from '../config/PortalConfig';
import { physicsSystem } from './PhysicsSystem';

export default class GameEngine implements IGameController {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  world: World;
  player: Player;
  ui: UIManager;
  stateManager: StateManager;
  debugManager: DebugManager;

  private lastTime: number = 0;
  private gameTimeHours: number = ENV_CONFIG.time.startHour;
  private timeSpeed: number = ENV_CONFIG.time.speed;
  private isTimePaused: boolean = false;
  private grabbables: any[] = [];
  private interactables: Interactable[] = [];

  constructor() {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.5;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.localClippingEnabled = true;
    document.body.appendChild(this.renderer.domElement);
    this.renderer.domElement.id = 'game-canvas';

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
    this.camera.layers.enable(1);
    this.camera.layers.enable(2);
    this.scene.add(this.camera);

    this.stateManager = new StateManager();
    this.world = new World(this.scene, this.camera, this.stateManager);
    this.player = new Player(this.scene, this.camera, this.renderer.domElement);
    this.ui = new UIManager(this.renderer, this);
    this.debugManager = new DebugManager(this.scene, this.world.lighting);

    // ---- UI Callbacks (Time & Moon) ----
    this.ui.onTimeChange = (h: number) => {
      this.gameTimeHours = h;
      this._updateLighting();
    };
    this.ui.onPauseToggle = (paused: boolean) => {
      this.isTimePaused = paused;
    };
    this.ui.onMoonPhaseChange = (phase: string) => {
      this.world.environment.setMoonPhase(phase);
    };
    this.ui.onTimeSpeedChange = (speed: number) => {
      this.timeSpeed = speed;
    };
    this.ui.onStarsChange = () => {
      this.world.environment.rebuildStars();
    };

    const startBtn = document.getElementById('start-btn');
    if (startBtn) startBtn.addEventListener('click', () => this._handleStart());
    this.renderer.domElement.addEventListener('click', () => this._handleStart());

    // ---- Resize ----
    window.addEventListener('resize', () => this.onWindowResize());

    this._initInteractions();

    (window as any).gameEngine = this;
  }

  public async init(): Promise<void> {
    await physicsSystem.init();
    
    // After physics is initialized, let the world init any physics bodies it needs
    this.world.initPhysics();
    this.player.initPhysics();

    // ---- Load Persistence ----
    const savedPlayer = this.stateManager.playerState;
    if (savedPlayer) {
      console.log('Restoring player state...');
      this.player.loadState(savedPlayer);

      // Re-attach held item if any
      if (savedPlayer.heldItemId) {
        // Search in grabbables or interactables
        const items = [
          ...this.grabbables, 
          ...this.world.getPersistentObjects()
        ];
        const target = items.find((i: any) => i && (i as any).persistentId === savedPlayer.heldItemId);
        if (target) {
          console.log(`Re-grabbing item: ${savedPlayer.heldItemId}`);
          this.player.grab(target);
        }
      }
    }
  }

  public spawnPortalPair(): void {
    // One portal at a time - clear previous
    this.world.portalSystem.clearPortals();

    const p = this.player;
    // Get forward direction on the horizontal plane
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(p.camera.quaternion);
    forward.y = 0;
    forward.normalize();

    const posA = p.position.clone().add(forward.clone().multiplyScalar(4));
    const posB = p.position.clone().add(forward.clone().multiplyScalar(12));

    // Face each other on the player's axis
    const rotA = new THREE.Euler(0, p.camera.rotation.y + Math.PI, 0);
    const rotB = new THREE.Euler(0, p.camera.rotation.y, 0);

    // Sit on platform (assumed at Y=0.5)
    const portalY = PORTAL_CONFIG.height / 2 + 0.5;
    posA.y = portalY;
    posB.y = portalY;

    this.world.portalSystem.addPortalPair(
      posA, rotA, PORTAL_CONFIG.colorA,
      posB, rotB, PORTAL_CONFIG.colorB,
      PORTAL_CONFIG.width, PORTAL_CONFIG.height
    );
  }

  public saveGame(): void {
    console.log('Saving game progress...');
    
    // 1. Save all persistent objects on the current platform
    const persistentObjects = [
      ...this.grabbables,
      ...this.interactables,
      ...this.world.getPersistentObjects()
    ].filter(obj => obj && obj.persistentId && typeof obj.saveState === 'function');

    persistentObjects.forEach(obj => {
      this.stateManager.updateObjectState(obj.persistentId, obj.saveState());
    });

    // 2. Save player state and commit to storage
    const playerState = this.player.saveState();
    this.stateManager.saveToStorage(playerState);
  }

  public toggleDebug(item: string, visible: boolean): void {
    switch (item) {
      case 'axes': this.debugManager.setAxesVisible(visible); break;
      case 'grid': this.debugManager.setGridVisible(visible); break;
      case 'sunHelper': this.debugManager.setSunHelperVisible(visible); break;
      case 'moonHelper': this.debugManager.setMoonHelperVisible(visible); break;
      case 'shadowHelper': this.debugManager.setShadowHelperVisible(visible); break;
    }
  }

  private _initInteractions(): void {
    // Keep keyboard fallbacks just in case
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.code === 'KeyE') this._handleGrabDrop();
      if (e.code === 'KeyF') this._handleUse();
    });

    this.renderer.domElement.addEventListener('mousedown', (e: MouseEvent) => {
      if (!this.player.getIsLocked()) return;

      if (e.button === 0) { // Left click
        this._handleGrabDrop();
      } else if (e.button === 2) { // Right click
        this._handleUse();
      }
    });

    // Prevent default context menu on right click
    this.renderer.domElement.addEventListener('contextmenu', (e: MouseEvent) => {
      e.preventDefault();
    });
  }

  private _handleGrabDrop(): void {
    const player = this.player;
    if (player.heldItem) {
      const item = player.heldItem;
      player.drop();
      this.scene.add(item.mesh);
      this.world.interaction.registerInteractive(item.mesh);
      return;
    }

    const hit = this.world.interaction.raycastFromCamera();
    if (!hit) return;

    // Check for a grabbable first
    let grabObj: THREE.Object3D | null = hit.object;
    while (grabObj) {
      if (grabObj.userData?.grabbable && grabObj.userData.instance) {
        player.grab(grabObj.userData.instance);
        this.world.interaction.unregisterInteractive(grabObj);
        return;
      }
      grabObj = grabObj.parent;
    }

    // Fallback: non-grabbable interactable (e.g. Skeleton)
    const resolved = this.world.interaction.resolveInteractable(hit);
    if (resolved) resolved.instance.onInteract(player, player.heldItem);
  }

  private _handleUse(): void {
    const player = this.player;
    const hit = this.world.interaction.raycastFromCamera();

    // If looking at an interactable world object, interact with it
    if (hit) {
      const resolved = this.world.interaction.resolveInteractable(hit);
      if (resolved) {
        console.log(`Interacting with: ${resolved.object.userData.type ?? 'object'}`);
        resolved.instance.onInteract(player, player.heldItem);
        return;
      }
    }

    // Otherwise use the held item, passing the hit target for context-sensitive use
    if (player.heldItem) {
      const hitTarget = hit ? this.world.interaction.resolveInteractable(hit) : null;
      player.heldItem.onUse(hitTarget?.instance ?? null);
    }
  }


  public spawnObject(type: string): void {
    const persistentId = `dynamic_${type}_${Date.now()}`;

    if (type === 'chest') {
      const chest = new Chest(null, persistentId);
      
      // Check for saved state
      const savedState = this.stateManager.getObjectState(persistentId);
      if (savedState) {
        chest.loadState(savedState);
      } else {
        // Default spawn logic
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.player.camera.quaternion);
        forward.y = 0;
        if (forward.lengthSq() > 0) forward.normalize();
        else forward.set(0, 0, -1);

        const spawnPos = this.player.position.clone().add(forward.multiplyScalar(2));
        spawnPos.y = 0.5; // ground
        chest.mesh.position.copy(spawnPos);
        chest.mesh.lookAt(this.player.position.x, 0.5, this.player.position.z);
      }

      this.scene.add(chest.mesh);
      this.world.interaction.registerInteractive(chest.mesh);
      this.interactables.push(chest);
      chest.initPhysics();
      return;
    }

    else if (type === 'skeleton') {
      const skeleton = new Skeleton();
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.player.camera.quaternion);
      forward.y = 0; forward.normalize();
      const spawnPos = this.player.position.clone().add(forward.multiplyScalar(3));
      spawnPos.y = 0.1;
      skeleton.mesh.position.copy(spawnPos);
      skeleton.mesh.lookAt(this.player.position.x, 0.1, this.player.position.z);
      this.scene.add(skeleton.mesh);
      this.world.interaction.registerInteractive(skeleton.mesh);
      this.interactables.push(skeleton);
      skeleton.initPhysics();
      return;
    }

    let obj: any = null;
    if (type === 'torch') obj = new TikiTorch(persistentId);
    else if (type === 'lighter') obj = new Lighter(persistentId);
    else if (type === 'bucket') obj = new WaterBucket(persistentId);
    else if (type === 'crown') obj = new Crown();
    else if (type === 'hoe') obj = new GardeningHoe();
    if (!obj) return;

    // Check for saved state for these dynamic objects
    const savedState = this.stateManager.getObjectState(persistentId);
    if (savedState) {
      obj.loadState(savedState);
    } else {
      // Spawn 2 units in front of player
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.player.camera.quaternion);
      const spawnPos = this.player.camera.position.clone().add(forward.multiplyScalar(2));
      if (type === 'torch') spawnPos.y = 1.1; // Place at ground height
      obj.mesh.position.copy(spawnPos);
    }

    this.scene.add(obj.mesh);
    this.world.interaction.registerInteractive(obj.mesh);
    this.grabbables.push(obj);
    obj.initPhysics();
  }

  private _handleStart(): void {
    // HUD Stats
    const statsHud = document.getElementById('hud-stats');
    if (statsHud) statsHud.style.display = 'block';

    this.renderer.domElement.requestPointerLock();
  }

  start(): void {
    this.lastTime = performance.now();
    this.animate();
  }

  animate(): void {
    requestAnimationFrame((t) => {
      const dt = Math.min((t - this.lastTime) / 1000, 0.1);
      this.lastTime = t;
      this._update(dt);
      
      if (this.world.portalSystem) {
        this.world.portalSystem.render(this.renderer, this.scene, this.camera, this.world.environment);
      }
      
      this.renderer.render(this.scene, this.camera);

      // Performance Stats & UI update
      this.ui.update(dt);
      this.animate();
    });
  }

  private _update(dt: number): void {
    if (!this.player.getIsLocked()) return; // Pause time and physics

    this.player.update(dt);

    if (!this.isTimePaused) {
      this.gameTimeHours = (this.gameTimeHours + dt * this.timeSpeed) % 24;
    }
    this._updateLighting();

    this.grabbables.forEach(g => g.update(dt));
    this.interactables.forEach(i => i.update(dt));

    this.world.update(dt, this.player, this.grabbables);
    this.debugManager.update(dt);
    this.ui.updateHUD(this.gameTimeHours);
    physicsSystem.update(dt);
  }

  private _updateLighting(): void {
    const l = this.world.lighting;
    const e = this.world.environment;

    l.setSunTime(this.gameTimeHours);
    const nightFactor = l.getNightFactor();

    e.updateSky();
    const moonDir = l.getMoonDirection();
    e.updateMoon(moonDir, this.camera.position, nightFactor);

    this.world.water.updateForLighting(l.getSunPosition());
    this.renderer.toneMappingExposure = THREE.MathUtils.lerp(
      ENV_CONFIG.toneMapping.dayExposure,
      ENV_CONFIG.toneMapping.nightExposure,
      nightFactor
    );
  }

  onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  transitionToNextPlatform(): void {
    this.stateManager.moveToNextPlatform();
    this.world.transitionPlatform(this.stateManager.global.currentPlatformIndex);
  }

  public jumpToPlatform(index: number): void {
    console.log(`Jumping to platform ${index}...`);
    this.world.loadPlatform(index);
    // Reposition player slightly back from the center to avoid being stuck in props
    this.player.setPosition(0, 1.6, 8);
  }

  public spawnExtraTorch(): void {
    console.log("Spawning extra torch (simulating bringing it from Isolation)...");
    const torch = new TikiTorch(`prop_torch_isolation_extra`);
    // Spawn in front of player
    const forward = this.player.getDirection();
    const spawnPos = this.player.camera.position.clone().add(forward.multiplyScalar(2));
    spawnPos.y = 1.1; 
    torch.mesh.position.copy(spawnPos);
    
    this.scene.add(torch.mesh);
    this.world.addPuzzleObject(torch);
    torch.initPhysics();
  }
}

const PerspectiveCamera = THREE.PerspectiveCamera;
