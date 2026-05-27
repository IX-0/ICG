import * as THREE from 'three';
import { IslandContext } from './IslandContext';
import { PORTAL_CONFIG } from '../../config/PortalConfig';
import { WORLD_CONFIG } from '../../config/WorldConfig';
import Dock from '../../objects/Dock';
import RAPIER from '@dimforge/rapier3d-compat';
import { physicsSystem } from '../../engine/PhysicsSystem';

export abstract class BaseIsland {
  protected ctx: IslandContext;
  protected sharedIdPrefix: string;

  constructor(ctx: IslandContext, sharedIdPrefix: string) {
    this.ctx = ctx;
    this.sharedIdPrefix = sharedIdPrefix;
  }

  protected spawnWithOffset(pos: THREE.Vector3): THREE.Vector3 {
    return pos.clone().add(this.ctx.offset);
  }

  public get sharedSocketPositions(): THREE.Vector3[] {
    return [
      new THREE.Vector3(-13.31, -0.1, 10.46),
      new THREE.Vector3(-12.4, -0.1, 19.2),
      new THREE.Vector3(-7.06, -0.1, 19.29),
      new THREE.Vector3(1.69, -0.25, 2.66)
    ];
  }

  protected setupCommonScenery(): void {
    // Spawn a wooden dock next to where the boat will park (rotated 90 degrees to face +X)
    const dockObj = new Dock();
    dockObj.mesh.rotation.y = -Math.PI / 2;
    dockObj.mesh.position.set(-11.0, -0.2, -1.8).add(this.ctx.offset);
    this.ctx.scene.add(dockObj.mesh);
    this.ctx.addPuzzleObject(dockObj);

    // ==========================================
    // DEBUG HELPER FOR DOCK (Yellow)
    // ==========================================
    const dockHelper = new THREE.BoxHelper(dockObj.mesh, 0xffff00);
    this.ctx.scene.add(dockHelper);
    // ==========================================

    this.setupPlayableAreaBarrier();

    // Spawn 17 palm trees with different variants and rotations
    const palmConfigs = [
      { x: -7.80, z: 24.40, variation: 1, rotation: 0.5 },
      { x: -9.40, z: 25.00, variation: 2, rotation: 2.1 },
      { x: -11.50, z: 22.60, variation: 3, rotation: 4.3 },
      { x: -7.86, z: 14.60, variation: 1, rotation: 5.7, noFoliage: true },
      // 7 new trees at X = -13.2 distributed along Z from -25 to 10
      { x: -13.20, z: -25.00, variation: 1, rotation: 0.2 },
      { x: -13.20, z: -19.00, variation: 2, rotation: 1.1 },
      { x: -13.20, z: -13.00, variation: 3, rotation: 2.5 },
      { x: -10.20, z: -7.00, variation: 1, rotation: 3.8 },
      { x: -12.70, z: -1.00, variation: 2, rotation: 4.9 },
      { x: -13.20, z: 5.00, variation: 3, rotation: 0.8 },
      { x: -13.20, z: 10.00, variation: 1, rotation: 2.2 },
      // 6 new user-placed trees via Editor
      { x: -12.60, z: -32.49, variation: 1, rotation: 0.4 },
      { x: -6.39, z: -33.84, variation: 2, rotation: 1.8, noFoliage: true },
      { x: -10.30, z: -38.32, variation: 3, rotation: 3.2 },
      { x: -9.07, z: -42.24, variation: 1, rotation: 4.5 },
      { x: -6.49, z: -48.15, variation: 2, rotation: 5.8 },
      { x: -5.03, z: -23.77, variation: 3, rotation: 1.2, noFoliage: true }
    ];

    const foliageTypes: ('fern' | 'monstera' | 'banana')[] = ['fern', 'monstera', 'banana'];

    palmConfigs.forEach((cfg, index) => {
      const pos = new THREE.Vector3(cfg.x, -0.2, cfg.z).add(this.ctx.offset);

      // Palm Tree
      const palm = this.ctx.factory.createPalmTree(pos, cfg.variation);
      palm.mesh.rotation.y = cfg.rotation;
      palm.loadModel();
      this.ctx.scene.add(palm.mesh);
      this.ctx.addPuzzleObject(palm);

      // Foliage/Fern at the base
      if (!cfg.noFoliage) {
        const foliageType = foliageTypes[index % foliageTypes.length];
        const foliage = this.ctx.factory.createFoliage(foliageType, pos);
        foliage.mesh.rotation.y = cfg.rotation + Math.PI / 4;
        foliage.loadModel();
        this.ctx.scene.add(foliage.mesh);
        this.ctx.addPuzzleObject(foliage);
      }
    });
  }

  protected setupPlayableAreaBarrier(): void {
    if (!physicsSystem.world) return;

    // Bounding box vertices from -15, 20, 28 to 11, 10, -50.
    // Note: We use minY = -10 instead of 10 so the player (spawning at Y=2.2 and standing on sand at Y=-1.2)
    // is safely enclosed inside the bounds instead of being trapped below the floor!
    const minX = -15;
    const maxX = 11;
    const minY = -10;
    const maxY = 20;
    const minZ = -50;
    const maxZ = 28;

    const cx = (minX + maxX) / 2 + this.ctx.offset.x;
    const cy = (minY + maxY) / 2 + this.ctx.offset.y;
    const cz = (minZ + maxZ) / 2 + this.ctx.offset.z;

    const dx = (maxX - minX) / 2;
    const dy = (maxY - minY) / 2;
    const dz = (maxZ - minZ) / 2;

    const thick = 1.0;

    const createStaticBox = (pos: THREE.Vector3, halfExtents: THREE.Vector3) => {
      const rbDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(pos.x, pos.y, pos.z);
      const body = physicsSystem.world!.createRigidBody(rbDesc);
      const colDesc = RAPIER.ColliderDesc.cuboid(halfExtents.x, halfExtents.y, halfExtents.z);
      physicsSystem.world!.createCollider(colDesc, body);
    };

    // West wall
    createStaticBox(new THREE.Vector3(minX - thick / 2 + this.ctx.offset.x, cy, cz), new THREE.Vector3(thick / 2, dy, dz));
    // East wall
    createStaticBox(new THREE.Vector3(maxX + thick / 2 + this.ctx.offset.x, cy, cz), new THREE.Vector3(thick / 2, dy, dz));
    // South wall
    createStaticBox(new THREE.Vector3(cx, cy, maxZ + thick / 2 + this.ctx.offset.z), new THREE.Vector3(dx, dy, thick / 2));
    // North wall
    createStaticBox(new THREE.Vector3(cx, cy, minZ - thick / 2 + this.ctx.offset.z), new THREE.Vector3(dx, dy, thick / 2));
    // Ceiling
    createStaticBox(new THREE.Vector3(cx, maxY + thick / 2 + this.ctx.offset.y, cz), new THREE.Vector3(dx, thick / 2, dz));
    // Floor
    createStaticBox(new THREE.Vector3(cx, minY - thick / 2 + this.ctx.offset.y, cz), new THREE.Vector3(dx, thick / 2, dz));
  }

  protected setupCommonProps(skeletonHasCrown: boolean = false, skeletonId: string = 'prop_skeleton_global'): any {
    // Spawn Chest & Flint
    const chest = this.ctx.factory.createChest(this.spawnWithOffset(new THREE.Vector3(-12.53, -0.1, -8.01)), null, `prop_chest_${this.sharedIdPrefix}`);
    chest.mesh.rotation.y = Math.PI / 2;
    this.ctx.loadObjectState(chest);
    this.ctx.scene.add(chest.mesh);
    this.ctx.addPuzzleObject(chest);

    const flintId = `prop_flint_${this.sharedIdPrefix}`;
    const flintState = this.ctx.stateManager.getObjectState(flintId);
    if (flintState) {
      const flint = this.ctx.factory.createFlintAndSteel(new THREE.Vector3(0, 0, 0), flintId);
      this.ctx.loadObjectState(flint);
      this.ctx.scene.add(flint.mesh);
      this.ctx.addPuzzleObject(flint);
      flint.initPhysics();
    } else if (chest.getIsOpen()) {
      const flint = this.ctx.factory.createFlintAndSteel(
        chest.mesh.position.clone().add(new THREE.Vector3(0, 0.5, 0.5)),
        flintId
      );
      this.ctx.scene.add(flint.mesh);
      this.ctx.addPuzzleObject(flint);
      flint.initPhysics();
    } else {
      chest.onOpen = () => {
        const flint = this.ctx.factory.createFlintAndSteel(
          chest.mesh.position.clone().add(new THREE.Vector3(0, 0.5, 0.5)),
          flintId
        );
        this.ctx.scene.add(flint.mesh);
        this.ctx.addPuzzleObject(flint);
        flint.initPhysics();
        this.ctx.stateManager.updateObjectState(flintId, flint.saveState());
      };
    }

    // Spawn 3 Tiki Torches
    const torchCoords = [
      new THREE.Vector3(-9.92, 1.1, 17.25),
      new THREE.Vector3(-13.33, 1.1, -5.09),
      new THREE.Vector3(-2.13, 1.1, -20.92)
    ];
    for (let i = 0; i < torchCoords.length; i++) {
      const torch = this.ctx.factory.createTikiTorch(
        this.spawnWithOffset(torchCoords[i]),
        `prop_torch_${this.sharedIdPrefix}_${i + 1}`
      );
      this.ctx.loadObjectState(torch);
      this.ctx.scene.add(torch.mesh);
      this.ctx.addPuzzleObject(torch);
    }

    // Spawn Skeleton (Isolation has no crown, Rise has it initially)
    const skeleton = this.ctx.factory.createSkeleton(this.spawnWithOffset(new THREE.Vector3(-12, -0.1, -26)), false, skeletonHasCrown, skeletonId);
    skeleton.mesh.scale.set(0.7, 0.7, 0.7);
    this.ctx.loadObjectState(skeleton);
    if (!skeletonHasCrown) {
      skeleton.forceNoCrown();
    }
    this.ctx.scene.add(skeleton.mesh);
    this.ctx.addPuzzleObject(skeleton);

    return { chest, skeleton };
  }

  protected spawnPortal(
    nextIndex: number,
    colorA: number,
    colorB: number,
    validateTransition: () => boolean = () => true
  ): void {
    const targetOffset = new THREE.Vector3(nextIndex * WORLD_CONFIG.ISLAND_OFFSET, 0, 0);
    const nextPlatform = this.ctx.platformManager.createPlatform(nextIndex, targetOffset);
    if (nextPlatform) {
      nextPlatform.objects.forEach((obj: any) => {
        if (obj.mesh) this.ctx.interaction.registerInteractive(obj.mesh);
        this.ctx.addPuzzleObject(obj);
      });
    }

    const dockPos = new THREE.Vector3(8, -0.9, -1.5).add(this.ctx.offset);
    const startPos = dockPos.clone().add(new THREE.Vector3(0, 0, 40));
    const startPortalPos = startPos.clone().add(new THREE.Vector3(0.4, 1.85, 0));
    const portalPos = dockPos.clone().add(new THREE.Vector3(0.4, 1.85, 0));

    const portals = this.ctx.portalSystem.addPortalPair(
      startPortalPos,
      new THREE.Euler(0, -Math.PI / 2, 0),
      colorA,
      new THREE.Vector3(targetOffset.x - 12.13, PORTAL_CONFIG.height / 2, -37.4),
      new THREE.Euler(0, Math.PI / 2, 0),
      colorB,
      PORTAL_CONFIG.width,
      PORTAL_CONFIG.height,
      (isPlayer) => {
        if (isPlayer) {
          if (!validateTransition()) {
            return;
          }
          this.ctx.onTransition(
            nextIndex,
            this.ctx.platform,
            nextPlatform ?? { config: { index: nextIndex }, objects: [], mesh: { position: targetOffset.clone() } }
          );
        }
      }
    );

    const portal = portals[0];
    portal.cleanupPhysics();

    const boatInstance = this.ctx.animateBoatArrival(
      dockPos,
      () => {
        portal.setPosition(portalPos);
        portal.updateWorldMatrix();
        portal.initPhysics();
      },
      (boatPos) => {
        const currentPortalPos = boatPos.clone().add(new THREE.Vector3(0.4, 1.85, 0));
        portal.setPosition(currentPortalPos);
        portal.updateWorldMatrix();
      }
    );

    // ==========================================
    // DEBUG HELPERS FOR BOAT AND PORTAL (Cyan & Magenta)
    // ==========================================
    const boatHelper = new THREE.BoxHelper(boatInstance.mesh, 0x00ffff);
    this.ctx.scene.add(boatHelper);

    const portalHelper = new THREE.BoxHelper(portal.mesh, 0xff00ff);
    this.ctx.scene.add(portalHelper);

    const updateDebugHelpers = () => {
      if (boatInstance.mesh.parent) {
        boatHelper.update();
      } else {
        this.ctx.scene.remove(boatHelper);
      }
      
      if (portal.mesh.parent) {
        portalHelper.update();
      } else {
        this.ctx.scene.remove(portalHelper);
      }
      
      if (boatInstance.mesh.parent || portal.mesh.parent) {
        requestAnimationFrame(updateDebugHelpers);
      }
    };
    requestAnimationFrame(updateDebugHelpers);
    // ==========================================
  }
}
