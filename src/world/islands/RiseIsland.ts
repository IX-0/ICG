import * as THREE from 'three';
import { IslandContext } from './IslandContext';
import { RiseFindCrownStage, RiseThroneStage } from '../../puzzles/RiseRitualPuzzle';
import { SequentialPuzzle } from '../../puzzles/SequentialPuzzle';
import { PORTAL_CONFIG } from '../../config/PortalConfig';


export function setupRiseIsland(ctx: IslandContext): void {
  const spawnWithOffset = (pos: THREE.Vector3) => pos.clone().add(ctx.offset);
  const sharedIdPrefix = 'rise';

  // 1. Decorative Scenery
  const palm1 = ctx.factory.createPalmTree(spawnWithOffset(new THREE.Vector3(-8, 0, -8)), 1);
  palm1.loadModel();
  ctx.addStaticMesh(palm1.mesh);

  const palm2 = ctx.factory.createPalmTree(spawnWithOffset(new THREE.Vector3(8, 0, 8)), 2);
  palm2.loadModel();
  ctx.addStaticMesh(palm2.mesh);

  const fern1 = ctx.factory.createFoliage('fern', spawnWithOffset(new THREE.Vector3(-5, 0, 0)));
  fern1.loadModel();
  ctx.addStaticMesh(fern1.mesh);

  const fern2 = ctx.factory.createFoliage('fern', spawnWithOffset(new THREE.Vector3(4, 0, -6)));
  fern2.loadModel();
  ctx.addStaticMesh(fern2.mesh);

  const monstera1 = ctx.factory.createFoliage('monstera', spawnWithOffset(new THREE.Vector3(-6, 0, 4)));
  monstera1.loadModel();
  ctx.addStaticMesh(monstera1.mesh);

  const banana1 = ctx.factory.createFoliage('banana', spawnWithOffset(new THREE.Vector3(6, 0, 6)));
  banana1.loadModel();
  ctx.addStaticMesh(banana1.mesh);

  ctx.addStaticMesh(ctx.factory.createRock(spawnWithOffset(new THREE.Vector3(-2, 0, 5)), 1.5));
  ctx.addStaticMesh(ctx.factory.createRock(spawnWithOffset(new THREE.Vector3(6, 0, -2)), 0.8));

  // 2. Props
  const throne = ctx.factory.createThrone(spawnWithOffset(new THREE.Vector3(0, 0, -4)), `prop_throne_${sharedIdPrefix}`);
  ctx.loadObjectState(throne);
  ctx.scene.add(throne.mesh);
  ctx.addPuzzleObject(throne);

  const skeleton = ctx.factory.createSkeleton(spawnWithOffset(new THREE.Vector3(5, 0.1, 5)), false, true, `prop_skeleton_${sharedIdPrefix}`);
  ctx.loadObjectState(skeleton);
  ctx.scene.add(skeleton.mesh);
  ctx.addPuzzleObject(skeleton);

  const chest = ctx.factory.createChest(spawnWithOffset(new THREE.Vector3(-5, 0.1, -5)), null, `prop_chest_${sharedIdPrefix}`);
  ctx.loadObjectState(chest);
  ctx.scene.add(chest.mesh);
  ctx.addPuzzleObject(chest);

  for (let i = 1; i <= 3; i++) {
    const torch = ctx.factory.createTikiTorch(spawnWithOffset(new THREE.Vector3(-3 + i * 2, 1.1, 8)), `prop_torch_rise_${i}`);
    ctx.loadObjectState(torch);
    ctx.scene.add(torch.mesh);
    ctx.addPuzzleObject(torch);
  }

  // 3. Puzzle Setup
  const crownId = 'prop_crown_rise';
  if (ctx.stateManager.getObjectState(crownId)) {
    ctx.spawnCrown(crownId);
  }

  const risePuzzle = new SequentialPuzzle('rise-ritual', [
    new RiseFindCrownStage(skeleton),
    new RiseThroneStage(throne)
  ]);

  skeleton.onInteractTakeCrown = () => {
    const exists = ctx.puzzleObjects.some(o => (o as any).persistentId === crownId);
    if (!exists) {
      const spawnPos = new THREE.Vector3(5.2, 0.5, 5.2).add(ctx.platform.mesh.position);
      spawnPos.y += ctx.platform.config.height / 2;
      ctx.spawnCrown(crownId, spawnPos);
    }
    ctx.stateManager.updateObjectState(skeleton.persistentId, skeleton.saveState());
  };

  risePuzzle.onAllStagesComplete = () => {
    console.log('Rise Sequence complete! Revealed the path.');
    
    // Consume the Crown
    const crown = ctx.puzzleObjects.find(o => (o as any).persistentId === crownId);
    if (crown) {
      ctx.scene.remove(crown.mesh);
      ctx.removePuzzleObject(crown);
    }

    ctx.lighting.addFog(0.08, 0x556677);
    const targetOffset = new THREE.Vector3(80, 0, 0);
    const nextPlatform = ctx.platformManager.createPlatform(1, targetOffset);
    if (nextPlatform) {
      nextPlatform.objects.forEach((obj: any) => {
        if (obj.mesh) ctx.interaction.registerInteractive(obj.mesh);
        ctx.addPuzzleObject(obj);
      });
    }

    ctx.portalSystem.addPortalPair(
      new THREE.Vector3(0, 3.0, -10), new THREE.Euler(0, 0, 0), PORTAL_CONFIG.colorA,
      new THREE.Vector3(80, 4.0, 0), new THREE.Euler(0, Math.PI / 2, 0), PORTAL_CONFIG.colorB,
      PORTAL_CONFIG.width, PORTAL_CONFIG.height,
      (isPlayer) => {
        if (isPlayer) {
          ctx.onTransition(1, ctx.platform, nextPlatform);
        }
      }

    );
  };

  ctx.puzzleManager.setActivePuzzle(risePuzzle);
}
