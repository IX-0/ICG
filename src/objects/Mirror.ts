import * as THREE from 'three';
import { Interactable } from './Interactable';
import Player from '../player/Player';
import { IGrabbable } from '../interfaces/IGrabbable';
import { physicsSystem } from '../engine/PhysicsSystem';
// @ts-ignore
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';

export default class Mirror extends Interactable {
  public mesh: THREE.Group;
  public persistentId: string;
  public onMirrorShatter: (() => void) | null = null;
  public onSeenLoss: (() => void) | null = null;

  private isBroken: boolean = false;
  private hasSeenLoss: boolean = false;

  constructor(persistentId: string = '') {
    super();
    this.persistentId = persistentId;
    this.mesh = new THREE.Group();

    // Frame
    const frameGeo = new THREE.BoxGeometry(1.2, 1.8, 0.1);
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.9, roughness: 0.1 });
    const frame = new THREE.Mesh(frameGeo, goldMat);
    this.mesh.add(frame);

    // Glass/Surface (Now with Real Reflection)
    const glassGeo = new THREE.PlaneGeometry(1.0, 1.6);
    const mirror = new Reflector(glassGeo, {
      clipBias: 0.003,
      textureWidth: window.innerWidth * window.devicePixelRatio,
      textureHeight: window.innerHeight * window.devicePixelRatio,
      color: 0x889999
    });
    mirror.position.z = 0.06;
    this.mesh.add(mirror);
    (this as any).mirrorMesh = mirror;

    // Stand
    const standGeo = new THREE.CylinderGeometry(0.1, 0.2, 1, 8);
    const stand = new THREE.Mesh(standGeo, goldMat);
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

  public getHasSeenLoss(): boolean {
    return this.hasSeenLoss;
  }

  public getIsBroken(): boolean {
    return this.isBroken;
  }

  public update(_dt: number): void {
    // Maybe some subtle shimmer on the glass
  }
}
