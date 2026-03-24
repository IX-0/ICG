import * as THREE from 'three';
import PlatformFactory, { PlatformConfig } from '../platforms/PlatformFactory';
import GameState from '../state/GameState';

export default class PlatformManager {
  scene: THREE.Scene;
  gameState: GameState;
  factory: PlatformFactory;
  activePlatforms: THREE.Object3D[] = [];

  constructor(scene: THREE.Scene, gameState: GameState) {
    this.scene = scene;
    this.gameState = gameState;
    this.factory = new PlatformFactory();
  }

  createPlatform(platformIndex: number) {
    if (platformIndex < 0 || platformIndex >= 9) {
      console.error(`Invalid platform index: ${platformIndex}`);
      return null;
    }

    const typeIndex = platformIndex % 3;
    const variationIndex = Math.floor(platformIndex / 3);

    const platformConfig: PlatformConfig = {
      index: platformIndex,
      type: (['gravel', 'sand', 'volcanic'] as const)[typeIndex],
      variation: variationIndex,
      size: 22,
      height: 0.5,
    };

    // runtime stub: create a simple box as platform and a button object
    const platformMesh = this.factory.createPlatformMesh(platformConfig);
    this.scene.add(platformMesh);
    this.activePlatforms.push(platformMesh);

    const props = this.factory.createProps(platformConfig) || [];
    props.forEach((p) => {
      this.scene.add(p);
      this.activePlatforms.push(p);
    });

    const button = this.factory.createButton(platformConfig);
    button.userData = { interactive: true, type: 'button' };
    this.scene.add(button);
    this.activePlatforms.push(button);

    return { mesh: platformMesh, props, button, config: platformConfig };
  }

  clearPlatforms() {
    this.activePlatforms.forEach((obj) => {
      this.scene.remove(obj);
      // dispose geometry/material if present
      const anyObj: any = obj;
      if (anyObj.geometry) anyObj.geometry.dispose();
      if (anyObj.material) {
        if (Array.isArray(anyObj.material)) anyObj.material.forEach((m: any) => m.dispose());
        else anyObj.material.dispose();
      }
    });
    this.activePlatforms = [];
  }

  getActivePlatform(): THREE.Object3D | null {
    return this.activePlatforms.length > 0 ? this.activePlatforms[0] : null;
  }

  getInteractiveObjects(): THREE.Object3D[] {
    return this.activePlatforms.filter((obj) => (obj as any).userData?.interactive === true);
  }
}
