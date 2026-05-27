import * as THREE from 'three';
import { IslandContext } from './IslandContext';
import { ReturnGatheringStage, ReturnRiteStage } from '../../puzzles/ReturnRitualPuzzle';
import { SequentialPuzzle } from '../../puzzles/SequentialPuzzle';
import { BaseIsland } from './BaseIsland';

class ReturnIsland extends BaseIsland {
  constructor(ctx: IslandContext) {
    super(ctx, 'return');
  }

  public setup(): void {
    // 1. Scenery and Props
    this.setupCommonScenery();
    const { skeleton } = this.setupCommonProps(false, 'prop_skeleton_global');

    const throne = this.ctx.factory.createThrone(this.spawnWithOffset(new THREE.Vector3(-10.15, -0.2, 13.69)), `prop_throne_${this.sharedIdPrefix}`);
    throne.mesh.rotation.y = Math.PI / 4;
    this.ctx.loadObjectState(throne);
    this.ctx.scene.add(throne.mesh);
    this.ctx.addPuzzleObject(throne);

    // 2. Trigger Zones + TorchSocket visuals flanking the ritual area
    const socketPositions = this.sharedSocketPositions;

    const zones = socketPositions.map((pos, i) => {
      const socket = this.ctx.factory.createTorchSocket(
        this.spawnWithOffset(pos),
        i,
        `prop_torch_socket_return_${i}`
      );
      this.ctx.loadObjectState(socket);
      this.ctx.scene.add(socket.mesh);
      this.ctx.addPuzzleObject(socket);

      return this.ctx.factory.createTriggerZone(this.spawnWithOffset(pos.clone().add(new THREE.Vector3(0, 1, 0))), 2.0, 0x00ffaa);
    });

    zones.forEach(z => {
      this.ctx.scene.add(z.mesh);
      this.ctx.activeZones.push(z);
    });

    // 3. Puzzle Setup
    const returnPuzzle = new SequentialPuzzle('return-ritual', [
      new ReturnGatheringStage(zones),
      new ReturnRiteStage(zones)
    ]);

    const spawnReturnPortal = () => {
      this.spawnPortal(3, 0xff0000, 0xffaa00);
    };

    returnPuzzle.onAllStagesComplete = () => {
      console.log('4 Lit Torches in Sockets! Return Ritual Complete!');
      this.ctx.stateManager.setFlag('return_puzzle_complete', true);
      if (throne) {
        this.ctx.scene.remove(throne.mesh);
      }
      setTimeout(spawnReturnPortal, 1500);
    };

    this.ctx.registerActivation(() => {
      if (this.ctx.stateManager.getFlag('return_puzzle_complete')) {
        if (throne) {
          this.ctx.scene.remove(throne.mesh);
        }
        spawnReturnPortal();
        return;
      }

      this.ctx.puzzleManager.setActivePuzzle(returnPuzzle);
    });
  }
}

export function setupReturnIsland(ctx: IslandContext): void {
  new ReturnIsland(ctx).setup();
}
