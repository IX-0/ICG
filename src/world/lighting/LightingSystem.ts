import * as THREE from 'three';
import { ENV_CONFIG } from '../../config/EnvironmentConfig';
import { IslandLightingPreset } from '../../config/IslandLightingPresets';

interface TimeTransition {
  fromHour: number;
  toHour: number;
  durationSec: number;
  elapsed: number;
  onComplete?: () => void;
}

interface FogTransition {
  fromColor: THREE.Color;
  fromDensity: number;
  toColor: THREE.Color;
  toDensity: number;
  durationSec: number;
  elapsed: number;
}

export default class LightingSystem {
  scene: THREE.Scene;
  renderer: THREE.WebGLRenderer;
  sunLight: THREE.DirectionalLight;
  ambientLight: THREE.AmbientLight;
  moonLight: THREE.DirectionalLight;

  private _sinElevation: number = 0;
  public lastSunTime: number = ENV_CONFIG.time.startHour;
  public dayNumber: number = 0;
  private _prevHour: number = ENV_CONFIG.time.startHour;

  public currentFogDensity: number = ENV_CONFIG.fog.dayDensity;
  public currentFogColor: THREE.Color = new THREE.Color(ENV_CONFIG.fog.dayColor);

  public fogOverrideDensity: number | null = null;
  public fogOverrideColor: THREE.Color | number | null = null;

  private _driftRate: number = ENV_CONFIG.time.speed;
  private _transition: TimeTransition | null = null;
  private _fogTransition: FogTransition | null = null;
  private _activeAccentLights: THREE.Light[] = [];

  // Shadow slot management — cap torch shadow casters
  private _shadowSlots: Set<object> = new Set();
  private static readonly MAX_SHADOW_SLOTS = 4;

  constructor(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {
    this.scene = scene;
    this.renderer = renderer;

    const cfg = ENV_CONFIG;

    this.currentFogDensity = cfg.fog.dayDensity;
    this.currentFogColor = new THREE.Color(cfg.fog.dayColor);

    // Sun — direction/color tracker only. NOT added to scene. ShadowSystem owns its own
    // shadow-casting DirectionalLight and mirrors this one's color/intensity via syncSun().
    this.sunLight = new THREE.DirectionalLight(cfg.sun.color, 0);
    this.sunLight.castShadow = false;

    // Moon — soft blue, shadow enabled
    this.moonLight = new THREE.DirectionalLight(cfg.moon.lightColor, 0);
    this.moonLight.castShadow = true;
    this.moonLight.shadow.mapSize.set(2048, 2048);
    this.moonLight.shadow.camera.near = 0.5;
    this.moonLight.shadow.camera.far = 300;
    const moonShadowRadius = 80;
    this.moonLight.shadow.camera.left = -moonShadowRadius;
    this.moonLight.shadow.camera.right = moonShadowRadius;
    this.moonLight.shadow.camera.top = moonShadowRadius;
    this.moonLight.shadow.camera.bottom = -moonShadowRadius;
    this.moonLight.shadow.bias = 0;
    this.moonLight.shadow.normalBias = 0.03;
    this.moonLight.visible = false;
    this.scene.add(this.moonLight);
    this.scene.add(this.moonLight.target);

    // Ambient — low fill, color lerps day/night
    this.ambientLight = new THREE.AmbientLight(0xffffff, cfg.ambient.intensity);
    this.scene.add(this.ambientLight);

  }

  applyPreset(preset: IslandLightingPreset, offset?: THREE.Vector3): void {
    this.lastSunTime = preset.startHour;
    this._driftRate = preset.driftHoursPerRealMin / 60;
    this.fogOverrideDensity = preset.fogDensity;
    this.fogOverrideColor = preset.fogColor;

    // Clean up previous accent lights
    for (const light of this._activeAccentLights) {
      this.scene.remove(light);
      if ((light as any).dispose) (light as any).dispose();
    }
    this._activeAccentLights = [];

    // Spawn new accent lights if preset defines them and island offset is provided
    if (preset.accentLights && offset) {
      for (const spec of preset.accentLights) {
        let light: THREE.Light;
        if (spec.type === 'point') {
          const pLight = new THREE.PointLight(spec.color, spec.intensity, spec.range);
          pLight.decay = 2;
          pLight.castShadow = false; // Disable shadow casting for extreme performance
          light = pLight;
        } else {
          const sLight = new THREE.SpotLight(spec.color, spec.intensity, spec.range);
          sLight.decay = 2;
          sLight.castShadow = false;
          light = sLight;
        }
        light.position.set(
          spec.position[0] + offset.x,
          spec.position[1] + offset.y,
          spec.position[2] + offset.z
        );
        this.scene.add(light);
        this._activeAccentLights.push(light);
      }
    }

    // Start smooth fog transition instead of setting instantly
    const currentFog = this.scene.fog as THREE.FogExp2;
    const fromColor = currentFog ? new THREE.Color(currentFog.color) : new THREE.Color(preset.fogColor);
    const fromDensity = currentFog ? currentFog.density : 0;
    const toColor = new THREE.Color(preset.fogColor);

    this._fogTransition = {
      fromColor,
      fromDensity,
      toColor,
      toDensity: preset.fogDensity,
      durationSec: 5.0, // Smoother 5-second island transition fade
      elapsed: 0,
    };

    if (preset.sunColorOverride !== undefined) {
      this.sunLight.color.setHex(preset.sunColorOverride);
    } else {
      this.sunLight.color.setHex(ENV_CONFIG.sun.color);
    }

    const baseExposure = ENV_CONFIG.toneMapping.dayExposure;
    this.renderer.toneMappingExposure = baseExposure + preset.exposureBias;

    this._setSunTime(preset.startHour);
    this._transition = null;
  }

  /** Smooth tween to a different sun hour. Optional onComplete fires when tween finishes. */
  transitionTo(opts: { sunHour: number; durationSec: number; onComplete?: () => void }): void {
    this._transition = {
      fromHour: this.lastSunTime,
      toHour: opts.sunHour,
      durationSec: opts.durationSec,
      elapsed: 0,
      onComplete: opts.onComplete,
    };
  }

  /** Called each frame by GameEngine._updateLighting (via update path) */
  tickDrift(dt: number): void {
    // Update sun time
    if (this._transition) {
      this._transition.elapsed += dt;
      const t = Math.min(this._transition.elapsed / this._transition.durationSec, 1);
      const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      const h = THREE.MathUtils.lerp(this._transition.fromHour, this._transition.toHour, eased);
      this._setSunTime(h);
      if (t >= 1) {
        const cb = this._transition.onComplete;
        this._transition = null;
        cb?.();
      }
    } else {
      const nextHour = (this.lastSunTime + dt * this._driftRate) % 24;
      this._setSunTime(nextHour);
    }

    // Update fog (smooth transition or natural drift)
    const cfg = ENV_CONFIG;
    const nf = this.getNightFactor();

    const targetColor = this.fogOverrideColor !== null
      ? new THREE.Color(this.fogOverrideColor as any)
      : new THREE.Color(cfg.fog.dayColor).lerp(new THREE.Color(cfg.fog.nightColor), nf);

    const targetDensity = this.fogOverrideDensity !== null
      ? this.fogOverrideDensity
      : THREE.MathUtils.lerp(cfg.fog.dayDensity, cfg.fog.nightDensity, nf);

    if (this._fogTransition) {
      this._fogTransition.elapsed += dt;
      const t = Math.min(this._fogTransition.elapsed / this._fogTransition.durationSec, 1);
      const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

      this.currentFogColor.lerpColors(this._fogTransition.fromColor, this._fogTransition.toColor, eased);
      this.currentFogDensity = THREE.MathUtils.lerp(this._fogTransition.fromDensity, this._fogTransition.toDensity, eased);

      this.scene.fog = new THREE.FogExp2(this.currentFogColor, this.currentFogDensity);

      if (t >= 1) {
        this._fogTransition = null;
      }
    } else {
      // Smoothly drift towards time-of-day target fog color and density (delta-time based)
      const lerpSpeed = 1.0 - Math.exp(-2.0 * dt);
      this.currentFogColor.lerp(targetColor, lerpSpeed);
      this.currentFogDensity = THREE.MathUtils.lerp(this.currentFogDensity, targetDensity, lerpSpeed);
      this.scene.fog = new THREE.FogExp2(this.currentFogColor, this.currentFogDensity);
    }
  }

  private _setSunTime(h: number): void {
    const cfg = ENV_CONFIG;
    const R = cfg.sun.orbitRadius;

    const sunAngle = ((h - 6) / 24) * Math.PI * 2;
    const sunX = R * Math.cos(sunAngle);
    const sunY = R * Math.sin(sunAngle);
    const sunZ = R * cfg.sun.orbitTilt;
    this.sunLight.position.set(sunX, sunY, sunZ);
    this.sunLight.target.position.set(0, 0, 0);

    if (this._prevHour > 23.0 && h < 1.0) this.dayNumber++;
    this._prevHour = this.lastSunTime;
    this.lastSunTime = h;

    const moonAngle = (cfg.moon.fixedAngleDeg / 360) * Math.PI * 2;
    this.moonLight.position.set(
      R * Math.cos(moonAngle),
      R * Math.sin(moonAngle),
      R * cfg.moon.orbitTilt,
    );
    this.moonLight.target.position.set(0, 0, 0);

    this._sinElevation = sunY / R;

    const isDay = h > 6 && h < 18;
    const sunFactor = isDay
      ? THREE.MathUtils.clamp(THREE.MathUtils.mapLinear(this._sinElevation, 0, 1, 0, 1), 0, 1)
      : 0;
    this.sunLight.intensity = sunFactor * cfg.sun.maxIntensity;
    this.sunLight.visible = isDay;

    const nf = this.getNightFactor();

    // Exposure slides between day and night values
    const baseDay = ENV_CONFIG.toneMapping.dayExposure;
    const baseNight = ENV_CONFIG.toneMapping.nightExposure;
    this.renderer.toneMappingExposure = THREE.MathUtils.lerp(baseDay, baseNight, nf);

    // Moon angle is fixed (always above horizon) — scale by nightFactor so it doesn't
    // flood the scene with extra directional light during the day.
    const moonSinElev = this.moonLight.position.y / R;
    this.moonLight.intensity = THREE.MathUtils.clamp(moonSinElev * 3, 0, 1) * cfg.moon.lightIntensity * nf;

    // Ambient (low fill, scales with time)
    const dayAmbient = new THREE.Color().fromArray(cfg.ambient.dayColor).multiplyScalar(0.3);
    const nightAmbient = new THREE.Color().fromArray(cfg.ambient.nightColor).multiplyScalar(0.3);
    const sunsetAmbient = new THREE.Color().fromArray(cfg.ambient.sunsetColor).multiplyScalar(0.3);

    if (this._sinElevation > 0.1) {
      this.ambientLight.color.copy(dayAmbient);
    } else if (this._sinElevation > 0.0) {
      const t = 1.0 - this._sinElevation / 0.1;
      this.ambientLight.color.copy(dayAmbient).lerp(sunsetAmbient, t);
    } else if (this._sinElevation > -0.1) {
      const t = this._sinElevation / -0.1;
      this.ambientLight.color.copy(sunsetAmbient).lerp(nightAmbient, t);
    } else {
      this.ambientLight.color.copy(nightAmbient);
    }

    // Ambient intensity from config so GUI slider takes effect
    this.ambientLight.intensity = cfg.ambient.intensity;

  }

  // ── Keep setSunTime as a public shim for EnvironmentManager / legacy callers ──
  setSunTime(h: number): void { this._setSunTime(h); }

  getNightFactor(): number {
    return THREE.MathUtils.clamp(-this._sinElevation * 3, 0, 1);
  }

  /** Allow at most MAX_SHADOW_SLOTS dynamic shadow casters (torches, etc.) */
  requestShadowSlot(owner: object): boolean {
    if (this._shadowSlots.has(owner)) return true;
    if (this._shadowSlots.size >= LightingSystem.MAX_SHADOW_SLOTS) return false;
    this._shadowSlots.add(owner);
    return true;
  }

  releaseShadowSlot(owner: object): void {
    this._shadowSlots.delete(owner);
  }

  getSunDirection(): THREE.Vector3 { return this.sunLight.position.clone().normalize(); }
  getMoonDirection(): THREE.Vector3 { return this.moonLight.position.clone().normalize(); }
  getSunElevationSin(): number { return this._sinElevation; }
  getSunPosition(): THREE.Vector3 { return this.sunLight.position.clone(); }
  getSunLight(): THREE.DirectionalLight { return this.sunLight; }
  getMoonLight(): THREE.DirectionalLight { return this.moonLight; }
  getAmbientIntensity(): number { return this.ambientLight.intensity; }
  getFogColor(): THREE.Color { return new THREE.Color(ENV_CONFIG.fog.dayColor); }
  getLightingState(): any { return { sunElevation: this._sinElevation }; }

  addFog(density: number, color: THREE.Color | number, durationSec: number = 0): void {
    this.fogOverrideDensity = density;
    this.fogOverrideColor = color;

    if (durationSec <= 0) {
      this.currentFogDensity = density;
      this.currentFogColor = new THREE.Color(color as any);
      this.scene.fog = new THREE.FogExp2(color as any, density);
      this._fogTransition = null;
      return;
    }

    const currentFog = this.scene.fog as THREE.FogExp2;
    const fromColor = currentFog ? new THREE.Color(currentFog.color) : new THREE.Color(color as any);
    const fromDensity = currentFog ? currentFog.density : 0.0;
    const toColor = new THREE.Color(color as any);

    this._fogTransition = {
      fromColor,
      fromDensity,
      toColor,
      toDensity: density,
      durationSec,
      elapsed: 0,
    };
  }

  update(_dt: number): void { }
}
