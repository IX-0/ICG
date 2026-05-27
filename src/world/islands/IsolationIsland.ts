import * as THREE from 'three';
import { IslandContext } from './IslandContext';
import { IsolationInquiryStage, IsolationShatterStage } from '../../puzzles/IsolationRitualPuzzle';
import { SequentialPuzzle } from '../../puzzles/SequentialPuzzle';
import TikiTorch from '../../objects/TikiTorch';
import { BaseIsland } from './BaseIsland';

class IsolationIsland extends BaseIsland {
  constructor(ctx: IslandContext) {
    super(ctx, 'isolation');
  }

  public setup(): void {
    // 1. Scenery and Props (No palms to create an isolated, bare rock feel)
    this.setupCommonScenery();
    this.setupCommonProps(false, 'prop_skeleton_isolation');

    const mirror = this.ctx.factory.createMirror(this.spawnWithOffset(new THREE.Vector3(-4.5, 1.4, -0.52)), `prop_mirror_${this.sharedIdPrefix}`);
    mirror.mesh.rotation.y = 0.0;
    this.ctx.loadObjectState(mirror);
    this.ctx.scene.add(mirror.mesh);
    this.ctx.addPuzzleObject(mirror);

    // 2. Puzzle Setup
    const isolationPuzzle = new SequentialPuzzle('isolation-ritual', [
      new IsolationInquiryStage(mirror),
      new IsolationShatterStage(mirror)
    ]);

    const spawnIsolationPortal = () => {
      this.spawnPortal(2, 0xffaa00, 0xff5500, () => {
        const gameEngine = (window as any).gameEngine;
        const holdsTorch = gameEngine?.player?.heldItem instanceof TikiTorch;
        if (!holdsTorch) {
          console.log("Isolation: You must carry a torch through the mist...");
          return false;
        }
        return true;
      });
    };

    isolationPuzzle.onAllStagesComplete = () => {
      console.log("THE MIRROR SHATTERS! Illusion broken.");
      this.ctx.stateManager.setFlag('isolation_puzzle_complete', true);
      this.ctx.lighting.addFog(0.15, 0x112233, 5.0);
      this.ctx.lighting.transitionTo({ sunHour: 22, durationSec: 5, onComplete: spawnIsolationPortal });
    };

    this.ctx.registerActivation(() => {
      const crownId = 'prop_crown_rise';
      let crown = this.ctx.puzzleObjects.find(o => (o as any).persistentId === crownId) as any;
      if (!crown) {
        crown = this.ctx.spawnCrown(crownId);
      }

      if (crown) {
        const game = (window as any).gameEngine;
        if (game && game.player && game.player.heldItem === crown) {
          console.log("Isolation: The crown slips from your grasp in the thick mist...");
          game.player.drop();
        }

        const spawnPos = new THREE.Vector3(5.2, 0.5, 5.2).add(this.ctx.platform.mesh.position);
        spawnPos.y += this.ctx.platform.config.height / 2;
        crown.mesh.position.copy(spawnPos);

        if (crown.rigidBody) {
          crown.rigidBody.setTranslation(crown.mesh.position, true);
        }
      }

      if (this.ctx.stateManager.getFlag('isolation_puzzle_complete')) {
        this.ctx.lighting.addFog(0.15, 0x112233, 0);
        this.ctx.lighting.transitionTo({ sunHour: 22, durationSec: 0.01 });
        spawnIsolationPortal();
        return;
      }

      this.ctx.puzzleManager.setActivePuzzle(isolationPuzzle);
      this.ctx.lighting.transitionTo({ sunHour: 22, durationSec: 12 });
    });
  }
}

export function setupIsolationIsland(ctx: IslandContext): void {
  new IsolationIsland(ctx).setup();
}
