import * as THREE from 'three';
import { IslandContext } from './IslandContext';
import { IsolationInquiryStage, IsolationShatterStage } from '../../puzzles/IsolationRitualPuzzle';
import { SequentialPuzzle } from '../../puzzles/SequentialPuzzle';
import Crown from '../../objects/Crown';
import Mirror from '../../objects/Mirror';
import { PORTAL_CONFIG } from '../../config/PortalConfig';

export function setupIsolationIsland(ctx: IslandContext): void {
  const spawnWithOffset = (pos: THREE.Vector3) => pos.clone().add(ctx.offset);
  const sharedIdPrefix = 'rise';

  // 1. Initial State: Day, Very Misty
  ctx.lighting.setSunTime(10); // 10 AM
  ctx.lighting.addFog(0.12, 0xaaaaaa); // Very thick white mist

  // 2. Decorative Scenery (No trees, just large rocks)
  const r1 = ctx.factory.createRock('normal', spawnWithOffset(new THREE.Vector3(-8, 0, -8)), 1);
  r1.loadModel();
  ctx.addStaticMesh(r1.mesh);

  const r2 = ctx.factory.createRock('mossy', spawnWithOffset(new THREE.Vector3(8, 0, 8)), 2);
  r2.loadModel();
  ctx.addStaticMesh(r2.mesh);

  const r3 = ctx.factory.createRock('normal', spawnWithOffset(new THREE.Vector3(2, 0, -8)), 3);
  r3.loadModel();
  ctx.addStaticMesh(r3.mesh);

  const r4 = ctx.factory.createRock('mossy', spawnWithOffset(new THREE.Vector3(-2, 0, 5)), 1);
  r4.loadModel();
  ctx.addStaticMesh(r4.mesh);

  const r5 = ctx.factory.createRock('normal', spawnWithOffset(new THREE.Vector3(6, 0, -2)), 2);
  r5.loadModel();
  ctx.addStaticMesh(r5.mesh);

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

  // 3. Props
  const mirror = ctx.factory.createMirror(spawnWithOffset(new THREE.Vector3(0, 1.4, 0)), `prop_mirror_${sharedIdPrefix}`);
  ctx.scene.add(mirror.mesh);
  ctx.addPuzzleObject(mirror);

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

  // 5. Setup Mirror -> Transition
  const isolationPuzzle = new SequentialPuzzle('isolation-ritual', [
    new IsolationInquiryStage(mirror),
    new IsolationShatterStage(mirror)
  ]);

  isolationPuzzle.onAllStagesComplete = () => {
    console.log("THE MIRROR SHATTERS! Illusion broken.");
    ctx.lighting.addFog(0.005, 0x112233);

    const targetOffset = new THREE.Vector3(2000, 0, 0);
    const nextPlatform = ctx.platformManager.createPlatform(2, targetOffset);
    if (nextPlatform) {
      nextPlatform.objects.forEach((obj: any) => {
        if (obj.mesh) ctx.interaction.registerInteractive(obj.mesh);
        ctx.addPuzzleObject(obj);
      });
    }

    ctx.portalSystem.addPortalPair(
      new THREE.Vector3(0, 3.0, -11.5).add(ctx.platform.mesh.position),
      new THREE.Euler(0, 0, 0), 0xffaa00,
      new THREE.Vector3(2000, 4.0, 0), new THREE.Euler(0, Math.PI / 2, 0), 0x00ffaa,
      PORTAL_CONFIG.width, PORTAL_CONFIG.height,
      (isPlayer) => {
        if (isPlayer) {
          ctx.onTransition(2, ctx.platform, nextPlatform);
        }
      }
    );

    ctx.lighting.setSunTime(22);
  };

  ctx.registerActivation(() => {
    // 4. Force Crown Presence (It may have been consumed/lost)
    const crownId = 'prop_crown_rise';
    let crown = ctx.puzzleObjects.find(o => (o as any).persistentId === crownId) as any;
    if (!crown) {
      crown = ctx.spawnCrown(crownId);
    }

    if (crown) {
      // If it IS held, we'll use a hack to clear the player's hand.
      const game = (window as any).gameEngine;
      if (game && game.player && game.player.heldItem === crown) {
        console.log("Isolation: The crown slips from your grasp in the thick mist...");
        game.player.heldItem = null;
        crown.isHeld = false;
        ctx.scene.add(crown.mesh);
      }

      // Reposition crown to a "lost" spot (near skeleton)
      const spawnPos = new THREE.Vector3(5.2, 0.5, 5.2).add(ctx.platform.mesh.position);
      spawnPos.y += ctx.platform.config.height / 2;
      crown.mesh.position.copy(spawnPos);

      if (crown.rigidBody) {
        crown.rigidBody.setTranslation(crown.mesh.position, true);
      }
    }

    ctx.puzzleManager.setActivePuzzle(isolationPuzzle);
    ctx.lighting.setSunTime(22);
  });
}
