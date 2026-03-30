import { IPuzzleStage } from '../interfaces/IPuzzleStage';
import Mirror from '../objects/Mirror';

/**
 * Stage 1: The First Sight
 */
export class IsolationInquiryStage implements IPuzzleStage {
  id = 'isolation-inquiry';
  description = 'Something is wrong. Look in the mirror... find your crown.';
  isCompleted = false;

  constructor(private mirror: Mirror) {}

  onEnter() {
    this.mirror.onSeenLoss = () => {
      this.isCompleted = true;
    };
  }

  update(_dt: number) {
    if (this.mirror.getHasSeenLoss()) {
      this.isCompleted = true;
    }
  }
  
  onComplete() {}
}

/**
 * Stage 2: The Final Crack
 */
export class IsolationShatterStage implements IPuzzleStage {
  id = 'isolation-shatter';
  description = 'Illusion is a gilded cage. Shatter it with the crown.';
  isCompleted = false;

  constructor(private mirror: Mirror) {}

  onEnter() {
    this.mirror.onMirrorShatter = () => {
      this.isCompleted = true;
    };
  }

  update(_dt: number) {
    if (this.mirror.getIsBroken()) {
      this.isCompleted = true;
    }
  }

  onComplete() {
    console.log("Isolation: Reality restored.");
  }
}
