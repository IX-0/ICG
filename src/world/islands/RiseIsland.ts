import * as THREE from 'three';
import { IslandContext } from './IslandContext';
import { RiseFindCrownStage, RiseThroneStage } from '../../puzzles/RiseRitualPuzzle';
import { SequentialPuzzle } from '../../puzzles/SequentialPuzzle';
import { PORTAL_CONFIG } from '../../config/PortalConfig';
import { BaseIsland } from './BaseIsland';

class RiseIsland extends BaseIsland {
  constructor(ctx: IslandContext) {
    const idx = ctx.platform.config.index;
    super(ctx, `rise_${idx}`);
  }

  public setup(): void {
    const idx = this.ctx.platform.config.index;
    const skeletonId = `prop_skeleton_rise_${idx}`;
    const crownId = `prop_crown_rise_${idx}`;
    const throneId = `prop_throne_rise_${idx}`;
    const flagKey = `rise_puzzle_complete_${idx}`;

    // 1. Scenery and Props
    this.setupCommonScenery();
    const { skeleton } = this.setupCommonProps(true, skeletonId);

    const throne = this.ctx.factory.createThrone(this.spawnWithOffset(new THREE.Vector3(-10.15, -0.2, 13.69)), throneId);
    throne.mesh.rotation.y = Math.PI / 4;
    this.ctx.loadObjectState(throne);
    this.ctx.scene.add(throne.mesh);
    this.ctx.addPuzzleObject(throne);

    // Decorative torch sockets flanking the throne (sockets for the ritual)
    this.sharedSocketPositions.forEach((pos, i) => {
      const socket = this.ctx.factory.createTorchSocket(this.spawnWithOffset(pos), i, `prop_torch_socket_rise_${idx}_${i}`);
      this.ctx.scene.add(socket.mesh);
      this.ctx.addPuzzleObject(socket);
    });

    // 2. Puzzle Setup
    const crownState = this.ctx.stateManager.getObjectState(crownId);
    const skeletonHasCrown = skeleton.getHasCrown();

    if (crownState || !skeletonHasCrown) {
      this.ctx.spawnCrown(crownId);
    }

    const findCrownStage = new RiseFindCrownStage(skeleton);
    const risePuzzle = new SequentialPuzzle(`rise-ritual-${idx}`, [
      findCrownStage,
      new RiseThroneStage(throne)
    ]);

    skeleton.onInteractTakeCrown = () => {
      let crown = this.ctx.puzzleObjects.find(o => (o as any).persistentId === crownId) as any;
      if (!crown) {
        const spawnPos = new THREE.Vector3(5.2, 0.5, 5.2).add(this.ctx.platform.mesh.position);
        spawnPos.y += this.ctx.platform.config.height / 2;
        crown = this.ctx.spawnCrown(crownId, spawnPos);
        this.ctx.stateManager.updateObjectState(crownId, crown.saveState());
      }
      const player = (window as any).gameEngine?.player;
      if (player && crown) {
        player.grab(crown);
        this.ctx.interaction.unregisterInteractive(crown.mesh);
      }
      this.ctx.stateManager.updateObjectState(skeleton.persistentId, skeleton.saveState());
      findCrownStage.isCompleted = true;
    };

    const nextIndex = idx + 1;
    const spawnRisePortal = () => {
      this.spawnPortal(nextIndex, PORTAL_CONFIG.colorA, PORTAL_CONFIG.colorB);
    };

    risePuzzle.onAllStagesComplete = () => {
      console.log(`Rise Sequence complete for island ${idx}!`);
      this.ctx.stateManager.setFlag(flagKey, true);

      const crownObj = this.ctx.puzzleObjects.find(o => (o as any).persistentId === crownId);
      if (crownObj) {
        this.ctx.scene.remove(crownObj.mesh);
        this.ctx.removePuzzleObject(crownObj);
      }

      if (idx === 3) {
        console.log("THE CYCLE IS COMPLETE.");
        this.ctx.lighting.addFog(0.5, 0x000000, 3.5);
        const fade = document.getElementById('game-fade');
        if (fade) {
          fade.getBoundingClientRect();
          fade.classList.add('active');
        }
        setTimeout(() => {
          this.ctx.stateManager.resetState();
          window.location.reload();
        }, 3500);
      } else {
        this.ctx.lighting.addFog(0.15, 0x556677, 5.0);
        setTimeout(spawnRisePortal, 2000);
      }
    };

    this.ctx.registerActivation(() => {
      if (this.ctx.stateManager.getFlag(flagKey)) {
        this.ctx.lighting.addFog(0.15, 0x556677, 0);
        const crownObj = this.ctx.puzzleObjects.find(o => (o as any).persistentId === crownId);
        if (crownObj) {
          this.ctx.scene.remove(crownObj.mesh);
          this.ctx.removePuzzleObject(crownObj);
        }
        if (idx < 3) {
          spawnRisePortal();
        }
        return;
      }

      throne.setHasCrown(false);
      this.ctx.puzzleManager.setActivePuzzle(risePuzzle);
    });
  }
}

export function setupRiseIsland(ctx: IslandContext): void {
  new RiseIsland(ctx).setup();
}
