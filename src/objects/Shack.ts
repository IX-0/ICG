import * as THREE from 'three';
import { StaticObject } from './StaticObject';
import { createShackPlaceholder } from './placeholders/PlaceholderFactory';

export default class Shack extends StaticObject {
  private placeholder: THREE.Group;

  constructor() {
    super();
    // Swap: set modelPath to 'models/shack/shack.glb' when the asset arrives.
    this.modelPath = '';

    this.placeholder = createShackPlaceholder();
    this.mesh.add(this.placeholder);
    this.mesh.userData = { instance: this };
  }

  protected async onModelLoaded(model: THREE.Group): Promise<void> {
    this.mesh.remove(this.placeholder);
    model.scale.setScalar(1.0);
    model.traverse(c => { if ((c as THREE.Mesh).isMesh) { c.castShadow = true; c.receiveShadow = true; } });
  }
}
