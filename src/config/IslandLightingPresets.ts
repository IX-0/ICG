import * as THREE from 'three';

export interface AccentLightSpec {
  type: 'point' | 'spot';
  color: number;
  intensity: number;
  range: number;
  /** Offset from island ctx.offset (XZ world origin, y=0) */
  position: [number, number, number];
}

export interface IslandLightingPreset {
  /** In-game hour the island starts at [0–24] */
  startHour: number;
  /** How many in-game hours pass per real minute of gameplay (slow drift) */
  driftHoursPerRealMin: number;
  /** Path under public/ to the HDR file used for IBL scene.environment */
  hdriPath: string;
  fogColor: number;
  fogDensity: number;
  /** Additive offset applied to base toneMappingExposure (1.0) */
  exposureBias: number;
  sunColorOverride?: number;
  accentLights?: AccentLightSpec[];
  postFx: { bloom: boolean; ssao: boolean };
}

export const ISLAND_PRESETS: IslandLightingPreset[] = [
  // 0 — Rise Island (Napoleon's ascent, midday sun, warm)
  {
    startHour: 8,
    driftHoursPerRealMin: 0.15,
    hdriPath: '/hdri/rise_day.hdr',
    fogColor: 0x87ceeb,
    fogDensity: 0.015,
    exposureBias: 0.0,
    sunColorOverride: 0xfff0e0,
    postFx: { bloom: false, ssao: false },
  },

  // 1 — Isolation Island (exile, misty morning, transitions to night)
  {
    startHour: 10,
    driftHoursPerRealMin: 0.08,
    hdriPath: '/hdri/isolation_morning.hdr',
    fogColor: 0xaabbcc,
    fogDensity: 0.035,
    exposureBias: -0.15,
    postFx: { bloom: false, ssao: true },
    accentLights: [
      // Soft golden morning sunlight wash near the central mirror area
      {
        type: 'point',
        color: 0xfff3d6,
        intensity: 2.2,
        range: 22,
        position: [0, 3.5, 0]
      }
    ]
  },

  // 2 — Return Island (night crossing, torchlit ritual)
  {
    startHour: 21,
    driftHoursPerRealMin: 0.05,
    hdriPath: '/hdri/return_night.hdr',
    fogColor: 0x020510,
    fogDensity: 0.012,
    exposureBias: 0.1,
    postFx: { bloom: true, ssao: false },
    accentLights: [
      // 1. Ethereal Midnight Blue Moonlight washing the island center
      {
        type: 'point',
        color: 0x4466ff,
        intensity: 4.5,
        range: 30,
        position: [0, 6, 0]
      },
      // 2. Warm Amber Throne Light (mystical flame glow)
      {
        type: 'point',
        color: 0xffaa44,
        intensity: 3.5,
        range: 16,
        position: [0, 1.5, -4]
      },
      // 3. Ethereal Teal Chest Light (mysterious ancient treasure glow)
      {
        type: 'point',
        color: 0x00ffcc,
        intensity: 1.8,
        range: 10,
        position: [-5, 0.8, -5]
      },
      // 4. Ghostly Violet Skeleton Light (spooky blue-purple sheen)
      {
        type: 'point',
        color: 0xaa44ff,
        intensity: 2.0,
        range: 10,
        position: [5, 0.8, 5]
      }
    ]
  },

  // 3 — Tragedy Island (Waterloo dusk, red sky, volcanic)
  {
    startHour: 19,
    driftHoursPerRealMin: 0.06,
    hdriPath: '/hdri/tragedy_dusk.hdr',
    fogColor: 0x331111,
    fogDensity: 0.1,
    exposureBias: -0.1,
    sunColorOverride: 0xff6633,
    postFx: { bloom: true, ssao: false },
    accentLights: [
      // 1. Deep lava red ambient wash (made brighter)
      {
        type: 'point',
        color: 0xff2200,
        intensity: 4.5,
        range: 35,
        position: [0, 5, 0]
      },
      // 2. Hot volcanic orange central glow
      {
        type: 'point',
        color: 0xffaa00,
        intensity: 2.8,
        range: 18,
        position: [0, 1.2, -3]
      }
    ]
  },
];

/** Compute fog THREE.Color from preset */
export function presetFogColor(preset: IslandLightingPreset): THREE.Color {
  return new THREE.Color(preset.fogColor);
}
