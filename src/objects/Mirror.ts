import * as THREE from 'three';
import { Interactable } from './Interactable';
import Player from '../player/Player';
import { IGrabbable } from '../interfaces/IGrabbable';
import { IPersistent } from '../interfaces/IPersistent';
import { IObjectState } from '../interfaces/IState';
import { physicsSystem } from '../engine/PhysicsSystem';
import { createMirrorFramePlaceholder } from './placeholders/PlaceholderFactory';
import { audioManager } from '../engine/AudioManager';
// @ts-ignore
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';

export default class Mirror extends Interactable implements IPersistent {
  public mesh: THREE.Group;
  public persistentId: string;
  public objectType: string = 'mirror';
  public onMirrorShatter: (() => void) | null = null;
  public onSeenLoss: (() => void) | null = null;

  private isBroken: boolean = false;
  private hasSeenLoss: boolean = false;

  constructor(persistentId: string = '') {
    super();
    this.persistentId = persistentId;
    this.mesh = new THREE.Group();

    // Frame — 4 border pieces around the reflector
    const frame = createMirrorFramePlaceholder(1.0, 1.6);
    this.mesh.add(frame);

    // Glass/Surface (Now with Real Reflection)
    const glassGeo = new THREE.PlaneGeometry(1.0, 1.6);
    const mirror = new Reflector(glassGeo, {
      clipBias: 0.003,
      textureWidth: 512,
      textureHeight: 512,
      color: 0x889999
    });

    // Guard against recursive/nested reflection rendering (e.g. within water reflections or portals)
    // which corrupts the WebGL state and leads to black shadow/horizon artifacts.
    const originalOnBeforeRender = mirror.onBeforeRender;
    const currentViewport = new THREE.Vector4();
    mirror.onBeforeRender = function (renderer: any, scene: any, camera: any, ...args: any[]) {
      const mainCamera = (window as any).gameEngine?.camera;
      if (mainCamera && camera !== mainCamera) {
        return;
      }
      if (scene.overrideMaterial) {
        return; // Don't render reflections during depth/shadow override passes
      }
      
      const currentShadowAutoUpdate = renderer.shadowMap.autoUpdate;
      renderer.shadowMap.autoUpdate = false;

      renderer.getViewport(currentViewport);
      (originalOnBeforeRender as any).call(this, renderer, scene, camera, ...args);
      renderer.setViewport(currentViewport.x, currentViewport.y, currentViewport.z, currentViewport.w);

      renderer.shadowMap.autoUpdate = currentShadowAutoUpdate;
    };

    mirror.position.z = 0.06;
    this.mesh.add(mirror);
    (this as any).mirrorMesh = mirror;

    // Stand
    const standMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.9, roughness: 0.1 });
    const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.2, 1, 8), standMat);
    stand.position.y = -1.4;
    this.mesh.add(stand);

    this.mesh.userData = { interactable: true, instance: this };
  }

  public initPhysics(): void {
    if (!physicsSystem.world) return;
    // Exactly matches the 1.2x1.8x0.1 frame
    physicsSystem.addFixedPrimitive(this.mesh, { type: 'box', size: [0.6, 0.9, 0.05] }); 
  }

  public onInteract(_player: Player, heldItem: IGrabbable | null): void {
    if (this.isBroken) return;

    const isCrown = heldItem && (heldItem as any).mesh.userData?.type === 'crown';

    if (isCrown) {
      console.log("Mirror: The reflection... the crown is made of cardboard!");
      if (this.onMirrorShatter) {
        this.isBroken = true;
        if ((this as any).mirrorMesh) (this as any).mirrorMesh.visible = false;
        audioManager.play('mirror-shatter');
        this.onMirrorShatter();
      }
    } else {
      if (!this.hasSeenLoss) {
        console.log("Mirror: I look different... where is my crown?");
        this.hasSeenLoss = true;
        if (this.onSeenLoss) this.onSeenLoss();
      } else {
        console.log("Mirror: I must find what I've lost.");
      }
    }
  }

  public saveState(): IObjectState {
    const state = this.savePose(this.objectType);
    state.metadata = { isBroken: this.isBroken, hasSeenLoss: this.hasSeenLoss };
    return state;
  }

  public loadState(state: IObjectState): void {
    this.loadPose(state);
    if (state.metadata) {
      this.hasSeenLoss = !!state.metadata.hasSeenLoss;
      if (state.metadata.isBroken) {
        this.isBroken = true;
        if ((this as any).mirrorMesh) (this as any).mirrorMesh.visible = false;
      }
    }
  }

  public getHasSeenLoss(): boolean {
    return this.hasSeenLoss;
  }

  public getIsBroken(): boolean {
    return this.isBroken;
  }

  public update(_dt: number): void {
    if (this.isBroken) return;
    const mirrorMesh = (this as any).mirrorMesh as THREE.Object3D;
    if (!mirrorMesh) return;
    const cam = (window as any).gameEngine?.camera as THREE.Camera;
    if (!cam) return;
    const dist = cam.position.distanceTo(this.mesh.position);
    mirrorMesh.visible = dist < 20;
  }
}
