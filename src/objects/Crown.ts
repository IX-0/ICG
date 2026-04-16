import * as THREE from 'three';
import { Grabbable } from './Grabbable';
import { IPersistent } from '../interfaces/IPersistent';
import { IObjectState } from '../interfaces/IState';
import { physicsSystem } from '../engine/PhysicsSystem';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export default class Crown extends Grabbable implements IPersistent {
  public persistentId: string = '';
  private mirrorModel: THREE.Group | null = null;

  constructor() {
    super();
    this.modelPath = 'models/crown/crown.glb';
    
    this.holdPosition.set(0, -0.2, -0.6);
    this.holdRotation.set(-Math.PI / 4, 0, 0);
    this.placementYOffset = 0.2;

    this.mesh.userData = { grabbable: true, instance: this, type: 'crown' };
    this.loadModel();
  }

  protected async onModelLoaded(model: THREE.Group): Promise<void> {
    model.scale.set(0.01, 0.01, 0.01);
    
    // Normal Crown setup (Layer 0)
    model.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
            child.layers.set(0);
        }
    });

    // Load Mirror Crown (Layer 2)
    const loader = new GLTFLoader();
    loader.load('models/crown/crown_wood.glb', (gltf) => {
        this.mirrorModel = gltf.scene;
        this.mirrorModel.scale.set(0.01, 0.01, 0.01);
        this.mirrorModel.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
                child.layers.set(2); // Only visible to the Mirror camera
            }
        });
        this.mesh.add(this.mirrorModel);
    });
  }

  public saveState(): IObjectState {
    const worldPos = new THREE.Vector3();
    const worldQuat = new THREE.Quaternion();
    this.mesh.getWorldPosition(worldPos);
    this.mesh.getWorldQuaternion(worldQuat);
    const worldEuler = new THREE.Euler().setFromQuaternion(worldQuat);

    return {
      position: { x: worldPos.x, y: worldPos.y, z: worldPos.z },
      rotation: { x: worldEuler.x, y: worldEuler.y, z: worldEuler.z },
      isHeld: this.isHeld
    };
  }

  public loadState(state: IObjectState): void {
    this.mesh.position.set(state.position.x, state.position.y, state.position.z);
    this.mesh.rotation.set(state.rotation.x, state.rotation.y, state.rotation.z);
    this.isHeld = state.isHeld || false;
  }

  public initPhysics(): void {
    if (!physicsSystem.world) return;
    // Dimensions aligned with the model roughly (cylinder)
    const { body, collider } = physicsSystem.addDynamicPrimitive(this.mesh, { type: 'cylinder', size: [0.08, 0.2] });
    this.rigidBody = body;
    this.collider = collider;
  }

  public onUse(_target?: any): void {
    console.log("Using the crown...");
  }
}
