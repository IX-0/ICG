import * as THREE from 'three';
import { IslandContext } from './IslandContext';
import { TragedyFindHoeStage, TragedyDigStage, TragedyFinalStage } from '../../puzzles/TragedyRitualPuzzle';
import { SequentialPuzzle } from '../../puzzles/SequentialPuzzle';

export function setupTragedyIsland(ctx: IslandContext): void {
  const spawnWithOffset = (pos: THREE.Vector3) => pos.clone().add(ctx.offset);
  const volcanicId = 'tragedy';

  // 1. Environment: Dark reddish sky
  ctx.lighting.setSunTime(19);
  ctx.lighting.addFog(0.04, 0x331111);

  // 2. Scenery
  for (let i = 0; i < 5; i++) {
    const rockPos = spawnWithOffset(new THREE.Vector3(-10 + Math.random() * 20, 0, -10 + Math.random() * 20));
    ctx.addStaticMesh(ctx.factory.createRock(rockPos, 2 + Math.random() * 2));
  }

  // 3. Props
  const hoe = ctx.factory.createGardeningHoe(spawnWithOffset(new THREE.Vector3(-2, 0.5, -2)), `prop_hoe_${volcanicId}`);
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
  const xSpot = new THREE.Vector3(5, 0.05, -5).add(ctx.platform.mesh.position);
  
  const tragedyPuzzle = new SequentialPuzzle('tragedy-ritual', [
    new TragedyFindHoeStage(hoe),
    new TragedyDigStage(hoe, xSpot, coffin),
    new TragedyFinalStage(coffin)
  ]);

  tragedyPuzzle.onAllStagesComplete = () => {
    console.log("THE TRAGEDY HAS ENDED. THE CYCLE IS BROKEN.");
    
    ctx.lighting.addFog(0.5, 0x000000); // Blackout
    
    setTimeout(() => {
      alert("The crown was but glass, the throne but wood. You have found your peace at last. Game Over.");
      ctx.stateManager.resetState();
      window.location.reload();
    }, 3000);
  };

  ctx.puzzleManager.setActivePuzzle(tragedyPuzzle);
}
