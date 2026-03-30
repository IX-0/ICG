import { IPuzzleStage } from '../interfaces/IPuzzleStage';
import TriggerZone from '../world/TriggerZone';
import TikiTorch from '../objects/TikiTorch';

/**
 * Stage 1: The Gathering
 */
export class ReturnGatheringStage implements IPuzzleStage {
  id = 'return-gathering';
  description = 'Collect four torches to reclaim the ritual ground.';
  isCompleted = false;

  constructor(private zones: TriggerZone[]) {}

  onEnter() {}

  update(_dt: number) {
    // Check if every zone has at least one TikiTorch
    const filledZones = this.zones.filter(zone => 
      zone.detectedObjects.some(obj => (obj.userData?.instance instanceof TikiTorch))
    );

    if (filledZones.length >= 4) {
      this.isCompleted = true;
    }
  }

  onComplete() {}
}

/**
 * Stage 2: The Final Rite
 */
export class ReturnRiteStage implements IPuzzleStage {
  id = 'return-rite';
  description = 'Light the pathway... ignite your future.';
  isCompleted = false;

  constructor(private zones: TriggerZone[]) {}

  onEnter() {}

  update(_dt: number) {
    const litZones = this.zones.filter(zone => {
      const torch = zone.detectedObjects.find(obj => (obj.userData?.instance instanceof TikiTorch));
      return torch && (torch.userData.instance as TikiTorch).getIsLit();
    });

    if (litZones.length >= 4) {
      this.isCompleted = true;
    }
  }

  onComplete() {}
}
