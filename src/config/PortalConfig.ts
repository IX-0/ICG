export const PORTAL_CONFIG = {
  width: 1.5,
  height: 2.7,
  colorA: 0xffaa00,
  colorB: 0xff5500,
  // Teleportation
  teleportThreshold: 0.20,
  exitNudge: 0.50,
  // Rendering & Culling
  cullingDistance: 50,
  renderMinDist: 0.25,
  renderMaxDist: 4.0,
  minResolution: 512,
  maxResolution: 2048,
};

export type PortalConfig = typeof PORTAL_CONFIG;
export const INITIAL_PORTAL_CONFIG: PortalConfig = JSON.parse(JSON.stringify(PORTAL_CONFIG));

export function resetPortalConfig(): void {
  Object.assign(PORTAL_CONFIG, JSON.parse(JSON.stringify(INITIAL_PORTAL_CONFIG)));
}
