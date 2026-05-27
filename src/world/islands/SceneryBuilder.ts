import * as THREE from 'three';
import { IslandContext } from './IslandContext';
import { FoliageType } from '../../objects/Foliage';
import { RockType } from '../../objects/Rock';

/**
 * Declarative scenery for an island. Each entry spawns a static decorative
 * mesh via the platform factory. Positions are island-local — the builder
 * applies `ctx.offset` automatically.
 */
export type SceneryEntry =
  | { kind: 'palm'; pos: THREE.Vector3; variation?: number }
  | { kind: 'foliage'; type: FoliageType; pos: THREE.Vector3; variation?: number }
  | { kind: 'rock'; type: RockType; pos: THREE.Vector3; variation?: number; rotY?: number };

export interface ScatterRocksOptions {
  count: number;
  /** Inclusive range, units from island center. */
  radius: [number, number];
}

const at = (ctx: IslandContext, p: THREE.Vector3) => p.clone().add(ctx.offset);

export function buildScenery(ctx: IslandContext, entries: SceneryEntry[]): void {
  for (const e of entries) {
    switch (e.kind) {
      case 'palm': {
        const palm = ctx.factory.createPalmTree(at(ctx, e.pos), e.variation);
        palm.loadModel();
        ctx.addStaticMesh(palm.mesh);
        break;
      }
      case 'foliage': {
        const f = ctx.factory.createFoliage(e.type, at(ctx, e.pos), e.variation);
        f.loadModel();
        ctx.addStaticMesh(f.mesh);
        break;
      }
      case 'rock': {
        const r = ctx.factory.createRock(e.type, at(ctx, e.pos), e.variation);
        if (e.rotY !== undefined) r.mesh.rotation.y = e.rotY;
        r.loadModel();
        ctx.addStaticMesh(r.mesh);
        break;
      }
    }
  }
}

/** Scatter a ring of randomized rocks around the island center. */
export function scatterRocks(ctx: IslandContext, opts: ScatterRocksOptions): void {
  const [rMin, rMax] = opts.radius;
  for (let i = 0; i < opts.count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = rMin + Math.random() * (rMax - rMin);
    const type: RockType = Math.random() > 0.5 ? 'normal' : 'mossy';
    const pos = new THREE.Vector3(Math.cos(angle) * r, 0, Math.sin(angle) * r);
    const rk = ctx.factory.createRock(type, at(ctx, pos));
    rk.mesh.rotation.y = Math.random() * Math.PI * 2;
    rk.loadModel();
    ctx.addStaticMesh(rk.mesh);
  }
}
