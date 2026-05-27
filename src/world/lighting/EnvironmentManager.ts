import * as THREE from 'three';
// @ts-ignore
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import LightingSystem from './LightingSystem';
import { ENV_CONFIG } from '../../config/EnvironmentConfig';

export default class EnvironmentManager {
  scene: THREE.Scene;
  sky: any;
  lighting: LightingSystem | null = null;

  private moonMesh: THREE.Mesh;
  private moonGlowSprite: THREE.Sprite;
  private starTiers: THREE.Points[] = [];

  private _currentFogDensity: number = ENV_CONFIG.fog.dayDensity;
  private _currentFogColor: THREE.Color = new THREE.Color(ENV_CONFIG.fog.dayColor);

  constructor(scene: THREE.Scene, _camera: THREE.Camera) {
    this.scene = scene;
    const cfg = ENV_CONFIG;

    // ── Moon mesh ────────────────────────────────────────────────────────────
    const moonTex = new THREE.TextureLoader().load(
      'https://threejs.org/examples/textures/planets/moon_1024.jpg'
    );
    const moonMat = new THREE.MeshStandardMaterial({
      map: moonTex,
      roughness: 0.9,
      metalness: 0.0,
      emissive: new THREE.Color(0x222222),
      transparent: true,
      opacity: 0.9,
    });
    this.moonMesh = new THREE.Mesh(new THREE.SphereGeometry(cfg.moon.meshRadius, 32, 32), moonMat);
    this.moonMesh.layers.set(1);
    this.moonMesh.visible = false;
    scene.add(this.moonMesh);

    // ── Moon glow sprite ─────────────────────────────────────────────────────
    this.moonGlowSprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: _makeGlowTexture(),
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
    }));
    this.moonGlowSprite.layers.set(1);
    this.moonGlowSprite.visible = false;
    scene.add(this.moonGlowSprite);

    // ── Stars — reduced counts for mid-laptop budget ─────────────────────────
    this.starTiers.push(_makeStarTier(1500, 3, 0.7, scene));
    this.starTiers.push(_makeStarTier(600, 5, 0.9, scene));
    this.starTiers.push(_makeStarTier(80, 10, 1.0, scene));
  }

  public setup(lighting: LightingSystem): void {
    this.lighting = lighting;
    this.scene.fog = new THREE.FogExp2(ENV_CONFIG.fog.dayColor, ENV_CONFIG.fog.dayDensity);
    this.scene.background = null;

    this.sky = new Sky();
    this.sky.scale.setScalar(450000);

    // Inject opacity support into the Sky ShaderMaterial at runtime
    const mat = this.sky.material as THREE.ShaderMaterial;
    mat.transparent = true;

    // Add opacity uniform since ShaderMaterial requires explicit declaration
    mat.uniforms['opacity'] = { value: 1.0 };

    mat.fragmentShader = mat.fragmentShader
      .replace(
        'void main() {',
        'uniform float opacity;\nvoid main() {'
      )
      .replace(
        'gl_FragColor = vec4( texColor, 1.0 );',
        '// Cap the max HDR brightness so the sun does not blow out the Bloom pass\n' +
        '\t\tvec3 cappedColor = min(texColor, vec3(2.0));\n' +
        '\t\tgl_FragColor = vec4( cappedColor, opacity );'
      );
    mat.needsUpdate = true;

    this.scene.add(this.sky);

    this._applySkyParams(0);
    this._applySunToSky();
  }

  public setMoonPhase(_phase: string): void {
    // Moon phase shading now driven by emissive intensity + atmosphere — no phase light needed
  }

  private _applySkyParams(nightFactor: number): void {
    if (!this.sky) return;
    const u = this.sky.material.uniforms;
    const a = ENV_CONFIG.atmosphere;
    u['turbidity'].value = THREE.MathUtils.lerp(a.turbidityDay, a.turbidityNight, nightFactor);
    u['rayleigh'].value = THREE.MathUtils.lerp(a.rayleighDay, a.rayleighNight, nightFactor);
    u['mieCoefficient'].value = THREE.MathUtils.lerp(a.mieCoeffDay, a.mieCoeffNight, nightFactor);
    u['mieDirectionalG'].value = THREE.MathUtils.lerp(a.mieGDay, a.mieGNight, nightFactor);
  }

  private _applySunToSky(): void {
    if (!this.sky || !this.lighting) return;
    this.sky.material.uniforms['sunPosition'].value.copy(this.lighting.getSunDirection());
  }

  updateSky(): void { this._applySunToSky(); }

  updateMoon(moonDir: THREE.Vector3, cameraPos: THREE.Vector3, nightFactor: number): void {
    this._applySkyParams(nightFactor);
    const cfg = ENV_CONFIG;

    // Sync fog stats directly from unified LightingSystem
    if (this.scene.fog && this.lighting) {
      this._currentFogDensity = this.lighting.currentFogDensity;
      this._currentFogColor.copy(this.lighting.currentFogColor);

      // Smoothly fade out the sky box as fog density builds up (0.015 -> 0.07)
      // Rise: 0.015, Isolation: 0.035 (partially faded), Return: 0.012, Tragedy: 0.1 (fully faded)
      const fadeStart = 0.015;
      const fadeEnd = 0.07;
      const t = THREE.MathUtils.clamp((this._currentFogDensity - fadeStart) / (fadeEnd - fadeStart), 0, 1);
      const skyOpacity = 1.0 - t;

      if (this.sky) {
        this.sky.material.uniforms['opacity'].value = skyOpacity;
        this.sky.material.opacity = skyOpacity;
        this.sky.visible = skyOpacity > 0.001;
      }
      
      // Background matches fog color to provide a seamless backdrop for the fading skybox
      this.scene.background = this._currentFogColor;
    }

    // Moon position (camera-relative)
    const moonPos = cameraPos.clone().addScaledVector(moonDir.clone().normalize(), 800);
    this.moonMesh.position.copy(moonPos);
    this.moonGlowSprite.position.copy(moonPos);

    // Moon emissive brightens at night
    const mat = this.moonMesh.material as THREE.MeshStandardMaterial;
    mat.emissiveMap = mat.map;
    mat.emissive.setScalar(nightFactor * 0.4);
    mat.fog = false; // Disable Three.js distance-based fog to prevent texture washout at 800 units, occlusion is handled manually via fogObstruct
    
    // Dynamically write depth only at night to prevent a solid black sphere artifact during the daytime
    mat.depthWrite = nightFactor > 0.1;
    
    // Obstruct the moon mesh and glow using fogObstruct factor
    const fogObstruct = Math.max(0, Math.min(1, Math.exp(-this._currentFogDensity * 40.0)));
    mat.opacity = THREE.MathUtils.lerp(cfg.moon.meshOpacityDay, cfg.moon.meshOpacityNight, nightFactor) * fogObstruct;
    this.moonMesh.visible = true;

    // Glow (also obstructed by fog)
    const showGlow = nightFactor > 0.05;
    this.moonGlowSprite.visible = showGlow;
    if (showGlow) {
      this.moonGlowSprite.material.opacity = nightFactor * 0.75 * fogObstruct;
      const s = cfg.moon.glowBaseSize + nightFactor * cfg.moon.glowGrowth;
      this.moonGlowSprite.scale.set(s, s, 1);
    }

    // Stars (also obstructed by fog)
    const starFade = THREE.MathUtils.clamp((-this.getLightingState().sunElevation + 0.015) * 8, 0, 1);
    for (const tier of this.starTiers) {
      tier.position.copy(cameraPos);
      tier.rotation.y += 0.00003;
      tier.visible = starFade > 0;
      (tier.material as THREE.PointsMaterial).opacity = starFade * fogObstruct;
    }
  }

  public rebuildStars(): void {
    for (const tier of this.starTiers) {
      this.scene.remove(tier);
      tier.geometry.dispose();
      if (Array.isArray(tier.material)) tier.material.forEach((m) => m.dispose());
      else tier.material.dispose();
    }
    this.starTiers = [];
    this.starTiers.push(_makeStarTier(1500, 3, 0.7, this.scene));
    this.starTiers.push(_makeStarTier(600, 5, 0.9, this.scene));
    this.starTiers.push(_makeStarTier(80, 10, 1.0, this.scene));
  }

  triggerWings(_p: THREE.Vector3): void {}
  update(_dt: number): void {}

  getLightingState(): any { return this.lighting?.getLightingState() ?? {}; }
  getEnvironmentMaterial(): any {
    return { fogColor: (this.scene.fog as THREE.FogExp2)?.color ?? new THREE.Color(ENV_CONFIG.fog.dayColor) };
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function _makeGlowTexture(): THREE.CanvasTexture {
  const size = 256, c = size / 2;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(c, c, 0, c, c, c);
  grad.addColorStop(0, 'rgba(210,230,255,1.0)');
  grad.addColorStop(0.15, 'rgba(170,205,255,0.85)');
  grad.addColorStop(0.40, 'rgba(110,160,255,0.40)');
  grad.addColorStop(0.70, 'rgba(60,100,220,0.12)');
  grad.addColorStop(1, 'rgba(0,20,80,0.00)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

function _makeStarTier(count: number, size: number, brightness: number, scene: THREE.Scene): THREE.Points {
  const SR = ENV_CONFIG.stars.sphereRadius;
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const cosEl = Math.random();
    const sinEl = Math.sqrt(1 - cosEl * cosEl);
    pos[i * 3] = SR * sinEl * Math.cos(theta);
    pos[i * 3 + 1] = SR * cosEl;
    pos[i * 3 + 2] = SR * sinEl * Math.sin(theta);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));

  const dc = document.createElement('canvas');
  dc.width = dc.height = 32;
  const dCtx = dc.getContext('2d')!;
  const dGrad = dCtx.createRadialGradient(16, 16, 0, 16, 16, 16);
  dGrad.addColorStop(0, `rgba(255,255,255,${brightness})`);
  dGrad.addColorStop(0.25, `rgba(230,240,255,${brightness * 0.8})`);
  dGrad.addColorStop(0.6, `rgba(150,200,255,${brightness * 0.3})`);
  dGrad.addColorStop(1, 'rgba(0,0,0,0)');
  dCtx.fillStyle = dGrad;
  dCtx.fillRect(0, 0, 32, 32);

  const mat = new THREE.PointsMaterial({
    size, sizeAttenuation: false,
    map: new THREE.CanvasTexture(dc),
    blending: THREE.AdditiveBlending,
    depthWrite: false, depthTest: true,
    fog: false, transparent: true, opacity: 0,
  });
  const points = new THREE.Points(geo, mat);
  points.layers.set(1);
  points.frustumCulled = false;
  scene.add(points);
  return points;
}
