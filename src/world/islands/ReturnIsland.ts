import * as THREE from 'three';
import { IslandContext } from './IslandContext';
import { ReturnGatheringStage, ReturnRiteStage } from '../../puzzles/ReturnRitualPuzzle';
import { SequentialPuzzle } from '../../puzzles/SequentialPuzzle';
import Throne from '../../objects/Throne';
import { PORTAL_CONFIG } from '../../config/PortalConfig';

export function setupReturnIsland(ctx: IslandContext): void {
  const spawnWithOffset = (pos: THREE.Vector3) => pos.clone().add(ctx.offset);
  const sharedIdPrefix = 'rise';

  // Nighttime handled in registerActivation

  // 1. Scenery
  const palm1 = ctx.factory.createPalmTree(spawnWithOffset(new THREE.Vector3(-8, 0, -8)), 3);
  palm1.loadModel();
  ctx.addStaticMesh(palm1.mesh);

  const palm2 = ctx.factory.createPalmTree(spawnWithOffset(new THREE.Vector3(8, 0, 8)), 1);
  palm2.loadModel();
  ctx.addStaticMesh(palm2.mesh);

  const fern1 = ctx.factory.createFoliage('fern', spawnWithOffset(new THREE.Vector3(-5, 0, 0)));
  fern1.loadModel();
  ctx.addStaticMesh(fern1.mesh);

  const monstera1 = ctx.factory.createFoliage('monstera', spawnWithOffset(new THREE.Vector3(4, 0, -6)));
  monstera1.loadModel();
  ctx.addStaticMesh(monstera1.mesh);

  const banana1 = ctx.factory.createFoliage('banana', spawnWithOffset(new THREE.Vector3(-4, 0, 6)));
  banana1.loadModel();
  ctx.addStaticMesh(banana1.mesh);
  const rock1 = ctx.factory.createRock('normal', spawnWithOffset(new THREE.Vector3(-2, 0, 5)), 1);
  rock1.loadModel();
  ctx.addStaticMesh(rock1.mesh);

  const rock2 = ctx.factory.createRock('mossy', spawnWithOffset(new THREE.Vector3(6, 0, -2)), 2);
  rock2.loadModel();
  ctx.addStaticMesh(rock2.mesh);

  const rock3 = ctx.factory.createRock('normal', spawnWithOffset(new THREE.Vector3(4, 0, 4)), 3);
  rock3.loadModel();
  ctx.addStaticMesh(rock3.mesh);

  const rock4 = ctx.factory.createRock('mossy', spawnWithOffset(new THREE.Vector3(-4, 0, -4)), 1);
  rock4.loadModel();
  ctx.addStaticMesh(rock4.mesh);

  for (let i = 0; i < 8; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = 4 + Math.random() * 6; 
    const rt = Math.random() > 0.5 ? 'normal' : 'mossy';
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;
    const rk = ctx.factory.createRock(rt, spawnWithOffset(new THREE.Vector3(x, 0, z)));
    rk.mesh.rotation.y = Math.random() * Math.PI * 2;
    rk.loadModel();
    ctx.addStaticMesh(rk.mesh);
  }

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

  // 3. Trigger Zones
  const zones = [
    ctx.factory.createTriggerZone(spawnWithOffset(new THREE.Vector3(-3.5, 1.0, -3.5)), 2.0, 0x00ffaa),
    ctx.factory.createTriggerZone(spawnWithOffset(new THREE.Vector3(3.5, 1.0, -3.5)), 2.0, 0x00ffaa),
    ctx.factory.createTriggerZone(spawnWithOffset(new THREE.Vector3(-3.5, 1.0, 3.5)), 2.0, 0x00ffaa),
    ctx.factory.createTriggerZone(spawnWithOffset(new THREE.Vector3(3.5, 1.0, 3.5)), 2.0, 0x00ffaa)
  ];
  zones.forEach(z => {
    ctx.scene.add(z.mesh);
    ctx.activeZones.push(z);
  });

  // 4. Puzzle Sequence
  const returnPuzzle = new SequentialPuzzle('return-ritual', [
    new ReturnGatheringStage(zones),
    new ReturnRiteStage(zones)
  ]);

  returnPuzzle.onAllStagesComplete = () => {
    console.log('4 Lit Torches in Sockets! Return Ritual Complete!');
    if (throne) {
      ctx.scene.remove(throne.mesh);
    }

    const targetOffset = new THREE.Vector3(3000, 0, 0);
    const nextPlatform = ctx.platformManager.createPlatform(3, targetOffset);
    if (nextPlatform) {
      nextPlatform.objects.forEach((obj: any) => {
        if (obj.mesh) ctx.interaction.registerInteractive(obj.mesh);
        ctx.addPuzzleObject(obj);
      });
    }

    ctx.portalSystem.addPortalPair(
      new THREE.Vector3(0, 3.0, -10).add(ctx.platform.mesh.position), new THREE.Euler(0, 0, 0), 0xff0000,
      new THREE.Vector3(3000, 5.0, 0), new THREE.Euler(0, Math.PI / 2, 0), 0xffaa00,
      PORTAL_CONFIG.width, PORTAL_CONFIG.height,
      (isPlayer) => {
        if (isPlayer) {
          ctx.onTransition(3, ctx.platform, nextPlatform);
        }
      }
    );
  };

  ctx.registerActivation(() => {
    ctx.lighting.setSunTime(21);
    ctx.puzzleManager.setActivePuzzle(returnPuzzle);
  });
}
