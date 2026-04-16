import * as THREE from 'three';
import { StaticObject } from './StaticObject';

export type RockType = 'normal' | 'mossy';

const ROCK_VARIATIONS: Record<RockType, number> = {
  normal: 6,
  mossy: 6
};

export default class Rock extends StaticObject {
  constructor(type: RockType, variationIndex?: number) {
    super();
    const maxVars = ROCK_VARIATIONS[type];
    const variation = variationIndex ?? (Math.floor(Math.random() * maxVars) + 1);
    this.modelPath = `models/rocks/rock_${type}_${variation}.glb`;
  }

  protected async onModelLoaded(model: THREE.Group): Promise<void> {
    // Normalizing scale for rocks, similar to foliage but with physics enabled
    model.scale.setScalar(0.01);

    // Enable shadows on all meshes within the rock model
    model.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    // Flush all transforms for accurate physics trimesh generation.
    this.mesh.updateWorldMatrix(true, true);

    // Register static trimesh colliders for this rock
    this.initPhysics();
  }
}
