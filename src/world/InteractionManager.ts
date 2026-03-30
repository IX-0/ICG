import * as THREE from 'three';

/** Result of resolving an interactable from a raycast hit. */
export interface ResolvedInteractable {
  /** The instance stored in userData (Interactable / Grabbable subclass). */
  instance: any;
  /** The Object3D node whose userData.interactable was truthy. */
  object: THREE.Object3D;
}

export default class InteractionManager {
  private readonly camera: THREE.Camera;
  private readonly raycaster: THREE.Raycaster;
  public interactiveObjects: THREE.Object3D[] = [];

  constructor(camera: THREE.Camera) {
    this.camera = camera;
    this.raycaster = new THREE.Raycaster();
    this.raycaster.near = 0.1;
    this.raycaster.far = 5; // interaction range in metres
  }

  public registerInteractive(object: THREE.Object3D): void {
    if (!this.interactiveObjects.includes(object)) {
      this.interactiveObjects.push(object);
    }
  }

  public unregisterInteractive(object: THREE.Object3D): void {
    this.interactiveObjects = this.interactiveObjects.filter(o => o !== object);
  }

  public clearInteractives(): void {
    this.interactiveObjects = [];
  }

  /** Cast a ray from position in direction, return closest hit. */
  public raycast(position: THREE.Vector3, direction: THREE.Vector3): THREE.Intersection | null {
    this.raycaster.set(position, direction.clone().normalize());
    const hits = this.raycaster.intersectObjects(this.interactiveObjects, true);
    return hits.length > 0 ? hits[0] : null;
  }

  /** Raycast from the camera centre forward. */
  public raycastFromCamera(): THREE.Intersection | null {
    const dir = new THREE.Vector3();
    const pos = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    this.camera.getWorldPosition(pos);
    return this.raycast(pos, dir);
  }

  /**
   * Given a raycast hit, walks the parent chain to find the first Object3D
   * with `userData.interactable === true` and returns the resolved instance.
   * Returns null if no interactable is found in the hierarchy.
   */
  public resolveInteractable(hit: THREE.Intersection): ResolvedInteractable | null {
    let obj: THREE.Object3D | null = hit.object;
    while (obj) {
      if (obj.userData?.interactable && obj.userData.instance) {
        return { instance: obj.userData.instance, object: obj };
      }
      obj = obj.parent;
    }
    return null;
  }

  /** @deprecated Use raycastFromCamera() + resolveInteractable() instead. */
  public raycastSphere(_position: THREE.Vector3, _radius: number, objects: THREE.Object3D[]): THREE.Object3D | null {
    return objects.length > 0 ? objects[0] : null;
  }

  public getObjectsWithinRange(position: THREE.Vector3, range: number, objects: THREE.Object3D[]): THREE.Object3D[] {
    return objects.filter(obj => obj.position.distanceTo(position) <= range);
  }
}

