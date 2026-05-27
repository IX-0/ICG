import * as THREE from 'three';
import LightingSystem from '../world/lighting/LightingSystem';
import { IUpdatable } from '../interfaces/IUpdatable';
import { IGameController } from '../interfaces/IGameController';
import { PORTAL_CONFIG } from '../config/PortalConfig';
import Chest from '../objects/Chest';
import Skeleton from '../objects/Skeleton';
import TikiTorch from '../objects/TikiTorch';
import FlintAndSteel from '../objects/FlintAndSteel';
import WaterBucket from '../objects/WaterBucket';
import Crown from '../objects/Crown';
import GardeningHoe from '../objects/GardeningHoe';

export default class DebugManager implements IUpdatable {
  private engine: IGameController;

  private axesHelper: THREE.AxesHelper | null = null;
  private gridHelper: THREE.GridHelper | null = null;
  private sunHelper: THREE.DirectionalLightHelper | null = null;
  private moonHelper: THREE.DirectionalLightHelper | null = null;
  private shadowHelper: THREE.CameraHelper | null = null;

  constructor(engine: IGameController) {
    this.engine = engine;
  }

  public setAxesVisible(visible: boolean): void {
    if (visible && !this.axesHelper) {
      this.axesHelper = new THREE.AxesHelper(100);
      this.engine.scene.add(this.axesHelper);
    } else if (!visible && this.axesHelper) {
      this.engine.scene.remove(this.axesHelper);
      this.axesHelper.dispose();
      this.axesHelper = null;
    }
  }

  public setGridVisible(visible: boolean): void {
    if (visible && !this.gridHelper) {
      this.gridHelper = new THREE.GridHelper(500, 50, 0x444444, 0x222222);
      this.gridHelper.position.y = 0.01; // Slightly above ground
      this.engine.scene.add(this.gridHelper);
    } else if (!visible && this.gridHelper) {
      this.engine.scene.remove(this.gridHelper);
      this.gridHelper.geometry.dispose();
      if (Array.isArray(this.gridHelper.material)) {
        this.gridHelper.material.forEach((m) => m.dispose());
      } else {
        this.gridHelper.material.dispose();
      }
      this.gridHelper = null;
    }
  }

  public setSunHelperVisible(visible: boolean): void {
    if (visible && !this.sunHelper) {
      this.sunHelper = new THREE.DirectionalLightHelper(this.engine.world.lighting.getSunLight(), 20);
      this.engine.scene.add(this.sunHelper);
    } else if (!visible && this.sunHelper) {
      this.engine.scene.remove(this.sunHelper);
      this.sunHelper.dispose();
      this.sunHelper = null;
    }
  }

  public setMoonHelperVisible(visible: boolean): void {
    if (visible && !this.moonHelper) {
      this.moonHelper = new THREE.DirectionalLightHelper(this.engine.world.lighting.getMoonLight(), 20, 0x0000ff);
      this.engine.scene.add(this.moonHelper);
    } else if (!visible && this.moonHelper) {
      this.engine.scene.remove(this.moonHelper);
      this.moonHelper.dispose();
      this.moonHelper = null;
    }
  }

  public setShadowHelperVisible(visible: boolean): void {
    if (visible && !this.shadowHelper) {
      this.shadowHelper = new THREE.CameraHelper(this.engine.world.lighting.getSunLight().shadow.camera);
      this.engine.scene.add(this.shadowHelper);
    } else if (!visible && this.shadowHelper) {
      this.engine.scene.remove(this.shadowHelper);
      this.shadowHelper.dispose();
      this.shadowHelper = null;
    }
  }

  public update(_dt: number): void {
    if (this.sunHelper) this.sunHelper.update();
    if (this.moonHelper) this.moonHelper.update();
    if (this.shadowHelper) this.shadowHelper.update();
  }

  public toggleDebug(item: string, visible: boolean): void {
    switch (item) {
      case 'axes': this.setAxesVisible(visible); break;
      case 'grid': this.setGridVisible(visible); break;
      case 'sunHelper': this.setSunHelperVisible(visible); break;
      case 'moonHelper': this.setMoonHelperVisible(visible); break;
      case 'shadowHelper': this.setShadowHelperVisible(visible); break;
    }
  }

  public spawnPortalPair(): void {
    this.engine.world.portalSystem.clearPortals();

    const p = this.engine.player;
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(p.camera.quaternion);
    forward.y = 0;
    forward.normalize();

    const posA = p.position.clone().add(forward.clone().multiplyScalar(4));
    const posB = p.position.clone().add(forward.clone().multiplyScalar(12));

    const rotA = new THREE.Euler(0, p.camera.rotation.y + Math.PI, 0);
    const rotB = new THREE.Euler(0, p.camera.rotation.y, 0);

    const portalY = PORTAL_CONFIG.height / 2 + 0.5;
    posA.y = portalY;
    posB.y = portalY;

    this.engine.world.portalSystem.addPortalPair(
      posA, rotA, PORTAL_CONFIG.colorA,
      posB, rotB, PORTAL_CONFIG.colorB,
      PORTAL_CONFIG.width, PORTAL_CONFIG.height
    );
  }

  public spawnObject(type: string): void {
    const persistentId = `dynamic_${type}_${Date.now()}`;

    if (type === 'chest') {
      const chest = new Chest(null, persistentId);
      
      const savedState = this.engine.stateManager.getObjectState(persistentId);
      if (savedState) {
        chest.loadState(savedState);
      } else {
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.engine.player.camera.quaternion);
        forward.y = 0;
        if (forward.lengthSq() > 0) forward.normalize();
        else forward.set(0, 0, -1);

        const spawnPos = this.engine.player.position.clone().add(forward.multiplyScalar(2));
        spawnPos.y = 0.5;
        chest.mesh.position.copy(spawnPos);
        chest.mesh.lookAt(this.engine.player.position.x, 0.5, this.engine.player.position.z);
      }

      this.engine.scene.add(chest.mesh);
      this.engine.world.interaction.registerInteractive(chest.mesh);
      this.engine.interactables.push(chest);
      chest.initPhysics();
      return;
    } else if (type === 'skeleton') {
      const skeleton = new Skeleton();
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.engine.player.camera.quaternion);
      forward.y = 0; forward.normalize();
      const spawnPos = this.engine.player.position.clone().add(forward.multiplyScalar(3));
      spawnPos.y = 0.1;
      skeleton.mesh.position.copy(spawnPos);
      skeleton.mesh.lookAt(this.engine.player.position.x, 0.1, this.engine.player.position.z);
      this.engine.scene.add(skeleton.mesh);
      this.engine.world.interaction.registerInteractive(skeleton.mesh);
      this.engine.interactables.push(skeleton);
      skeleton.initPhysics();
      return;
    }

    let obj: any = null;
    if (type === 'torch') obj = new TikiTorch(persistentId);
    else if (type === 'lighter') obj = new FlintAndSteel(persistentId);
    else if (type === 'bucket') obj = new WaterBucket(persistentId);
    else if (type === 'crown') obj = new Crown();
    else if (type === 'hoe') obj = new GardeningHoe();
    if (!obj) return;

    const savedState = this.engine.stateManager.getObjectState(persistentId);
    if (savedState) {
      obj.loadState(savedState);
    } else {
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.engine.player.camera.quaternion);
      const spawnPos = this.engine.player.camera.position.clone().add(forward.multiplyScalar(2));
      if (type === 'torch') spawnPos.y = 1.1;
      obj.mesh.position.copy(spawnPos);
    }

    this.engine.scene.add(obj.mesh);
    this.engine.world.interaction.registerInteractive(obj.mesh);
    this.engine.grabbables.push(obj);
    obj.initPhysics();
  }

  public jumpToPlatform(index: number): void {
    console.log(`Jumping to platform ${index}...`);
    const offset = new THREE.Vector3(index * 1000, 0, 0);
    this.engine.player.setPosition(offset.x, 1.6, offset.z + 8);
    
    const plat = this.engine.world.platformManager.activePlatforms.find(p => (p as any).userData?.index === index);
    if (plat) {
      (this.engine.world as any).currentPlatform = { mesh: plat, config: (plat as any).userData.config, objects: [], offset };
    }
  }

  public spawnExtraTorch(): void {
    console.log("Spawning extra torch (simulating bringing it from Isolation)...");
    const torch = new TikiTorch(`prop_torch_isolation_extra`);
    const forward = this.engine.player.getDirection();
    const spawnPos = this.engine.player.camera.position.clone().add(forward.multiplyScalar(2));
    spawnPos.y = 1.1; 
    torch.mesh.position.copy(spawnPos);
    
    this.engine.scene.add(torch.mesh);
    this.engine.world.addPuzzleObject(torch);
    torch.initPhysics();
  }
}

