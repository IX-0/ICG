import * as THREE from 'three';
import { RendererCapabilities } from '../../engine/Renderer';
import { ENV_CONFIG } from '../../config/EnvironmentConfig';

/**
 * Single-directional-light shadow caster. Camera-following ortho frustum, sized for
 * foot-level gameplay (palm trees, props, terrain). CSM is intentionally not used —
 * it requires per-material chunk injection that conflicts with custom ShaderMaterials
 * (Water, Sky) in this scene. A single shadow camera is plenty up to ~150u radius.
 */
export default class ShadowSystem {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private caps: RendererCapabilities;

  private shadowLight: THREE.DirectionalLight | null = null;
  private islandOffset: THREE.Vector3 = new THREE.Vector3();
  private _dirVec: THREE.Vector3 = new THREE.Vector3(-1, 1, -0.5).normalize();

  // Frustum half-extent around camera. Anything outside is unshadowed.
  private static readonly RADIUS = 40;

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    caps: RendererCapabilities,
  ) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.caps = caps;
  }

  init(sunLight: THREE.DirectionalLight): void {
    if (this.shadowLight) {
      this.scene.remove(this.shadowLight);
      this.scene.remove(this.shadowLight.target);
      this.shadowLight.dispose();
      this.shadowLight = null;
    }

    let mapSize = ENV_CONFIG.sun.shadowMapSize;
    if (this.caps.shadowQuality === 'medium') {
      mapSize = 2048;
    } else if (this.caps.shadowQuality === 'low') {
      mapSize = 1024;
    }

    const light = new THREE.DirectionalLight(sunLight.color, sunLight.intensity);
    light.castShadow = true;
    light.shadow.mapSize.set(mapSize, mapSize);
    light.shadow.camera.near = 0.5;
    light.shadow.camera.far = 300;
    const r = ShadowSystem.RADIUS;
    light.shadow.camera.left = -r;
    light.shadow.camera.right = r;
    light.shadow.camera.top = r;
    light.shadow.camera.bottom = -r;
    light.shadow.bias = 0;
    light.shadow.normalBias = 0.03;

    this._dirVec.copy(sunLight.position).normalize();
    this.scene.add(light);
    this.scene.add(light.target);
    this.shadowLight = light;

    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    console.log(`[ShadowSystem] init: mapSize=${mapSize}, quality=${this.caps.shadowQuality}, radius=${r}`);
  }

  /** Reposition the shadow camera each frame so it follows the player. */
  update(): void {
    if (!this.shadowLight) return;
    const cam = this.camera.position;
    // Light is positioned along the sun direction, offset back from the camera so
    // it casts down/across the local area.
    const dist = 150;
    this.shadowLight.position.set(
      cam.x + this._dirVec.x * dist,
      cam.y + this._dirVec.y * dist,
      cam.z + this._dirVec.z * dist,
    );
    this.shadowLight.target.position.copy(cam);
    this.shadowLight.target.updateMatrixWorld();
  }

  setIslandTarget(islandIndex: number): void {
    this.islandOffset.set(islandIndex * 1000, 0, 0);
  }

  /** No-op: standard DirectionalLight needs no per-material setup. */
  setupMaterial(_mat: THREE.Material): void { }
  registerSceneMaterials(): void { }

  updateSunDirection(sunPosition: THREE.Vector3): void {
    this._dirVec.copy(sunPosition).normalize();
  }

  /** Track sun color/intensity/visibility on the shadow-casting light. */
  syncSun(color: THREE.Color, intensity: number, visible: boolean): void {
    if (!this.shadowLight) return;
    this.shadowLight.color.copy(color);
    this.shadowLight.intensity = intensity;
    this.shadowLight.visible = visible;
  }

  dispose(): void {
    if (this.shadowLight) {
      this.scene.remove(this.shadowLight);
      this.scene.remove(this.shadowLight.target);
      this.shadowLight.dispose();
      this.shadowLight = null;
    }
  }
}
