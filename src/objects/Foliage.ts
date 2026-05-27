import * as THREE from 'three';
import { StaticObject } from './StaticObject';

export type FoliageType = 'fern' | 'monstera' | 'banana';

const FOLIAGE_VARIATIONS: Record<FoliageType, number> = {
  fern: 3,
  monstera: 2,
  banana: 2
};

export default class Foliage extends StaticObject {
  private type: FoliageType;
  private static foliageCounter = 0;

  constructor(type: FoliageType, variationIndex?: number) {
    super();
    this.type = type;
    this.hasPhysics = false;
    const maxVars = FOLIAGE_VARIATIONS[type];
    const variation = variationIndex ?? ((Foliage.foliageCounter++ % maxVars) + 1);
    this.modelPath = `models/foliage/${type}_${variation}.glb`;
  }

  protected async onModelLoaded(model: THREE.Group): Promise<void> {
    const scale = (this.type === 'monstera' || this.type === 'banana') ? 0.0067 : 0.01;
    model.scale.setScalar(scale);

    model.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

  }
}
