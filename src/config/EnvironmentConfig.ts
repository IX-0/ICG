export const ENV_CONFIG = {
  // ── Time ────────────────────────────────────────────────────────────────────
  time: {
    startHour: 8.0,    // in-game hour on load [0-24]
    speed: 1 / 60, // hours per real second (1/60 = 1 real-min per game-hour)
    lunarCycleDays: 1,      // how many in-game days for a full moon phase cycle
  },

  // ── Sun ──────────────────────────────────────────────────────────────────────
  sun: {
    orbitRadius: 200,    // radius of the sun/moon orbit sphere
    orbitTilt: 0.45,     // Z-axis tilt
    color: 0xfff0e0,
    maxIntensity: 4,    // peak midday. ACES exposure 1.2 + this gives realistic outdoor brightness
    shadowMapSize: 4096,
    shadowCameraExtent: 80,    // half-extent of shadow frustum (square)
    shadowBias: -0.0001,
  },

  // ── Moon ────────────────────────────────────────────────────────────────────
  // ── Moon ────────────────────────────────────────────────────────────────────
  moon: {
    fixedAngleDeg: 135,
    orbitTilt: -0.2,     // different Z-axis tilt than sun
    lightColor: 0xccccff,
    lightIntensity: 2.5,   // max moon light when above horizon (boosted for brightness)
    phaseLightIntensity: 1.2,  // dedicated phase-shading layer light
    meshRadius: 40,
    glowBaseSize: 220,   // sprite glow base scale
    glowGrowth: 120,   // extra scale added at full nightFactor
    meshOpacityNight: 1.0,
    meshOpacityDay: 0.5,
  },

  // ── Ambient Light ───────────────────────────────────────────────────────────
  ambient: {
    intensity: 1.5,      // Boosted ambient fill
    // Colors as [r, g, b] in linear 0-1 space
    dayColor: [0.85, 0.97, 1.0],   // bright daytime cyan-white
    nightColor: [0.60, 0.65, 0.90],  // visible bright lunar blue ambient
    sunsetColor: [1.0, 0.60, 0.30],  // warm sunset/sunrise orange
  },

  // ── Atmosphere (Sky shader) ──────────────────────────────────────────────────
  atmosphere: {
    turbidityDay: 5,
    turbidityNight: 0.4,
    rayleighDay: 0.7,
    rayleighNight: 0.04,
    mieCoeffDay: 0.003,
    mieCoeffNight: 0.001,
    mieGDay: 0.995,
    mieGNight: 0.998,
  },

  // ── Fog ─────────────────────────────────────────────────────────────────────
  fog: {
    dayColor: 0x87ceeb,
    nightColor: 0x020510,
    dayDensity: 0.0018,
    nightDensity: 0.003,
  },

  // ── Stars ───────────────────────────────────────────────────────────────────
  stars: {
    smallCount: 3500, smallSize: 3, smallBrightness: 0.7,
    mediumCount: 1200, mediumSize: 5, mediumBrightness: 0.9,
    largeCount: 120, largeSize: 10, largeBrightness: 1.0,
    sphereRadius: 1000,
  },

  // ── Tone Mapping ────────────────────────────────────────────────────────────
  // ACES base exposure. Per-island fine-tuning via IslandLightingPreset.exposureBias.
  toneMapping: {
    dayExposure: 1.2,
    nightExposure: 1.6,   // brighter at night to compensate for low light
  },
};

export type EnvConfig = typeof ENV_CONFIG;
export const INITIAL_ENV_CONFIG: EnvConfig = JSON.parse(JSON.stringify(ENV_CONFIG));

export function resetEnvConfig(): void {
  Object.assign(ENV_CONFIG.time, JSON.parse(JSON.stringify(INITIAL_ENV_CONFIG.time)));
  Object.assign(ENV_CONFIG.sun, JSON.parse(JSON.stringify(INITIAL_ENV_CONFIG.sun)));
  Object.assign(ENV_CONFIG.moon, JSON.parse(JSON.stringify(INITIAL_ENV_CONFIG.moon)));
  Object.assign(ENV_CONFIG.ambient, JSON.parse(JSON.stringify(INITIAL_ENV_CONFIG.ambient)));
  Object.assign(ENV_CONFIG.atmosphere, JSON.parse(JSON.stringify(INITIAL_ENV_CONFIG.atmosphere)));
  Object.assign(ENV_CONFIG.fog, JSON.parse(JSON.stringify(INITIAL_ENV_CONFIG.fog)));
  Object.assign(ENV_CONFIG.stars, JSON.parse(JSON.stringify(INITIAL_ENV_CONFIG.stars)));
  Object.assign(ENV_CONFIG.toneMapping, JSON.parse(JSON.stringify(INITIAL_ENV_CONFIG.toneMapping)));
}
