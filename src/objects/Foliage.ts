import * as THREE from 'three';
import { StaticObject } from './StaticObject';

export type FoliageType = 'fern' | 'monstera' | 'banana';

const FOLIAGE_VARIATIONS: Record<FoliageType, number> = {
  fern: 3,
  monstera: 2,
  banana: 2
};

export default class Foliage extends StaticObject {
  constructor(type: FoliageType, variationIndex?: number) {
    super();
    this.hasPhysics = false;
    const maxVars = FOLIAGE_VARIATIONS[type];
    const variation = variationIndex ?? (Math.floor(Math.random() * maxVars) + 1);
    this.modelPath = `models/foliage/${type}_${variation}.glb`;
  }

  protected async onModelLoaded(model: THREE.Group): Promise<void> {

    model.scale.setScalar(0.01);

    // Foliage has no physics, purelly decorative
  }
}
