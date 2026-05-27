import * as THREE from 'three';
import World from '../world/World';
import Player from '../player/Player';
import UIManager from './UIManager';
import StateManager from './StateManager';
import { ENV_CONFIG } from '../config/EnvironmentConfig';
import DebugManager from './DebugManager';
import { Interactable } from '../objects/Interactable';
import InteractionController from '../player/InteractionController';
import { IGameController } from '../interfaces/IGameController';
import { physicsSystem } from './PhysicsSystem';
import { assetLoader } from './AssetLoader';
import { audioManager } from './AudioManager';
import { createRenderer, RendererCapabilities } from './Renderer';

export default class GameEngine implements IGameController {
  renderer: THREE.WebGLRenderer;
  caps!: RendererCapabilities;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  world: World;
  player: Player;
  ui: UIManager;
  stateManager: StateManager;
  debugManager: DebugManager;

  private lastTime: number = 0;
  private _gameStarted: boolean = false;
  private gameTimeHours: number = ENV_CONFIG.time.startHour;
  private isTimePaused: boolean = false;
  public grabbables: any[] = [];
  public interactables: Interactable[] = [];
  // [AUTOSAVE_DISABLED] private _autoSaveTimer: number = 0;
  public interactionController!: InteractionController;

  constructor() {
    // Synchronous WebGL init — canvas must be in DOM before World/Player construct.
    // createRenderer() probes for WebGPU in init() and stores caps; WebGPU swap happens in phase 6.
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.localClippingEnabled = true;
    document.body.appendChild(this.renderer.domElement);
    this.renderer.domElement.id = 'game-canvas';

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 750);
    this.camera.layers.enable(1);
    this.camera.layers.enable(2);
    this.scene.add(this.camera);

    this.stateManager = new StateManager();
    this.world = new World(this.scene, this.camera, this.stateManager, this.renderer);
    this.player = new Player(this.scene, this.camera, this.renderer.domElement);
    this.ui = new UIManager(this.renderer, this);
    this.debugManager = new DebugManager(this);

    audioManager.init(this.camera);

    // ---- HUD & Objective Linking ----
    this.world.puzzleManager.onObjectiveUpdate = (text) => {
      this.ui.updateObjective(text);
      // [AUTOSAVE_DISABLED] auto-save on every puzzle stage advance
      // this.saveGame();
    };

    // ---- Auto-save + audio + lighting preset on island transition ----
    this.world.onTransition = () => {
      // [AUTOSAVE_DISABLED] auto-save on island transition
      // this.saveGame();
      const idx = this.stateManager.global.currentPlatformIndex;
      audioManager.setIslandAmbient(idx);
      this.world.applyIslandPreset(idx);
      this.world.shadows.setIslandTarget(idx);
    };

    // ---- Per-island GPU compile ----
    this.world.onCompileNeeded = (scene: THREE.Scene) => {
      console.log('[GameEngine] Re-compiling shaders for new island...');
      this.renderer.compile(scene, this.camera);
    };

    // ---- Auto-save on page unload ----
    // window.addEventListener('beforeunload', () => this.saveGame()); // Disabled per request

    // ---- UI Callbacks (Time & Moon) ----
    this.ui.onTimeChange = (h: number) => {
      this.gameTimeHours = h;
      this.world.lighting.setSunTime(h);
      this._updateLighting(0);
    };
    this.ui.onPauseToggle = (paused: boolean) => {
      this.isTimePaused = paused;
    };
    this.ui.onMoonPhaseChange = (phase: string) => {
      this.world.environment.setMoonPhase(phase);
    };
    this.ui.onTimeSpeedChange = (_speed: number) => {
      // Drift rate is now preset-controlled via LightingSystem.applyPreset
    };
    this.ui.onStarsChange = () => {
      this.world.environment.rebuildStars();
    };
    this.ui.onConfigChange = () => {
      // Re-apply lighting immediately so GUI sliders take effect without pointer lock
      const l = this.world.lighting;
      l.setSunTime(l.lastSunTime);
      const sl = l.sunLight;
      this.world.shadows.syncSun(sl.color, sl.intensity, sl.visible);
      this.world.shadows.updateSunDirection(l.getSunPosition());
    };

    const startBtn = document.getElementById('start-btn');
    if (startBtn) startBtn.addEventListener('click', () => this._handleStart());
    this.renderer.domElement.addEventListener('click', () => this._handleStart());

    const pauseOverlay = document.getElementById('pause-overlay');
    if (pauseOverlay) pauseOverlay.addEventListener('click', () => this.renderer.domElement.requestPointerLock());

    document.addEventListener('pointerlockchange', () => this._onPointerLockChange());

    // ---- Resize ----
    window.addEventListener('resize', () => this.onWindowResize());

    this.interactionController = new InteractionController(
      this.player,
      this.world.interaction,
      this.renderer.domElement,
      () => this.ui.toggleF3()
    );

    (window as any).gameEngine = this;
  }

  public async init(): Promise<void> {
    const setProgress = (pct: number, label: string) => {
      const bar = document.getElementById('progress-bar');
      const txt = document.getElementById('loading-text');
      if (bar) bar.style.width = `${pct}%`;
      if (txt) txt.innerText = label;
    };

    try {
      // ── Stage A: Boot (0–30%) ────────────────────────────────────────
      setProgress(2, 'Probing renderer capabilities...');
      const { caps } = await createRenderer();
      this.caps = caps;
      // Apply physically-correct renderer settings now that caps are known
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.2;
      console.log(`[GameEngine] Renderer caps: WebGPU=${caps.isWebGPU}, shadowQuality=${caps.shadowQuality}`);

      setProgress(5, 'Initializing physics...');
      await physicsSystem.init();

      setProgress(20, 'Building world...');
      // lighting / water / env already constructed — nothing async here

      setProgress(30, 'Queuing island assets...');
      await this.world.initAllIslands();

      // ── Stage B: Asset loading (30–95%) ─────────────────────────────
      assetLoader.onProgress = (loaded, total) => {
        const ratio = total > 0 ? loaded / total : 1;
        const pct = Math.round(30 + ratio * 65);
        setProgress(pct, `Loading assets (${loaded} / ${total})`);
      };

      try {
        await assetLoader.awaitAll(30_000);
        this.world.optimizeStaticMeshes();
      } catch (e) {
        console.error('[GameEngine] Asset load error / timeout:', e);
        this._showLoadError(String(e));
        return;
      }

      // ── Stage C: Finalize (95–100%) ──────────────────────────────────
      setProgress(95, 'Registering physics...');
      this.world.initPhysics();
      this.player.initPhysics();

      setProgress(96, 'Applying island lighting...');
      const startIsland = this.stateManager.global.currentPlatformIndex;
      this.world.shadows.init(this.world.lighting.sunLight);
      this.world.shadows.setIslandTarget(startIsland);
      this.world.applyIslandPreset(startIsland);
      const sl = this.world.lighting.sunLight;
      this.world.shadows.syncSun(sl.color, sl.intensity, sl.visible);
      this.world.shadows.registerSceneMaterials();

      setProgress(97, 'Restoring save...');
      this._restorePersistence();

      setProgress(99, 'Compiling shaders...');
      console.log('[GameEngine] Compiling WebGL shaders...');
      this.renderer.compile(this.world.scene, this.camera);

      setProgress(100, 'Ready');

      audioManager.setIslandAmbient(this.stateManager.global.currentPlatformIndex);

      const loadingScreen = document.getElementById('loading-screen');
      const instructions = document.getElementById('instructions');
      if (loadingScreen) loadingScreen.classList.add('hidden');
      if (instructions) instructions.style.display = 'flex';

    } catch (e) {
      console.error('[GameEngine] Fatal init error:', e);
      this._showLoadError(String(e));
    }
  }

  private _restorePersistence(): void {
    const savedPlayer = this.stateManager.playerState;
    if (!savedPlayer) return;
    this.player.loadState(savedPlayer);
    if (savedPlayer.heldItemId) {
      const items = [...this.grabbables, ...this.world.getPersistentObjects()];
      const target = items.find((i: any) => i?.persistentId === savedPlayer.heldItemId);
      if (target) {
        this.player.grab(target);
      } else {
        console.warn(`[GameEngine] Held item "${savedPlayer.heldItemId}" not found — clearing.`);
      }
    }
  }

  private _showLoadError(message: string): void {
    const errEl = document.getElementById('loading-error');
    const errMsg = document.getElementById('loading-error-message');
    if (errEl) errEl.style.display = 'block';
    if (errMsg) errMsg.innerText = message;
  }


  public saveGame(): void {
    if (this.stateManager.isResetting) {
      console.log('Skipping save: Game is resetting.');
      return;
    }
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

  private _handleStart(): void {
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

      // Sync shadow light to sun every frame — not gated on pointer lock so GUI tweaks show live
      const _l = this.world.lighting;
      this.world.shadows.updateSunDirection(_l.getSunPosition());
      this.world.shadows.syncSun(_l.sunLight.color, _l.sunLight.intensity, _l.sunLight.visible);
      this.world.shadows.update();

      if (this.world.portalSystem) {
        this.world.portalSystem.render(this.renderer, this.scene, this.camera, this.world.environment);
      }

      this.world.postFx.render();

      // Performance Stats & UI update
      this.ui.update(dt);
      this.animate();
    });
  }

  private _update(dt: number): void {
    if (!this.player.getIsLocked()) return; // Pause time and physics

    this.player.update(dt);

    this._updateLighting(dt);

    this.grabbables.forEach(g => g.update(dt));
    this.interactables.forEach(i => i.update(dt));

    this.world.update(dt, this.player, this.grabbables);
    this.debugManager.update(dt);
    this.ui.updateHUD(this.gameTimeHours);
    physicsSystem.update(dt);

    // [AUTOSAVE_DISABLED] periodic auto-save every 60s
    // this._autoSaveTimer += dt;
    // if (this._autoSaveTimer >= 60) {
    //   this._autoSaveTimer = 0;
    //   this.saveGame();
    // }
  }

  private _updateLighting(dt: number): void {
    const l = this.world.lighting;
    const e = this.world.environment;

    if (!this.isTimePaused) l.tickDrift(dt);
    this.gameTimeHours = l.lastSunTime;

    const nightFactor = l.getNightFactor();
    e.updateSky();
    e.updateMoon(l.getMoonDirection(), this.camera.position, nightFactor);
    this.world.water.updateForLighting(l.getSunPosition());
  }

  onWindowResize(): void {
    const w = window.innerWidth, h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.world.postFx.onResize(w, h);
  }

  private _onPointerLockChange(): void {
    const locked = !!document.pointerLockElement;
    const pauseOverlay = document.getElementById('pause-overlay');
    const instructions = document.getElementById('instructions');

    if (locked) {
      this._gameStarted = true;
      if (pauseOverlay) pauseOverlay.classList.remove('visible');
      if (instructions) instructions.style.display = 'none';

      const spawnFade = document.getElementById('spawn-fade');
      if (spawnFade) {
        spawnFade.classList.add('hidden');
      }

      this.player.startWakeUp();
    } else if (this._gameStarted) {
      if (pauseOverlay) pauseOverlay.classList.add('visible');
      if (instructions) instructions.style.display = 'none';
    } else {
      if (pauseOverlay) pauseOverlay.classList.remove('visible');
      if (instructions) instructions.style.display = 'flex';
    }
  }

  transitionToNextPlatform(): void {
    this.stateManager.moveToNextPlatform();
    this.world.transitionPlatform(this.stateManager.global.currentPlatformIndex);
  }
}