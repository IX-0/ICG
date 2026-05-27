import * as THREE from 'three';
import { StaticObject } from './StaticObject';
import { assetLoader } from '../engine/AssetLoader';

export default class Dock extends StaticObject {
  constructor() {
    super();
    this.hasPhysics = true;

    // Create a group for all dock components
    const group = new THREE.Group();
    this.mesh.add(group);

    // Setup standard PBR material matching the boat's rich dark wood
    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x6d4c32,
      roughness: 0.85,
      metalness: 0.05,
    });

    // Async load wood texture directly via assetLoader (cached and shared!)
    assetLoader.fetchTexture('models/crown/textures/rough_wood_diff_2k.jpg').then((cachedTex) => {
      const woodTex = cachedTex.clone();
      woodTex.wrapS = woodTex.wrapT = THREE.RepeatWrapping;
      woodTex.repeat.set(1.5, 1.5);
      woodMat.map = woodTex;
      woodMat.needsUpdate = true;
    });

    // ── Build the Deck Planks ────────────────────────────────────────────────
    // Spaced side-by-side along the Z axis from z = -14.0 (shore) to z = -17.8 (boat)
    const startZ = -14.0;
    const endZ = -17.8;
    const plankCount = 6;
    const plankWidth = 1.6;      // X width
    const plankThickness = 0.08; // Y thickness
    const span = startZ - endZ;  // 3.8 units total span

    for (let i = 0; i < plankCount; i++) {
      const t = i / (plankCount - 1);
      const zPos = startZ - t * span;

      // Draw individual wooden planks
      const plankGeo = new THREE.BoxGeometry(plankWidth, plankThickness, 0.52);
      const plank = new THREE.Mesh(plankGeo, woodMat);

      plank.position.set(0, 0, zPos);
      plank.castShadow = true;
      plank.receiveShadow = true;
      group.add(plank);
    }

    // ── Build the Under-Beams ───────────────────────────────────────────────
    // Longitudinal supporting beams running underneath the planks
    const beamGeo = new THREE.BoxGeometry(0.12, 0.15, span + 0.6);
    
    const leftBeam = new THREE.Mesh(beamGeo, woodMat);
    leftBeam.position.set(-0.6, -0.1, (startZ + endZ) / 2);
    leftBeam.castShadow = true;
    leftBeam.receiveShadow = true;
    group.add(leftBeam);

    const rightBeam = new THREE.Mesh(beamGeo, woodMat);
    rightBeam.position.set(0.6, -0.1, (startZ + endZ) / 2);
    rightBeam.castShadow = true;
    rightBeam.receiveShadow = true;
    group.add(rightBeam);

    // ── Build the 2 Sticks / Support Posts (Piles) ─────────────────────────
    // Support piles standing at the far end of the dock next to the boat
    const postHeight = 2.4;
    const postRadius = 0.11;
    const postGeo = new THREE.CylinderGeometry(postRadius, postRadius, postHeight, 8);

    // Left pile
    const leftPost = new THREE.Mesh(postGeo, woodMat);
    leftPost.position.set(-0.7, -postHeight / 2 + 0.8, endZ - 0.25);
    leftPost.castShadow = true;
    leftPost.receiveShadow = true;
    group.add(leftPost);

    // Right pile
    const rightPost = new THREE.Mesh(postGeo, woodMat);
    rightPost.position.set(0.7, -postHeight / 2 + 0.8, endZ - 0.25);
    rightPost.castShadow = true;
    rightPost.receiveShadow = true;
    group.add(rightPost);

    // ── Build the 2 Asymmetric Start Posts (Piles) at the shore ────────────
    // Left start pile (shorter, thinner, tilted slightly, closer in Z)
    const leftStartHeight = 1.8;
    const leftStartRadius = 0.09;
    const leftStartGeo = new THREE.CylinderGeometry(leftStartRadius * 0.95, leftStartRadius, leftStartHeight, 8);
    const leftStartPost = new THREE.Mesh(leftStartGeo, woodMat);
    leftStartPost.position.set(-0.68, -leftStartHeight / 2 + 0.7, startZ + 0.1);
    leftStartPost.rotation.set(0.08, 0.0, -0.06); // organic natural tilt
    leftStartPost.castShadow = true;
    leftStartPost.receiveShadow = true;
    group.add(leftStartPost);

    // Right start pile (taller, thicker, tilted counter-axis, shifted back in Z)
    const rightStartHeight = 2.2;
    const rightStartRadius = 0.11;
    const rightStartGeo = new THREE.CylinderGeometry(rightStartRadius * 0.95, rightStartRadius, rightStartHeight, 8);
    const rightStartPost = new THREE.Mesh(rightStartGeo, woodMat);
    rightStartPost.position.set(0.72, -rightStartHeight / 2 + 0.9, startZ - 0.3);
    rightStartPost.rotation.set(-0.05, 0.0, 0.08); // organic opposing tilt
    rightStartPost.castShadow = true;
    rightStartPost.receiveShadow = true;
    group.add(rightStartPost);

    // Update matrices and initialize dynamic static trimesh physics colliders
    this.mesh.updateWorldMatrix(true, true);
    this.initPhysics();
  }
}
