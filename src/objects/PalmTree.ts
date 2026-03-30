import * as THREE from 'three';
import { StaticObject } from './StaticObject';

export default class PalmTree extends StaticObject {
  constructor(variationIndex?: number) {
    super();
    const variation = variationIndex ?? (Math.floor(Math.random() * 3) + 1);
    this.modelPath = `models/foliage/palm_tree_${variation}.glb`;
  }

  protected async onModelLoaded(model: THREE.Group): Promise<void> {

    model.scale.setScalar(0.01);

    this.initPhysics();
  }
}
