import * as THREE from 'three';

function tagged(group: THREE.Group, name: string): THREE.Group {
  group.userData.placeholder = true;
  group.userData.placeholderType = name;
  return group;
}

// ── Skeleton ───────────────────────────────────────────────────────────────

export function createSkeletonPlaceholder(): THREE.Group {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.9 });

  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), mat);
  skull.position.y = 0.8;
  group.add(skull);

  const ribs = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.2), mat);
  ribs.position.y = 0.45;
  group.add(ribs);

  const legGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.4, 6);
  const legL = new THREE.Mesh(legGeo, mat); legL.position.set(-0.15, 0.2, 0); legL.rotation.z = 0.1;
  const legR = new THREE.Mesh(legGeo, mat); legR.position.set(0.15, 0.2, 0); legR.rotation.z = -0.1;
  group.add(legL, legR);

  const armGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.4, 6);
  const armL = new THREE.Mesh(armGeo, mat); armL.position.set(-0.25, 0.5, 0); armL.rotation.z = 0.5;
  const armR = new THREE.Mesh(armGeo, mat); armR.position.set(0.25, 0.5, 0); armR.rotation.z = -0.5;
  group.add(armL, armR);

  return tagged(group, 'skeleton');
}

export function createBonesPilePlaceholder(): THREE.Group {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.9 });
  for (let i = 0; i < 8; i++) {
    const bone = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03 + Math.random() * 0.02, 0.03 + Math.random() * 0.02, 0.15 + Math.random() * 0.2, 6),
      mat
    );
    bone.position.set((Math.random() - 0.5) * 0.6, 0.05, (Math.random() - 0.5) * 0.6);
    bone.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    group.add(bone);
  }
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), mat);
  skull.position.set(0.1, 0.1, -0.2);
  skull.rotation.set(0.5, 2.2, 0);
  group.add(skull);
  return tagged(group, 'bones-pile');
}

// ── Mirror frame ───────────────────────────────────────────────────────────

export function createMirrorFramePlaceholder(width: number, height: number, depth = 0.08): THREE.Group {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.9, roughness: 0.1 });
  const t = 0.1; // border thickness

  // top / bottom rails
  const hBar = new THREE.Mesh(new THREE.BoxGeometry(width + t * 2, t, depth), mat);
  const top = hBar.clone(); top.position.y = height / 2 + t / 2;
  const bot = hBar.clone(); bot.position.y = -(height / 2 + t / 2);
  group.add(top, bot);

  // side rails
  const vBar = new THREE.Mesh(new THREE.BoxGeometry(t, height, depth), mat);
  const lft = vBar.clone(); lft.position.x = -(width / 2 + t / 2);
  const rgt = vBar.clone(); rgt.position.x = width / 2 + t / 2;
  group.add(lft, rgt);

  return tagged(group, 'mirror-frame');
}

// ── Shack ──────────────────────────────────────────────────────────────────

export function createShackPlaceholder(): THREE.Group {
  const group = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.95 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x4a3520, roughness: 0.9 });

  const W = 4, H = 2.4, D = 3.5;
  const thick = 0.15;

  const addWall = (geo: THREE.BoxGeometry, x: number, y: number, z: number) => {
    const m = new THREE.Mesh(geo, woodMat); m.position.set(x, y, z); group.add(m);
  };

  // Back wall (solid)
  addWall(new THREE.BoxGeometry(W, H, thick), 0, H / 2, -D / 2);
  // Left wall
  addWall(new THREE.BoxGeometry(thick, H, D), -W / 2, H / 2, 0);
  // Right wall
  addWall(new THREE.BoxGeometry(thick, H, D), W / 2, H / 2, 0);
  // Front wall — left panel
  addWall(new THREE.BoxGeometry(W * 0.3, H, thick), -W / 2 + W * 0.15, H / 2, D / 2);
  // Front wall — right panel
  addWall(new THREE.BoxGeometry(W * 0.3, H, thick), W / 2 - W * 0.15, H / 2, D / 2);
  // Front wall — top lintel above door
  addWall(new THREE.BoxGeometry(W * 0.4, H * 0.25, thick), 0, H - H * 0.125, D / 2);

  // Gabled roof — two sloped panels
  const roofAngle = Math.PI / 6;
  const roofW = (W / 2) / Math.cos(roofAngle) + 0.1;
  const roofL = D + 0.3;
  const leftRoof = new THREE.Mesh(new THREE.BoxGeometry(roofW, thick, roofL), roofMat);
  leftRoof.position.set(-W / 4, H + 0.2, 0);
  leftRoof.rotation.z = roofAngle;
  group.add(leftRoof);
  const rightRoof = new THREE.Mesh(new THREE.BoxGeometry(roofW, thick, roofL), roofMat);
  rightRoof.position.set(W / 4, H + 0.2, 0);
  rightRoof.rotation.z = -roofAngle;
  group.add(rightRoof);

  group.traverse(c => { if ((c as THREE.Mesh).isMesh) { c.castShadow = true; c.receiveShadow = true; } });
  return tagged(group, 'shack');
}

// ── Torch socket ───────────────────────────────────────────────────────────

export function createTorchSocketPlaceholder(): THREE.Group {
  const group = new THREE.Group();
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.95 });
  const ironMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.7, roughness: 0.4 });

  // Base cylinder
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.35, 8), stoneMat);
  base.position.y = 0.175;
  group.add(base);

  // Iron ring at top
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.03, 6, 12), ironMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.36;
  group.add(ring);

  // Small hollow indicator (dark disk inside)
  const hollow = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.04, 8),
    new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 1 }));
  hollow.position.y = 0.37;
  group.add(hollow);

  group.traverse(c => { if ((c as THREE.Mesh).isMesh) { c.castShadow = true; c.receiveShadow = true; } });
  return tagged(group, 'torch-socket');
}

// ── Barrel ─────────────────────────────────────────────────────────────────

export function createBarrelPlaceholder(): THREE.Group {
  const group = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x7a5230, roughness: 0.9 });
  const ironMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.7 });

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.7, 10), woodMat);
  body.position.y = 0.35;
  group.add(body);

  for (const y of [0.15, 0.35, 0.55]) {
    const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.025, 6, 14), ironMat);
    hoop.rotation.x = Math.PI / 2;
    hoop.position.y = y;
    group.add(hoop);
  }

  group.traverse(c => { if ((c as THREE.Mesh).isMesh) { c.castShadow = true; c.receiveShadow = true; } });
  return tagged(group, 'barrel');
}

// ── Flint and Steel ────────────────────────────────────────────────────────

export function createFlintAndSteelPlaceholder(): THREE.Group {
  const group = new THREE.Group();
  const steelMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.85, roughness: 0.3 });
  const flintMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.95 });

  const steel = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 0.06), steelMat);
  steel.position.set(0.04, 0, 0);
  group.add(steel);

  const flint = new THREE.Mesh(new THREE.DodecahedronGeometry(0.04, 0), flintMat);
  flint.position.set(-0.06, 0, 0);
  group.add(flint);

  group.traverse(c => { if ((c as THREE.Mesh).isMesh) { c.castShadow = true; c.receiveShadow = true; } });
  return tagged(group, 'flint-and-steel');
}

// ── Boat ───────────────────────────────────────────────────────────────────

export function createBoatPlaceholder(): THREE.Group {
  const group = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.9 });
  const sailMat = new THREE.MeshStandardMaterial({ color: 0xf5f0e8, side: THREE.DoubleSide });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x5c3317, roughness: 0.85 });

  const hullBot = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.25, 0.8), woodMat);
  hullBot.position.y = 0;
  group.add(hullBot);

  const hullTop = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.25, 1.1), woodMat);
  hullTop.position.y = 0.25;
  group.add(hullTop);

  const rim = new THREE.Mesh(new THREE.BoxGeometry(2.65, 0.08, 1.15), darkMat);
  rim.position.y = 0.42;
  group.add(rim);

  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.0, 6), darkMat);
  mast.position.set(0, 1.4, 0);
  group.add(mast);

  const sail = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.4), sailMat);
  sail.position.set(0.5, 1.6, 0);
  sail.rotation.y = Math.PI / 2;
  group.add(sail);

  group.traverse(c => { if ((c as THREE.Mesh).isMesh) { c.castShadow = true; c.receiveShadow = true; } });
  group.userData = { placeholder: true, placeholderType: 'boat' };
  return group;
}
