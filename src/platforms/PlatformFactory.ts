import * as THREE from 'three';
import Chest from '../objects/Chest';
import Skeleton from '../objects/Skeleton';
import TikiTorch from '../objects/TikiTorch';
import TriggerZone from '../world/TriggerZone';
import Throne from '../objects/Throne';
import Mirror from '../objects/Mirror';
import GardeningHoe from '../objects/GardeningHoe';
import Coffin from '../objects/Coffin';
import PalmTree from '../objects/PalmTree';
import Foliage, { FoliageType } from '../objects/Foliage';
import Rock, { RockType } from '../objects/Rock';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';


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
      gravel:   { textureColor: 0x8b7c6e, propTypes: ['statue', 'crate', 'anchor'] },
      sand:     { textureColor: 0xd4a574, propTypes: ['boat', 'rock', 'barrel'] },
      volcanic: { textureColor: 0x3d3530, propTypes: ['crystal', 'vent', 'rock'] },
    };
  }

  createPlatformMesh(config: PlatformConfig) {
    const geometry = new THREE.CylinderGeometry(config.size, config.size, config.height, 32);
    const material = new THREE.MeshStandardMaterial({
      roughness: 0.8,
      metalness: 0.1,
    });

    if (config.type === 'sand') {
      material.color.setHex(0xffffff); // reset color so texture shows cleanly
      const loader = new GLTFLoader();
      loader.load('models/sand/stylized_beach_sand.glb', (gltf) => {
        let foundTexture: THREE.Texture | undefined = undefined;
        gltf.scene.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const m = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
            if (m && m.map && !foundTexture) {
              foundTexture = m.map;
            }
          }
        });
        if (foundTexture) {
          const tex = foundTexture as THREE.Texture;
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.wrapS = THREE.RepeatWrapping;
          tex.wrapT = THREE.RepeatWrapping;
          tex.repeat.set(8, 8);
          material.map = tex;
          material.needsUpdate = true;
        }
      });
    } else {
      material.map = this.createTexture(config.type);
      material.color.setHex(this.platformConfig[config.type].textureColor);
    }

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    (mesh as any).userData = { type: 'platform', platformConfig: config };
    return mesh;
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
    const props: THREE.Mesh[] = [];
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
      case 'boat':
        geometry = new THREE.BoxGeometry(2, 0.8, 1);
        material = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
        break;
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

  createSkeleton(position: THREE.Vector3, isBones: boolean = false, hasCrown: boolean = true, persistentId: string = '') {
    const skeleton = new Skeleton(isBones, hasCrown, persistentId);
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
}
