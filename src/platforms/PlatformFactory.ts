import * as THREE from 'three';
import Chest from '../objects/Chest';
import Skeleton from '../objects/Skeleton';
import TikiTorch from '../objects/TikiTorch';
import TriggerZone from '../world/interaction/TriggerZone';
import Throne from '../objects/Throne';
import Mirror from '../objects/Mirror';
import GardeningHoe from '../objects/GardeningHoe';
import Coffin from '../objects/Coffin';
import PalmTree from '../objects/PalmTree';
import Foliage, { FoliageType } from '../objects/Foliage';
import Rock, { RockType } from '../objects/Rock';
import Shack from '../objects/Shack';
import TorchSocket from '../objects/TorchSocket';
import Boat from '../objects/Boat';
import FlintAndSteel from '../objects/FlintAndSteel';
import Crown from '../objects/Crown';
import WaterBucket from '../objects/WaterBucket';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { assetLoader } from '../engine/AssetLoader';


export type PlatformConfig = {
  index: number;
  type: 'gravel' | 'sand' | 'volcanic';
  variation: number;
  size: number;
  height: number;
};

export default class PlatformFactory {
  private readonly platformConfig: Record<'gravel' | 'sand' | 'volcanic', {
    textureColor: number;
    propTypes: string[];
  }>;

  constructor() {
    this.platformConfig = {
      gravel: { textureColor: 0x8b7c6e, propTypes: ['statue', 'crate', 'anchor'] },
      sand: { textureColor: 0xd4a574, propTypes: ['boat', 'rock', 'barrel'] },
      volcanic: { textureColor: 0x3d3530, propTypes: ['crystal', 'vent', 'rock'] },
    };
  }

  createPlatformMesh(config: PlatformConfig) {
    const group = new THREE.Group();
    (group as any).userData = { type: 'platform', platformConfig: config };

    const task = assetLoader.fetchGltf('island/island_terrain.glb').then((gltf) => {
      const terrain = SkeletonUtils.clone(gltf.scene);
      terrain.scale.set(5, 5, 5);
      // Move the model negatively in X, positively in Y, and keep Z
      terrain.position.set(-15, 2.8, 0);
      terrain.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      // Update matrices to compute correct local positions relative to island center
      group.updateMatrixWorld(true);

      terrain.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const localPos = new THREE.Vector3();
          child.getWorldPosition(localPos);

          const dx1 = localPos.x - (-4.25);
          const dz1 = localPos.z - (-40.79);
          const distXZ1 = Math.sqrt(dx1 * dx1 + dz1 * dz1);

          // Pre-baked dock boat coordinates
          const dx2 = localPos.x - 2.39;
          const dz2 = localPos.z - 0.58;
          const distXZ2 = Math.sqrt(dx2 * dx2 + dz2 * dz2);

          const name = child.name.toLowerCase();
          
          // Hide mesh if it contains 'boat' or is near either coordinate target
          if (name.includes('boat') || distXZ1 < 3.0 || distXZ2 < 3.0) {
            child.visible = false;
            child.scale.set(0, 0, 0);
            child.castShadow = false;
            child.receiveShadow = false;
          }
        }
      });

      group.add(terrain);
      if (typeof (group as any).onLoaded === 'function') {
        (group as any).onLoaded();
      }
    });
    assetLoader.trackInstance(task);

    return group;
  }


  createTexture(type: string) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    switch (type) {
      case 'gravel':
        this.drawGravelTexture(ctx, canvas.width, canvas.height);
        break;
      case 'sand':
        this.drawSandTexture(ctx, canvas.width, canvas.height);
        break;
      case 'volcanic':
        this.drawVolcanicTexture(ctx, canvas.width, canvas.height);
        break;
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    return texture;
  }

  drawGravelTexture(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.fillStyle = '#8b7c6e';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 200; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const size = Math.random() * 20 + 5;
      const color = `hsla(30,20%,${Math.random() * 20 + 40}%,1)`;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath();
      ctx.arc(x + 2, y + 2, size * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawSandTexture(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.fillStyle = '#d4a574';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 30; i++) {
      const y = Math.random() * h;
      const amplitude = Math.random() * 20 + 5;
      const frequency = Math.random() * 0.01 + 0.005;
      ctx.beginPath();
      for (let x = 0; x < w; x += 5) {
        const offsetY = Math.sin(x * frequency) * amplitude;
        if (x === 0) ctx.moveTo(x, y + offsetY);
        else ctx.lineTo(x, y + offsetY);
      }
      ctx.stroke();
    }
    for (let i = 0; i < 1000; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const opacity = Math.random() * 0.3;
      ctx.fillStyle = `rgba(255,255,255,${opacity})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }

  drawVolcanicTexture(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.fillStyle = '#3d3530';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 15; i++) {
      ctx.beginPath();
      let x = Math.random() * w;
      let y = Math.random() * h;
      ctx.moveTo(x, y);
      for (let j = 0; j < 20; j++) {
        x += (Math.random() - 0.5) * 40;
        y += (Math.random() - 0.5) * 40;
        x = Math.max(0, Math.min(w, x));
        y = Math.max(0, Math.min(h, y));
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    for (let i = 0; i < 20; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const radius = Math.random() * 30 + 10;
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, 'rgba(255,100,0,0.3)');
      gradient.addColorStop(1, 'rgba(255,100,0,0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  createProps(config: PlatformConfig) {
    const propTypes = this.platformConfig[config.type].propTypes;
    const positions = this.getPropPositions(config.size);
    const props: THREE.Object3D[] = [];
    propTypes.forEach((type: string, index: number) => {
      if (positions[index]) props.push(this.createProp(type, positions[index]));
    });
    return props;
  }

  getPropPositions(platformSize: number) {
    return [
      new THREE.Vector3(-platformSize * 0.4, 0.5, -platformSize * 0.3),
      new THREE.Vector3(platformSize * 0.3, 0.5, platformSize * 0.35),
      new THREE.Vector3(0, 0.5, platformSize * 0.45),
    ];
  }

  createProp(type: string, position: THREE.Vector3) {
    let geometry: THREE.BufferGeometry;
    let material: THREE.Material;
    switch (type) {
      case 'statue':
      case 'crystal':
        geometry = new THREE.ConeGeometry(1, 3, 8);
        material = new THREE.MeshStandardMaterial({ color: 0x888888 });
        break;
      case 'crate':
      case 'barrel':
        geometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
        material = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
        break;
      case 'anchor':
      case 'vent':
        geometry = new THREE.SphereGeometry(0.8, 16, 16);
        material = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.8 });
        break;
      case 'boat': {
        const boat = new Boat();
        boat.mesh.position.copy(position);
        return boat.mesh;
      }
      case 'rock':
        geometry = new THREE.IcosahedronGeometry(0.8, 2);
        material = new THREE.MeshStandardMaterial({ color: 0x666666 });
        break;
      default:
        geometry = new THREE.BoxGeometry(1, 1, 1);
        material = new THREE.MeshStandardMaterial({ color: 0x888888 });
    }
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.position.copy(position);
    (mesh as any).userData = { type: 'prop', propType: type };
    return mesh;
  }

  createButton(config: PlatformConfig) {
    const geometry = new THREE.CylinderGeometry(1, 1, 0.2, 16);
    const material = new THREE.MeshStandardMaterial({ color: 0xff3333, emissive: 0xff0000, emissiveIntensity: 0.3 });
    const button = new THREE.Mesh(geometry, material);
    button.castShadow = true;
    button.receiveShadow = true;
    button.position.set(0, 1, 0);
    (button as any).userData = { type: 'button', interactive: true };
    return button;
  }

  createChest(position: THREE.Vector3, contents: any = null, persistentId: string = '') {
    const chest = new Chest(contents, persistentId);
    chest.mesh.position.copy(position);
    return chest;
  }

  createSkeleton(position: THREE.Vector3, _isBones: boolean = false, hasCrown: boolean = true, persistentId: string = '') {
    const skeleton = new Skeleton(hasCrown, persistentId);
    skeleton.mesh.position.copy(position);
    return skeleton;
  }

  createTikiTorch(position: THREE.Vector3, persistentId: string = '') {
    const torch = new TikiTorch(persistentId);
    torch.mesh.position.copy(position);
    return torch;
  }

  createTriggerZone(position: THREE.Vector3, radius: number = 2.0, color: number = 0x00ff00) {
    return new TriggerZone(position, radius, color);
  }

  createThrone(position: THREE.Vector3, persistentId: string = '') {
    const throne = new Throne(persistentId);
    throne.mesh.position.copy(position);
    return throne;
  }

  createPalmTree(position: THREE.Vector3, variationIndex?: number) {
    const palmTree = new PalmTree(variationIndex);
    palmTree.mesh.position.copy(position);
    return palmTree;
  }

  createFoliage(type: FoliageType, position: THREE.Vector3, variationIndex?: number) {
    const foliage = new Foliage(type, variationIndex);
    foliage.mesh.position.copy(position);
    return foliage;
  }

  createBush(position: THREE.Vector3) {
    const bushGeo = new THREE.SphereGeometry(0.5, 8, 8);
    const bushMat = new THREE.MeshStandardMaterial({ color: 0x1b5e20 });
    const bush = new THREE.Mesh(bushGeo, bushMat);
    bush.position.copy(position);
    bush.scale.set(1.2, 0.8, 1.2);
    return bush;
  }

  createRock(type: RockType, position: THREE.Vector3, variationIndex?: number) {
    const rock = new Rock(type, variationIndex);
    rock.mesh.position.copy(position);
    return rock;
  }

  createProceduralMeshRock(position: THREE.Vector3, scale: number = 1.0) {
    const rockGeo = new THREE.DodecahedronGeometry(0.5, 0);
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x616161, roughness: 0.9 });
    const rock = new THREE.Mesh(rockGeo, rockMat);
    rock.position.copy(position);
    rock.scale.set(scale, scale * 0.8, scale);
    rock.rotation.set(Math.random(), Math.random(), Math.random());
    return rock;
  }

  createMirror(position: THREE.Vector3, persistentId: string = '') {
    const mirror = new Mirror(persistentId);
    mirror.mesh.position.copy(position);
    return mirror;
  }

  createGardeningHoe(position: THREE.Vector3, persistentId: string = '') {
    const hoe = new GardeningHoe(persistentId);
    hoe.mesh.position.copy(position);
    return hoe;
  }

  createCoffin(position: THREE.Vector3, persistentId: string = '') {
    const coffin = new Coffin(persistentId);
    coffin.mesh.position.copy(position);
    return coffin;
  }

  createShack(position: THREE.Vector3): Shack {
    const shack = new Shack();
    shack.mesh.position.copy(position);
    return shack;
  }

  createTorchSocket(position: THREE.Vector3, socketIndex: number, persistentId: string = ''): TorchSocket {
    const socket = new TorchSocket(socketIndex, persistentId);
    socket.mesh.position.copy(position);
    return socket;
  }

  createBoat(position: THREE.Vector3): Boat {
    const boat = new Boat();
    boat.mesh.position.copy(position);
    return boat;
  }

  createFlintAndSteel(position: THREE.Vector3, persistentId: string = ''): FlintAndSteel {
    const flint = new FlintAndSteel(persistentId);
    flint.mesh.position.copy(position);
    return flint;
  }

  createRedX(position: THREE.Vector3, _persistentId: string = '') {
    const group = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color: 0xaa0000 });
    const geo = new THREE.BoxGeometry(1, 0.05, 0.2);

    const bar1 = new THREE.Mesh(geo, mat);
    bar1.rotation.y = Math.PI / 4;
    group.add(bar1);

    const bar2 = new THREE.Mesh(geo, mat);
    bar2.rotation.y = -Math.PI / 4;
    group.add(bar2);

    group.position.copy(position);
    return group;
  }

  createCrown(persistentId: string = '') {
    const crown = new Crown();
    crown.persistentId = persistentId;
    return crown;
  }

  createWaterBucket(position: THREE.Vector3, persistentId: string = '') {
    const bucket = new WaterBucket(persistentId);
    bucket.mesh.position.copy(position);
    return bucket;
  }
}
