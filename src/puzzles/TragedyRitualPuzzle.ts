import * as THREE from 'three';
import { IPuzzleStage } from '../interfaces/IPuzzleStage';
import GardeningHoe from '../objects/GardeningHoe';
import Coffin from '../objects/Coffin';

/**
 * Stage 1: The Tools
 */
export class TragedyFindHoeStage implements IPuzzleStage {
  id = 'tragedy-find-hoe';
  description = 'The earth calls. Find the gardening hoe.';
  isCompleted = false;

  constructor(private hoe: GardeningHoe) {}

  onEnter() {}

  update(_dt: number) {
    if (this.hoe.isHeld) {
      this.isCompleted = true;
    }
  }

  onComplete() {}
}

/**
 * Stage 2: The Secret
 */
export class TragedyDigStage implements IPuzzleStage {
  id = 'tragedy-dig';
  description = 'Dig where the Red X marks the spot.';
  isCompleted = false;

  constructor(private hoe: GardeningHoe, private xSpot: THREE.Vector3, private coffin: Coffin) {}

  onEnter() {
    // Add a simple "dig" effect or just check position
  }

  update(_dt: number) {
    if (!this.hoe.isHeld) return;
    
    // Check distance between hoe and X spot
    const dist = this.hoe.mesh.getWorldPosition(new THREE.Vector3()).distanceTo(this.xSpot);
    if (dist < 1.0) {
      this.isCompleted = true;
    }
  }

  onComplete() {
    console.log("Tragedy: The coffin is revealed.");
    this.coffin.setVisible(true);
  }
}

/**
 * Stage 3: The End
 */
export class TragedyFinalStage implements IPuzzleStage {
  id = 'tragedy-end';
  description = 'Close the coffin. Let the past rest.';
  isCompleted = false;

  constructor(private coffin: Coffin) {}

  onEnter() {
    this.coffin.onClose = () => {
      this.isCompleted = true;
    };
  }

  update(_dt: number) {}

  onComplete() {
    console.log("Tragedy: The cycle ends.");
  }
}
