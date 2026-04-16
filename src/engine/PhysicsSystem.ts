import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { IUpdatable } from '../interfaces/IUpdatable';
import { PHYSICS_CONFIG } from '../config/PhysicsConfig';

/** Half-extents for a box: [hx, hy, hz]. */
export type BoxHalfExtents = [number, number, number];
/** Cylinder size: [halfHeight, radius]. */
export type CylinderSize = [number, number];
/** Sphere size: [radius]. */
export type SphereSize = [number];

export type PrimitiveShape =
  | { type: 'box';      size: BoxHalfExtents }
  | { type: 'cylinder'; size: CylinderSize }
  | { type: 'sphere';   size: SphereSize };

export class PhysicsSystem implements IUpdatable {
  public world!: RAPIER.World;
  private isInitialized: boolean = false;

  public async init(): Promise<void> {
    await RAPIER.init();
    this.world = new RAPIER.World({ x: 0, y: -PHYSICS_CONFIG.gravity, z: 0 });
    this.isInitialized = true;
  }

  public update(dt: number): void {
    if (!this.isInitialized) return;
    this.world.timestep = dt;
    this.world.step();
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  /**
   * Flush the full parent chain before sampling matrixWorld.
   * `updateMatrixWorld(true)` only goes downward; this also walks UP.
   */
  private static flushWorldMatrix(obj: THREE.Object3D): void {
    obj.updateWorldMatrix(true, false);
  }

  /** Build index array for non-indexed geometry. */
  private static buildIndices(localPositions: Float32Array): Uint32Array {
    const count = localPositions.length / 3;
    const arr = new Uint32Array(count);
    for (let i = 0; i < count; i++) arr[i] = i;
    return arr;
  }

  private static getIndices(geometry: THREE.BufferGeometry): Uint32Array {
    if (geometry.index) return new Uint32Array(geometry.index.array);
    
    // If not indexed, build indices based on position attribute COUNT
    const count = geometry.attributes.position.count;
    const arr = new Uint32Array(count);
    for (let i = 0; i < count; i++) {
        arr[i] = i;
    }
    return arr;
  }

  // ── Static trimesh ─────────────────────────────────────────────────────────

  /**
   * Creates a fixed trimesh collider whose vertices are baked to world space.
   * The rigid body lives at origin — all transforms are embedded in the vertices.
   * Use for static geometry that never moves.
   */
  public addStaticTrimesh(mesh: THREE.Mesh): RAPIER.Collider {
    PhysicsSystem.flushWorldMatrix(mesh);

    const positionAttr = mesh.geometry.attributes.position;
    const worldPositions = new Float32Array(positionAttr.count * 3);
    const v = new THREE.Vector3();

    for (let i = 0; i < positionAttr.count; i++) {
      v.fromBufferAttribute(positionAttr, i).applyMatrix4(mesh.matrixWorld);
      worldPositions[i * 3]     = v.x;
      worldPositions[i * 3 + 1] = v.y;
      worldPositions[i * 3 + 2] = v.z;
    }

    const body = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.fixed().setTranslation(0, 0, 0)
    );
    const colliderDesc = RAPIER.ColliderDesc.trimesh(
      worldPositions,
      PhysicsSystem.getIndices(mesh.geometry)
    );
    return this.world.createCollider(colliderDesc, body);
  }

  // ── Kinematic trimesh ──────────────────────────────────────────────────────

  /**
   * Creates a kinematic trimesh collider for an animated mesh.
   * Geometry is stored in the body's local space (scaled but not rotated/translated).
   * Call `updateKinematicBodyPose()` every frame to follow the mesh's movement.
   */
  public addKinematicTrimesh(mesh: THREE.Mesh): { body: RAPIER.RigidBody; collider: RAPIER.Collider } {
    PhysicsSystem.flushWorldMatrix(mesh);

    const worldPos = new THREE.Vector3();
    const worldQuat = new THREE.Quaternion();
    const worldScale = new THREE.Vector3();
    mesh.matrixWorld.decompose(worldPos, worldQuat, worldScale);

    const positionAttr = mesh.geometry.attributes.position;
    const scaledPositions = new Float32Array(positionAttr.count * 3);
    const v = new THREE.Vector3();

    for (let i = 0; i < positionAttr.count; i++) {
      v.fromBufferAttribute(positionAttr, i);
      scaledPositions[i * 3]     = v.x * worldScale.x;
      scaledPositions[i * 3 + 1] = v.y * worldScale.y;
      scaledPositions[i * 3 + 2] = v.z * worldScale.z;
    }

    const body = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.kinematicPositionBased()
        .setTranslation(worldPos.x, worldPos.y, worldPos.z)
        .setRotation(worldQuat)
    );
    const colliderDesc = RAPIER.ColliderDesc
      .trimesh(scaledPositions, PhysicsSystem.getIndices(mesh.geometry))
      .setFriction(PHYSICS_CONFIG.friction);
    const collider = this.world.createCollider(colliderDesc, body);

    return { body, collider };
  }

  /**
   * Pushes the mesh's current world transform into a kinematic rigid body.
   * Call this every frame after the AnimationMixer has advanced.
   */
  public updateKinematicBodyPose(body: RAPIER.RigidBody, mesh: THREE.Object3D): void {
    PhysicsSystem.flushWorldMatrix(mesh);
    const pos = mesh.getWorldPosition(new THREE.Vector3());
    const rot = mesh.getWorldQuaternion(new THREE.Quaternion());
    body.setNextKinematicTranslation({ x: pos.x, y: pos.y, z: pos.z });
    body.setNextKinematicRotation({ x: rot.x, y: rot.y, z: rot.z, w: rot.w });
  }

  // ── Primitive colliders ────────────────────────────────────────────────────

  /**
   * Creates a fixed rigid body with a primitive collider (box / cylinder / sphere).
   * `shape` is a discriminated union so callers get type-checked size arrays.
   */
  public addFixedPrimitive(
    anchor: THREE.Object3D,
    shape: PrimitiveShape
  ): { body: RAPIER.RigidBody; collider: RAPIER.Collider } {
    PhysicsSystem.flushWorldMatrix(anchor);
    const pos = anchor.getWorldPosition(new THREE.Vector3());
    const rot = anchor.getWorldQuaternion(new THREE.Quaternion());

    const body = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.fixed().setTranslation(pos.x, pos.y, pos.z).setRotation(rot)
    );
    const collider = this.world.createCollider(
      PhysicsSystem.buildPrimitiveDesc(shape).setFriction(PHYSICS_CONFIG.friction),
      body
    );
    return { body, collider };
  }

  /**
   * Creates a dynamic rigid body with a primitive collider.
   * Applies standard damping so objects stabilise after being dropped.
   */
  public addDynamicPrimitive(
    anchor: THREE.Object3D,
    shape: PrimitiveShape
  ): { body: RAPIER.RigidBody; collider: RAPIER.Collider } {
    PhysicsSystem.flushWorldMatrix(anchor);
    const pos = anchor.getWorldPosition(new THREE.Vector3());
    const rot = anchor.getWorldQuaternion(new THREE.Quaternion());

    const body = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic().setTranslation(pos.x, pos.y, pos.z).setRotation(rot)
    );
    body.setLinearDamping(0.5);
    body.setAngularDamping(1.0);

    const collider = this.world.createCollider(
      PhysicsSystem.buildPrimitiveDesc(shape)
        .setFriction(PHYSICS_CONFIG.friction)
        .setRestitution(0.1),
      body
    );
    return { body, collider };
  }

  private static buildPrimitiveDesc(shape: PrimitiveShape): RAPIER.ColliderDesc {
    switch (shape.type) {
      case 'box':      return RAPIER.ColliderDesc.cuboid(...shape.size);
      case 'cylinder': return RAPIER.ColliderDesc.cylinder(...shape.size);
      case 'sphere':   return RAPIER.ColliderDesc.ball(shape.size[0]);
    }
  }

  // ── Cleanup ────────────────────────────────────────────────────────────────

  public removeBody(body: RAPIER.RigidBody): void {
    if (this.world) this.world.removeRigidBody(body);
  }

  public removeCollider(collider: RAPIER.Collider): void {
    if (this.world) this.world.removeCollider(collider, false);
  }
}

export const physicsSystem = new PhysicsSystem();
