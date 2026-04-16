import { IPuzzleStage } from '../interfaces/IPuzzleStage';
import Skeleton from '../objects/Skeleton';
import Throne from '../objects/Throne';
import Crown from '../objects/Crown';

/**
 * Stage 1: Find the Crown
 */
export class RiseFindCrownStage implements IPuzzleStage {
  id = 'rise-find-crown';
  description = 'The King is dead. Find his Crown near the bones.';
  isCompleted = false;

  constructor(private skeleton: Skeleton) {}

  onEnter() {
    // No longer overwriting onInteractTakeCrown to prevent breaking island-specific logic
  }

  update(_dt: number) {
    if (this.skeleton.getIsBones()) {
      this.isCompleted = true;
    }
  }
  
  onComplete() {
    console.log("Rise: Crown retrieved!");
  }
}

/**
 * Stage 2: The Royal Rite
 */
export class RiseThroneStage implements IPuzzleStage {
  id = 'rise-throne-rite';
  description = 'Reclaim your power. Place the Crown on the Throne.';
  isCompleted = false;

  constructor(private throne: Throne) {}

  onEnter() {
    this.throne.onCrownPlaced = () => {
      this.isCompleted = true;
    };
  }

  update(_dt: number) {
    if (this.throne.getHasCrown()) {
      this.isCompleted = true;
    }
  }

  onComplete() {
    console.log("Rise: Sequence complete! The path forward is revealed.");
  }
}
