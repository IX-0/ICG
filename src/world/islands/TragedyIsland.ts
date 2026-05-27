import * as THREE from 'three';
import { IslandContext } from './IslandContext';
import { TragedyFindHoeStage, TragedyDigStage, TragedyFinalStage } from '../../puzzles/TragedyRitualPuzzle';
import { SequentialPuzzle } from '../../puzzles/SequentialPuzzle';
import { buildScenery, scatterRocks } from './SceneryBuilder';

export function setupTragedyIsland(ctx: IslandContext): void {
  const spawnWithOffset = (pos: THREE.Vector3) => pos.clone().add(ctx.offset);
  const volcanicId = 'tragedy';

  // 1. Environment: Dark reddish sky (deferred)

  // 3. Props
  const shack = ctx.factory.createShack(spawnWithOffset(new THREE.Vector3(-6, 0, 4)));
  ctx.scene.add(shack.mesh);
  ctx.addPuzzleObject(shack);

  const hoe = ctx.factory.createGardeningHoe(spawnWithOffset(new THREE.Vector3(-6, 0.5, 4.5)), `prop_hoe_${volcanicId}`);
  ctx.loadObjectState(hoe);
  ctx.scene.add(hoe.mesh);
  ctx.addPuzzleObject(hoe);

  const xMarker = ctx.factory.createRedX(spawnWithOffset(new THREE.Vector3(5, 0.05, -5)), `prop_red_x_${volcanicId}`);
  ctx.addStaticMesh(xMarker);

  const coffin = ctx.factory.createCoffin(spawnWithOffset(new THREE.Vector3(5, -0.4, -5)), `prop_coffin_${volcanicId}`);
  ctx.loadObjectState(coffin);
  ctx.scene.add(coffin.mesh);
  ctx.addPuzzleObject(coffin);

  // 4. Puzzle Sequence
  const xSpot = new THREE.Vector3(5, 0.05, -5).add(ctx.offset);

  const tragedyPuzzle = new SequentialPuzzle('tragedy-ritual', [
    new TragedyFindHoeStage(hoe),
    new TragedyDigStage(hoe, xSpot, coffin),
    new TragedyFinalStage(coffin)
  ]);

  tragedyPuzzle.onAllStagesComplete = () => {
    console.log("THE TRAGEDY HAS ENDED. THE CYCLE IS BROKEN.");

    ctx.lighting.addFog(0.5, 0x000000, 3.5);

    const fade = document.getElementById('game-fade');
    if (fade) {
      // Force reflow so the transition fires
      fade.getBoundingClientRect();
      fade.classList.add('active');
    }

    setTimeout(() => {
      ctx.stateManager.resetState();
      window.location.reload();
    }, 3500);
  };

  ctx.registerActivation(() => {
    // Initial time/fog set by IslandLightingPresets (hour 19, dusk, red fog)
    ctx.puzzleManager.setActivePuzzle(tragedyPuzzle);
  });
}
