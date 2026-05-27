import * as THREE from 'three';
import { StaticObject } from './StaticObject';

export default class Boat extends StaticObject {
  constructor() {
    super();
    this.hasPhysics = true;
    this.modelPath = 'models/boat/row_boat.glb';
    this.mesh.userData = { instance: this };
    this.loadModel();
  }

  protected async onModelLoaded(model: THREE.Group): Promise<void> {
    model.scale.setScalar(1.0);
    model.traverse(c => { if ((c as THREE.Mesh).isMesh) { c.castShadow = true; c.receiveShadow = true; } });
  }

  public static animateArrival(
    scene: THREE.Scene,
    dockPos: THREE.Vector3,
    onArrived: () => void,
    onTick?: (pos: THREE.Vector3) => void
  ): Boat {
    const boat = new Boat();
    const startPos = dockPos.clone().add(new THREE.Vector3(0, 0, 40));
    boat.mesh.position.copy(startPos);
    boat.mesh.rotation.y = Math.PI;
    scene.add(boat.mesh);

    const DURATION = 4.0;
    let elapsed = 0;
    let last = performance.now();

    const tick = () => {
      const now = performance.now();
      elapsed += (now - last) / 1000;
      last = now;

      const t = Math.min(elapsed / DURATION, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      boat.mesh.position.lerpVectors(startPos, dockPos, ease);
      boat.mesh.position.y = dockPos.y + Math.sin(elapsed * 1.8) * 0.08;

      if (onTick) {
        onTick(boat.mesh.position);
      }

      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        boat.mesh.position.copy(dockPos);
        boat.initPhysics(); // Enable physics upon arrival so player can climb inside!
        onArrived();
      }
    };
    requestAnimationFrame(tick);

    return boat;
  }
}
