import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { FontLoader } from "three/addons/loaders/FontLoader.js";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";

const RED = 0xe31c24;
const GRASS = 0x5fb52e;
const GRASS_IN = 0x4ea326;
const ROAD = 0x2ad0f0;
const ROAD_GLOW = 0xa8eefe;
const CREAM = 0xf7f9fc;
const GLASS = 0x7ecceb;
const NAVY = 0x1a2230;
const SKIN = 0xf3c49a;
const WHITE = 0xf8fbff;
const GOLD = 0xe0b45a;
const WOOD = 0xd09a5c;

function std(color, extra = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: extra.roughness ?? 0.58,
    metalness: extra.metalness ?? 0.04,
    envMapIntensity: extra.envMapIntensity ?? 0.55,
    ...extra,
  });
}

function candy(color) {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.2,
    metalness: 0.1,
    clearcoat: 0.82,
    clearcoatRoughness: 0.14,
    sheen: 0.16,
    sheenColor: new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.35),
    envMapIntensity: 0.82,
    emissive: new THREE.Color(color).multiplyScalar(0.04),
    emissiveIntensity: 0.22,
  });
}

function glassMat(opacity = 0.42) {
  return new THREE.MeshPhysicalMaterial({
    color: GLASS,
    roughness: 0.05,
    metalness: 0.02,
    transparent: true,
    opacity,
    transmission: 0.55,
    thickness: 0.22,
    ior: 1.45,
    envMapIntensity: 1.35,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
}

function makeStudioEnv(renderer) {
  const s = new THREE.Scene();
  s.add(new THREE.HemisphereLight(0xfff3e4, 0x6a9a4e, 1.35));
  s.add(new THREE.Mesh(
    new THREE.SphereGeometry(22, 24, 16),
    new THREE.MeshBasicMaterial({ color: 0xf3f7fb, side: THREE.BackSide }),
  ));
  const card = (color, pos, size = 12) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(size, size),
      new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }),
    );
    m.position.copy(pos);
    m.lookAt(0, 1.5, 0);
    s.add(m);
  };
  card(0xfff2e6, new THREE.Vector3(-9, 7, 6), 16);
  card(0xe4f0ff, new THREE.Vector3(10, 5, 5), 14);
  card(0x8ecf68, new THREE.Vector3(0, -7, 3), 20);
  card(0xfffdf8, new THREE.Vector3(0, 14, -3), 18);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const tex = pmrem.fromScene(s, 0.04).texture;
  pmrem.dispose();
  return tex;
}

function groundShadow(rx, rz, opacity = 0.26) {
  const m = new THREE.Mesh(
    new THREE.CircleGeometry(1, 36),
    new THREE.MeshBasicMaterial({
      color: 0x122016,
      transparent: true,
      opacity,
      depthWrite: false,
    }),
  );
  m.rotation.x = -Math.PI / 2;
  m.scale.set(rx, rz, 1);
  m.position.y = 0.152;
  m.renderOrder = 1;
  return m;
}

function rbox(w, h, d, color, y = h / 2, radius = 0.06) {
  const material = color instanceof THREE.Material ? color : std(color);
  const mesh = new THREE.Mesh(
    new RoundedBoxGeometry(w, h, d, 4, Math.min(radius, w * 0.28, h * 0.28, d * 0.28)),
    material,
  );
  mesh.position.y = y;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function box(w, h, d, color, y = h / 2) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    color instanceof THREE.Material ? color : std(color),
  );
  mesh.position.y = y;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function sphere(r, color, segs = 16) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, segs, segs), color instanceof THREE.Material ? color : std(color, { roughness: 0.78 }));
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function canvasTex(w, h, draw) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function extrude(shape, depth, material, x, z) {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.11,
    bevelSize: 0.08,
    bevelSegments: 4,
    curveSegments: 12,
  });
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, 0.04, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function strokeShape(points, radius) {
  const left = [];
  const right = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[Math.max(0, i - 1)];
    const b = points[Math.min(points.length - 1, i + 1)];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    left.push(new THREE.Vector2(points[i].x + nx * radius, points[i].y + ny * radius));
    right.push(new THREE.Vector2(points[i].x - nx * radius, points[i].y - ny * radius));
  }
  const s = new THREE.Shape();
  const start = points[0];
  const end = points[points.length - 1];
  const t0x = points[1].x - points[0].x;
  const t0y = points[1].y - points[0].y;
  const a0 = Math.atan2(-t0x, t0y);
  s.moveTo(right[0].x, right[0].y);
  const cap0 = 8;
  for (let i = 1; i <= cap0; i++) {
    const a = a0 + (i / cap0) * Math.PI;
    s.lineTo(start.x + Math.cos(a) * radius, start.y + Math.sin(a) * radius);
  }
  left.forEach((p) => s.lineTo(p.x, p.y));
  const t1x = end.x - points[points.length - 2].x;
  const t1y = end.y - points[points.length - 2].y;
  const a1 = Math.atan2(-t1x, t1y) + Math.PI;
  for (let i = 1; i <= cap0; i++) {
    const a = a1 + (i / cap0) * Math.PI;
    s.lineTo(end.x + Math.cos(a) * radius, end.y + Math.sin(a) * radius);
  }
  for (let i = right.length - 1; i >= 0; i--) s.lineTo(right[i].x, right[i].y);
  s.closePath();
  return s;
}

function makeLetters(font) {
  const group = new THREE.Group();
  const red = candy(RED);
  const geo = new TextGeometry("WENS", {
    font,
    size: 4.45,
    depth: 1.08,
    curveSegments: 7,
    bevelEnabled: true,
    bevelThickness: 0.16,
    bevelSize: 0.08,
    bevelSegments: 3,
  });
  geo.computeBoundingBox();
  const bb = geo.boundingBox;
  const width = bb.max.x - bb.min.x;
  geo.translate(-bb.min.x - width / 2, 0, 0);
  const mesh = new THREE.Mesh(geo, red);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const s = 13.6 / width;
  mesh.scale.set(s, s, 1);
  mesh.position.set(-1.15, 0.04, -1.72);
  group.add(mesh);
  return group;
}

function makeLettersFallback() {
  const group = new THREE.Group();
  const red = candy(RED);
  const depth = 1.08;
  const H = 4.55;

  const W = new THREE.Shape();
  W.moveTo(0.00, 0.00);
  W.lineTo(0.20, H);
  W.lineTo(0.92, H);
  W.lineTo(1.42, 1.72);
  W.lineTo(1.90, H);
  W.lineTo(2.62, H);
  W.lineTo(3.10, 1.72);
  W.lineTo(3.60, H);
  W.lineTo(4.32, H);
  W.lineTo(4.52, 0.00);
  W.lineTo(3.72, 0.00);
  W.lineTo(3.22, 2.62);
  W.lineTo(2.36, 0.14);
  W.lineTo(1.50, 2.62);
  W.lineTo(1.00, 0.00);
  W.closePath();
  group.add(extrude(W, depth, red, -8.35, -1.72));

  const E = new THREE.Shape();
  E.moveTo(0.0, 0.0);
  E.lineTo(0.0, H);
  E.lineTo(2.42, H);
  E.lineTo(2.42, 3.68);
  E.lineTo(0.78, 3.68);
  E.lineTo(0.78, 2.68);
  E.lineTo(2.12, 2.68);
  E.lineTo(2.12, 1.88);
  E.lineTo(0.78, 1.88);
  E.lineTo(0.78, 0.86);
  E.lineTo(2.42, 0.86);
  E.lineTo(2.42, 0.0);
  E.closePath();
  group.add(extrude(E, depth, red, -3.55, -1.72));

  const N = new THREE.Shape();
  N.moveTo(0.0, 0.0);
  N.lineTo(0.0, H);
  N.lineTo(0.78, H);
  N.lineTo(1.98, 1.28);
  N.lineTo(1.98, H);
  N.lineTo(2.76, H);
  N.lineTo(2.76, 0.0);
  N.lineTo(1.98, 0.0);
  N.lineTo(0.78, 3.22);
  N.lineTo(0.78, 0.0);
  N.closePath();
  group.add(extrude(N, depth, red, -0.78, -1.72));

  const sPts = [];
  const topC = { x: 1.12, y: 3.34, r: 0.9 };
  const botC = { x: 1.12, y: 1.18, r: 0.9 };
  for (let i = 0; i <= 22; i++) {
    const a = 0.18 + (i / 22) * (Math.PI * 1.05 - 0.18);
    sPts.push(new THREE.Vector2(topC.x + Math.cos(a) * topC.r, topC.y + Math.sin(a) * topC.r));
  }
  for (let i = 1; i <= 22; i++) {
    const a = Math.PI * 0.9 + (i / 22) * (Math.PI * 1.02);
    sPts.push(new THREE.Vector2(botC.x + Math.cos(a) * botC.r, botC.y + Math.sin(a) * botC.r));
  }
  group.add(extrude(strokeShape(sPts, 0.44), depth, red, 2.22, -1.72));
  return group;
}

function makePerson({
  body = NAVY,
  pants,
  hair = 0x2c241c,
  scale = 1,
  hairStyle = "cap",
  wave = false,
} = {}) {
  const g = new THREE.Group();
  const skin = std(SKIN, { roughness: 0.88 });
  const head = sphere(0.132, skin, 18);
  head.position.y = 0.62;
  const earL = sphere(0.028, skin, 8);
  earL.position.set(-0.125, 0.61, 0.01);
  const earR = earL.clone();
  earR.position.x = 0.125;
  const eyeM = std(0x2a2433, { roughness: 0.5 });
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 8), eyeM);
  eyeL.position.set(-0.042, 0.63, 0.112);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.042;
  g.add(head, earL, earR, eyeL, eyeR);

  if (hairStyle !== "none") {
    const hairM = std(hair, { roughness: 0.9 });
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.138, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.58),
      hairM,
    );
    cap.position.y = 0.655;
    cap.rotation.x = -0.18;
    g.add(cap);
  }

  const torso = rbox(0.22, 0.26, 0.15, body, 0.36, 0.055);
  const pantsM = pants ?? body;
  const hip = rbox(0.2, 0.08, 0.14, pantsM, 0.21, 0.03);
  const legGeo = new THREE.CapsuleGeometry(0.04, 0.14, 4, 8);
  const legL = new THREE.Mesh(legGeo, std(pantsM));
  const legR = new THREE.Mesh(legGeo, std(pantsM));
  legL.position.set(-0.055, 0.12, 0);
  legR.position.set(0.055, 0.12, 0);
  const shoeL = rbox(0.07, 0.035, 0.1, 0x2a2a32, 0.02, 0.015);
  const shoeR = shoeL.clone();
  shoeL.position.set(0, -0.1, 0.02);
  shoeR.position.set(0, -0.1, 0.02);
  legL.add(shoeL);
  legR.add(shoeR);
  const armGeo = new THREE.CapsuleGeometry(0.032, 0.14, 4, 8);
  const armL = new THREE.Mesh(armGeo, std(body));
  const armR = new THREE.Mesh(armGeo, std(body));
  armL.position.set(-0.15, 0.4, 0);
  const waveArm = new THREE.Group();
  if (wave) {
    waveArm.position.set(0.15, 0.5, 0);
    armR.position.set(0, -0.1, 0);
    const hand = sphere(0.034, skin, 8);
    hand.position.set(0, -0.2, 0);
    waveArm.add(armR, hand);
    g.add(torso, hip, legL, legR, armL, waveArm);
    waveArm.rotation.z = 2.12;
    waveArm.rotation.x = -0.22;
  } else {
    armR.position.set(0.15, 0.4, 0);
    g.add(torso, hip, legL, legR, armL, armR);
  }
  g.scale.setScalar(scale);
  g.userData = { legL, legR, armL, armR, waveArm: wave ? waveArm : null, head, phase: Math.random() * Math.PI * 2 };
  return g;
}

function makePlasticBag() {
  const g = new THREE.Group();
  const film = std(0xf4f8fc, { roughness: 0.32, transparent: true, opacity: 0.62, side: THREE.DoubleSide });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.14, 0.07), film);
  body.position.y = -0.05;
  body.castShadow = true;
  const gusset = new THREE.Mesh(new THREE.BoxGeometry(0.112, 0.018, 0.072), std(0xe7eef4, { roughness: 0.4, transparent: true, opacity: 0.8 }));
  gusset.position.y = 0.024;
  const handle = (x) => {
    const h = new THREE.Mesh(new THREE.TorusGeometry(0.032, 0.006, 5, 12, Math.PI), std(0xe31c24, { roughness: 0.42 }));
    h.rotation.z = Math.PI / 2;
    h.position.set(x, 0.052, 0);
    return h;
  };
  const veg = sphere(0.03, std(0x6fbf4a, { roughness: 0.62 }), 8);
  veg.position.set(0.018, -0.055, 0.008);
  const tomato = sphere(0.024, std(0xe35b4c, { roughness: 0.5 }), 8);
  tomato.position.set(-0.02, -0.068, 0.01);
  const yellow = sphere(0.02, std(0xf0c14b, { roughness: 0.55 }), 8);
  yellow.position.set(0.002, -0.08, -0.012);
  g.add(body, gusset, handle(-0.03), handle(0.03), veg, tomato, yellow);
  return g;
}

function makeCow() {
  const g = new THREE.Group();
  const white = std(0xf6f3ec, { roughness: 0.8 });
  const black = std(0x1b1c22, { roughness: 0.7 });
  const pink = std(0xf0a0b0, { roughness: 0.62 });
  const snoutM = std(0xf5c4c0, { roughness: 0.52 });
  const hoofM = std(0x2c241c, { roughness: 0.48 });

  const body = rbox(0.96, 0.46, 0.52, white, 0.52, 0.14);
  g.add(body);
  const rump = sphere(0.22, white, 14);
  rump.scale.set(1.05, 0.95, 1.1);
  rump.position.set(-0.38, 0.54, 0);
  const chest = sphere(0.2, white, 14);
  chest.scale.set(1.05, 1.05, 1.12);
  chest.position.set(0.38, 0.5, 0);
  g.add(rump, chest);

  const patch = (sx, sy, sz, x, y, z) => {
    const m = sphere(0.16, black, 12);
    m.scale.set(sx, sy, sz);
    m.position.set(x, y, z);
    g.add(m);
  };
  patch(1.55, 1.05, 0.52, 0.1, 0.64, 0.24);
  patch(1.2, 0.9, 0.48, -0.28, 0.6, -0.22);
  patch(0.95, 0.72, 0.42, 0.3, 0.66, -0.18);
  patch(0.85, 0.55, 0.7, -0.06, 0.74, 0.02);
  patch(0.7, 0.85, 0.4, -0.34, 0.48, 0.2);

  const neck = sphere(0.13, white, 12);
  neck.scale.set(1.2, 1.05, 0.88);
  neck.position.set(0.46, 0.6, 0);
  g.add(neck);

  const head = new THREE.Group();
  const skull = sphere(0.155, white, 14);
  skull.scale.set(1.08, 1.02, 0.95);
  const maskL = sphere(0.068, black, 10);
  maskL.scale.set(1.15, 0.9, 0.55);
  maskL.position.set(0.05, 0.05, 0.1);
  const maskR = maskL.clone();
  maskR.position.z = -0.1;
  const eyeL = sphere(0.026, std(0x141414, { roughness: 0.35 }), 8);
  eyeL.position.set(0.12, 0.05, 0.088);
  const eyeR = eyeL.clone();
  eyeR.position.z = -0.088;
  const glintL = sphere(0.009, std(0xffffff), 6);
  glintL.position.set(0.138, 0.062, 0.094);
  const glintR = glintL.clone();
  glintR.position.z = -0.094;
  const muzzle = sphere(0.088, snoutM, 12);
  muzzle.scale.set(1.28, 0.82, 0.98);
  muzzle.position.set(0.17, -0.05, 0);
  const nostrilL = sphere(0.016, std(0xc47a86), 8);
  nostrilL.position.set(0.25, -0.04, 0.032);
  const nostrilR = nostrilL.clone();
  nostrilR.position.z = -0.032;
  const ear = (z) => {
    const e = new THREE.Group();
    const outer = sphere(0.055, white, 8);
    outer.scale.set(0.5, 1.2, 0.85);
    const inner = sphere(0.034, pink, 8);
    inner.scale.set(0.45, 1.05, 0.65);
    e.add(outer, inner);
    e.position.set(-0.04, 0.15, z);
    e.rotation.z = z > 0 ? 0.4 : -0.4;
    e.rotation.x = z > 0 ? 0.28 : -0.28;
    return e;
  };
  const horn = (z) => {
    const h = new THREE.Mesh(
      new THREE.CylinderGeometry(0.01, 0.02, 0.07, 8),
      std(0xe8dcc8, { roughness: 0.42 }),
    );
    h.position.set(-0.04, 0.2, z);
    h.rotation.z = -0.4;
    h.rotation.x = z * 1.6;
    h.castShadow = true;
    return h;
  };
  head.add(skull, maskL, maskR, eyeL, eyeR, glintL, glintR, muzzle, nostrilL, nostrilR, ear(0.14), ear(-0.14), horn(0.055), horn(-0.055));
  head.position.set(0.56, 0.64, 0);
  g.add(head);

  const udder = sphere(0.125, pink, 12);
  udder.scale.set(1.2, 0.82, 1.08);
  udder.position.set(-0.08, 0.24, 0);
  g.add(udder);
  [[-0.045, 0.055], [-0.045, -0.055], [0.04, 0.055], [0.04, -0.055]].forEach(([dx, dz]) => {
    const teat = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.055, 8), pink);
    teat.position.set(-0.08 + dx, 0.155, dz);
    g.add(teat);
  });

  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.022, 0.4, 8), white);
  tail.position.set(-0.52, 0.54, 0);
  tail.rotation.z = 0.62;
  tail.castShadow = true;
  const tuft = sphere(0.055, black, 8);
  tuft.scale.set(0.75, 1.25, 0.65);
  tuft.position.set(-0.68, 0.36, 0);
  g.add(tail, tuft);

  const leg = (x, z, sock) => {
    const lg = new THREE.Group();
    const upper = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.046, 0.3, 8),
      sock ? black : white,
    );
    upper.position.y = 0.22;
    upper.castShadow = true;
    const h = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.048, 0.07, 8), hoofM);
    h.position.y = 0.05;
    lg.add(upper, h);
    lg.position.set(x, 0, z);
    g.add(lg);
  };
  leg(0.3, 0.15, true);
  leg(0.3, -0.15, false);
  leg(-0.3, 0.15, false);
  leg(-0.3, -0.15, true);

  g.userData = { head };
  g.rotation.y = -0.55;
  return g;
}

function makePig({ spots = false, pink = 0xf3a8b8, lookY = 0, earDrop = 0.85 } = {}) {
  const g = new THREE.Group();
  const pinkM = std(pink, { roughness: 0.72 });
  const blush = std(0xee8aa0, { roughness: 0.58 });
  const snoutM = std(0xf08aa0, { roughness: 0.48 });
  const hoofM = std(0xd46b84, { roughness: 0.5 });
  const dark = std(0x2a2433, { roughness: 0.4 });

  const body = sphere(0.24, pinkM, 16);
  body.scale.set(spots ? 1.28 : 1.18, spots ? 1.02 : 0.95, spots ? 1.42 : 1.55);
  body.position.y = 0.28;
  const rump = sphere(0.15, pinkM, 12);
  rump.scale.set(1.1, 1.0, 1.05);
  rump.position.set(0, 0.28, spots ? -0.22 : -0.26);
  const chest = sphere(0.145, pinkM, 12);
  chest.scale.set(1.08, 1.05, 1.0);
  chest.position.set(0, 0.27, 0.22);
  const belly = sphere(0.13, std(0xf7c4ce, { roughness: 0.78 }), 12);
  belly.scale.set(1.1, 0.65, 1.25);
  belly.position.set(0, 0.16, 0.02);
  g.add(body, rump, chest, belly);

  const head = new THREE.Group();
  const skull = sphere(0.16, pinkM, 16);
  skull.scale.set(1.12, 1.05, 1.08);
  const cheekL = sphere(0.06, blush, 10);
  cheekL.position.set(-0.11, -0.02, 0.09);
  const cheekR = cheekL.clone();
  cheekR.position.x = 0.11;
  const eyeL = sphere(0.032, dark, 8);
  eyeL.position.set(-0.052, 0.05, 0.14);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.052;
  const glintL = sphere(0.012, std(0xffffff), 6);
  glintL.position.set(-0.042, 0.062, 0.162);
  const glintR = glintL.clone();
  glintR.position.x = 0.042;

  const snout = new THREE.Group();
  const disk = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.092, 0.07, 18), snoutM);
  disk.rotation.x = Math.PI / 2;
  disk.castShadow = true;
  const plate = new THREE.Mesh(new THREE.CircleGeometry(0.08, 18), std(0xf4a0b2, { roughness: 0.42 }));
  plate.position.z = 0.038;
  const nostril = (x) => {
    const n = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.016, 0.02, 8), std(0xc45d72, { roughness: 0.55 }));
    n.rotation.x = Math.PI / 2;
    n.position.set(x, 0.008, 0.046);
    return n;
  };
  snout.add(disk, plate, nostril(-0.026), nostril(0.026));
  snout.position.set(0, -0.03, 0.17);

  const ear = (x) => {
    const e = new THREE.Group();
    const outer = sphere(0.085, pinkM, 10);
    outer.scale.set(0.48, 1.22, 0.2);
    const inner = sphere(0.058, blush, 8);
    inner.scale.set(0.4, 1.0, 0.1);
    inner.position.z = 0.016;
    e.add(outer, inner);
    e.position.set(x, 0.1, 0.04);
    e.rotation.z = x > 0 ? -earDrop : earDrop;
    e.rotation.x = spots ? -0.38 : -0.55;
    return e;
  };

  head.add(skull, cheekL, cheekR, eyeL, eyeR, glintL, glintR, snout, ear(-0.16), ear(0.16));
  head.position.set(0, spots ? 0.4 : 0.42, spots ? 0.28 : 0.32);
  head.rotation.set(-0.36, lookY, 0);
  g.add(head);
  if (spots) {
    const spotM = std(0xc45d78, { roughness: 0.68 });
    [
      [0.16, 0.35, 0.1, 0.072],
      [-0.14, 0.32, -0.08, 0.062],
      [0.04, 0.38, -0.2, 0.055],
      [-0.1, 0.24, 0.18, 0.048],
      [0.18, 0.26, -0.12, 0.04],
      [0.05, 0.48, 0.36, 0.038],
    ].forEach(([x, y, z, r]) => {
      const s = sphere(r, spotM, 10);
      s.position.set(x, y, z);
      g.add(s);
    });
  }

  const leg = (x, z) => {
    const lg = new THREE.Group();
    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.04, 0.07, 4, 8), pinkM);
    upper.position.y = 0.11;
    upper.castShadow = true;
    const hoof = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.038, 0.04, 8), hoofM);
    hoof.position.y = 0.03;
    lg.add(upper, hoof);
    lg.position.set(x, 0, z);
    g.add(lg);
  };
  leg(0.12, 0.14);
  leg(-0.12, 0.14);
  leg(0.12, -0.14);
  leg(-0.12, -0.14);

  const tail = new THREE.Mesh(new THREE.TorusGeometry(spots ? 0.042 : 0.048, 0.014, 8, 14), pinkM);
  tail.position.set(0, spots ? 0.34 : 0.32, spots ? -0.3 : -0.34);
  tail.rotation.set(spots ? 1.05 : 0.55, Math.PI / 2, spots ? 0.35 : 0);
  tail.castShadow = true;
  g.add(tail);

  g.userData = { head, eyeL, eyeR, glintL, glintR };
  return g;
}

function makeRobot() {
  const g = new THREE.Group();
  const shell = std(0xeef3f8, { roughness: 0.3, metalness: 0.34, envMapIntensity: 0.9 });
  const shellSoft = std(0xd5dee8, { roughness: 0.38, metalness: 0.22 });
  const joint = std(0x2a3442, { roughness: 0.42, metalness: 0.58 });
  const dark = std(0x171e28, { roughness: 0.48, metalness: 0.4 });
  const visorM = std(0x2ec4ea, { roughness: 0.1, metalness: 0.28, emissive: 0x1498c8, emissiveIntensity: 1.15 });
  const glowM = std(0x4ad4f4, { roughness: 0.22, metalness: 0.12, emissive: 0x2eb6e6, emissiveIntensity: 1.35 });

  const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.122, 0.036, 16), dark);
  pad.position.y = 0.028;
  pad.castShadow = true;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.092, 0.012, 8, 22), glowM);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.014;
  const thruster = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.01, 12), visorM);
  thruster.position.y = 0.01;

  const hip = rbox(0.15, 0.055, 0.12, joint, 0.09, 0.018);
  const strut = (x) => {
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.02, 0.05, 6), joint);
    s.position.set(x, 0.058, 0);
    s.castShadow = true;
    return s;
  };
  const body = rbox(0.22, 0.22, 0.17, shell, 0.24, 0.038);
  const chest = rbox(0.13, 0.09, 0.035, shellSoft, 0.255, 0.012);
  chest.position.z = 0.078;
  const port = new THREE.Mesh(new THREE.CircleGeometry(0.022, 12), visorM);
  port.position.set(0, 0.255, 0.098);
  const vent = (x) => {
    const v = rbox(0.018, 0.09, 0.07, dark, 0.24, 0.006);
    v.position.x = x;
    return v;
  };
  const pack = rbox(0.12, 0.1, 0.05, shellSoft, 0.26, 0.016);
  pack.position.z = -0.1;

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.034, 0.046, 8), joint);
  neck.position.y = 0.372;
  neck.castShadow = true;

  const head = rbox(0.176, 0.13, 0.15, shell, 0.46, 0.042);
  const visor = rbox(0.132, 0.055, 0.036, visorM, 0.465, 0.014);
  visor.position.z = 0.072;
  const eye = (x) => {
    const e = rbox(0.032, 0.024, 0.016, glowM, 0.465, 0.005);
    e.position.set(x, 0.465, 0.09);
    return e;
  };
  const ear = (x) => {
    const e = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.028, 10), joint);
    e.rotation.z = Math.PI / 2;
    e.position.set(x, 0.46, 0.01);
    e.castShadow = true;
    return e;
  };
  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.012, 0.1, 6), joint);
  antenna.position.set(0.042, 0.58, 0);
  antenna.castShadow = true;
  const tip = sphere(0.016, glowM, 8);
  tip.position.set(0.042, 0.635, 0);

  const arm = (side) => {
    const a = new THREE.Group();
    const shoulder = sphere(0.03, joint, 8);
    shoulder.position.set(0, 0.33, 0);
    const upper = rbox(0.042, 0.11, 0.042, shellSoft, 0.25, 0.012);
    const elbow = sphere(0.02, joint, 8);
    elbow.position.y = 0.188;
    const fore = rbox(0.038, 0.09, 0.038, shellSoft, 0.128, 0.01);
    const claw = rbox(0.048, 0.028, 0.028, dark, 0.068, 0.008);
    const pincer = rbox(0.014, 0.03, 0.016, dark, 0.05, 0.004);
    pincer.position.set(side * 0.018, 0.05, 0.012);
    a.add(shoulder, upper, elbow, fore, claw, pincer);
    a.position.x = side * 0.148;
    a.rotation.z = side * 0.12;
    return a;
  };

  g.add(
    pad, ring, thruster, hip, strut(-0.05), strut(0.05), body, chest, port, vent(-0.122), vent(0.122), pack,
    neck, head, visor, eye(-0.03), eye(0.03), ear(-0.098), ear(0.098), antenna, tip, arm(-1), arm(1),
  );
  g.userData = { visor, tip, ring };
  return g;
}

function makeChick({ sit = false, lookY = 0, down = 0xf6c93a, pale = 0xffe08a, singleTuft = false } = {}) {
  const g = new THREE.Group();
  const downM = std(down, { roughness: 0.58 });
  const paleM = std(pale, { roughness: 0.68 });
  const beakM = std(0xf59e0b, { roughness: 0.42 });
  const dark = std(0x2a2433, { roughness: 0.4 });
  const bodyY = sit ? 0.15 : 0.16;

  const body = sphere(0.15, downM, 16);
  body.scale.set(sit ? 1.18 : 1.12, sit ? 0.98 : 1.02, sit ? 1.14 : 1.12);
  body.position.y = bodyY;
  const belly = sphere(0.1, paleM, 12);
  belly.scale.set(sit ? 1.12 : 1.08, 0.72, sit ? 1.1 : 1.08);
  belly.position.set(0, sit ? 0.12 : 0.12, 0.05);
  g.add(body, belly);

  const head = new THREE.Group();
  const skull = sphere(sit ? 0.118 : 0.112, downM, 16);
  const fluff = (x, y, z, r = 0.028) => {
    const f = sphere(r, downM, 8);
    f.position.set(x, y, z);
    return f;
  };
  const eye = (x) => {
    const white = sphere(0.028, std(0xffffff, { roughness: 0.4 }), 8);
    white.position.set(x, 0.016, 0.088);
    const e = sphere(0.016, dark, 8);
    e.position.set(x, 0.016, 0.108);
    const glint = sphere(0.006, std(0xffffff), 6);
    glint.position.set(x * 0.78, 0.024, 0.12);
    return [white, e, glint];
  };
  const cheek = (x) => {
    const c = sphere(sit ? 0.024 : 0.03, std(0xffb4b4, { roughness: 0.62 }), 8);
    c.position.set(x, sit ? -0.018 : -0.022, 0.07);
    return c;
  };
  const beak = new THREE.Mesh(new THREE.ConeGeometry(sit ? 0.034 : 0.03, sit ? 0.044 : 0.038, 8), beakM);
  beak.rotation.x = Math.PI / 2;
  beak.position.set(0, -0.012, sit ? 0.126 : 0.118);
  beak.castShadow = true;
  if (singleTuft) head.add(skull, fluff(0, 0.108, -0.01, 0.034), fluff(0.01, 0.09, 0.02, 0.022));
  else head.add(skull, fluff(-0.03, 0.092, 0.01), fluff(0.03, 0.092, 0.01));
  head.add(...eye(-0.038), ...eye(0.038), cheek(-0.058), cheek(0.058), beak);
  head.position.set(0, sit ? 0.29 : 0.3, 0.07);
  head.rotation.set(-0.18, lookY, 0);
  g.add(head);

  const wing = (side) => {
    const w = sphere(0.055, downM, 10);
    w.scale.set(0.42, 0.72, 1.12);
    w.position.set(side * (sit ? 0.12 : 0.1), sit ? 0.16 : 0.17, 0.02);
    w.rotation.y = side * -0.35;
    w.rotation.z = side * (sit && side > 0 ? 0.72 : 0.42);
    w.userData.restZ = w.rotation.z;
    w.userData.side = side;
    return w;
  };
  const wingL = wing(-1);
  const wingR = wing(1);
  const tail = sphere(0.048, downM, 8);
  tail.scale.set(0.7, 0.88, sit ? 1.28 : 1.15);
  tail.position.set(0, sit ? 0.17 : 0.18, sit ? -0.15 : -0.13);
  tail.rotation.x = sit ? 0.72 : 0.55;
  g.add(wingL, wingR, tail);

  const leg = (x) => {
    const lg = new THREE.Group();
    const stickH = sit ? 0.058 : 0.055;
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.017, stickH, 6), beakM);
    stick.position.y = stickH / 2;
    stick.castShadow = true;
    const foot = rbox(sit ? 0.07 : 0.038, 0.018, sit ? 0.1 : 0.048, 0xf59e0b, 0.012, 0.007);
    foot.position.set(0, 0.012, sit ? 0.042 : 0.012);
    foot.rotation.y = sit ? x * 8 : 0;
    foot.castShadow = true;
    const toe = rbox(sit ? 0.022 : 0.012, 0.012, sit ? 0.036 : 0.018, 0xf59e0b, 0.01, 0.005);
    toe.position.set(0, 0.01, sit ? 0.088 : 0.03);
    lg.add(stick, foot, toe);
    lg.position.set(sit ? x * 1.55 : x, 0, sit ? 0.08 : 0.02);
    g.add(lg);
    return lg;
  };
  const legL = leg(-0.042);
  const legR = leg(0.042);

  g.userData = { head, wingL, wingR, legL, legR };
  return g;
}

function makeCar(color, van = false) {
  const g = new THREE.Group();
  const len = van ? 0.96 : 0.78;
  const paint = candy(color);
  const glass = std(0x7ec8e8, {
    roughness: 0.06,
    metalness: 0.28,
    transparent: true,
    opacity: 0.52,
    envMapIntensity: 1.15,
  });
  const dark = std(0x1a1e24, { roughness: 0.58 });
  const chrome = std(0xd8e4ec, { roughness: 0.22, metalness: 0.55 });
  const frontZ = len / 2;
  const rearZ = -len / 2;

  const chassis = rbox(0.4, 0.05, len - 0.06, dark, 0.11, 0.015);
  g.add(chassis);

  if (van) {
    const cab = rbox(0.46, 0.26, 0.34, paint, 0.28, 0.045);
    cab.position.z = 0.28;
    const cargo = rbox(0.48, 0.38, 0.54, paint, 0.34, 0.05);
    cargo.position.z = -0.16;
    const pane = rbox(0.4, 0.15, 0.04, glass, 0.34, 0.015);
    pane.position.z = 0.44;
    const sideWin = rbox(0.02, 0.12, 0.18, glass, 0.36, 0.01);
    const sideL = sideWin.clone();
    sideL.position.set(0.24, 0.36, 0.28);
    const sideR = sideWin.clone();
    sideR.position.set(-0.24, 0.36, 0.28);
    const roof = rbox(0.44, 0.04, 0.3, paint, 0.43, 0.02);
    roof.position.z = 0.28;
    g.add(cab, cargo, pane, sideL, sideR, roof);
  } else {
    const body = rbox(0.46, 0.14, len, paint, 0.19, 0.05);
    const hood = rbox(0.44, 0.07, 0.32, paint, 0.27, 0.03);
    hood.position.z = 0.22;
    const trunk = rbox(0.44, 0.06, 0.16, paint, 0.26, 0.03);
    trunk.position.z = -0.28;
    const cabin = rbox(0.42, 0.16, 0.32, paint, 0.35, 0.04);
    cabin.position.z = -0.04;
    const roof = rbox(0.4, 0.035, 0.28, paint, 0.45, 0.018);
    roof.position.z = -0.04;
    const shield = rbox(0.36, 0.14, 0.03, glass, 0, 0.01);
    shield.position.set(0, 0.34, 0.14);
    shield.rotation.x = -0.5;
    const rearWin = rbox(0.32, 0.09, 0.025, glass, 0, 0.01);
    rearWin.position.set(0, 0.36, -0.2);
    rearWin.rotation.x = 0.38;
    const side = (x) => {
      const w = rbox(0.02, 0.1, 0.2, glass, 0.36, 0.008);
      w.position.set(x, 0.36, -0.02);
      return w;
    };
    g.add(body, hood, trunk, cabin, roof, shield, rearWin, side(0.22), side(-0.22));
  }

  const bumperF = rbox(0.5, 0.07, 0.07, chrome, 0.135, 0.02);
  bumperF.position.z = frontZ - 0.02;
  const bumperR = rbox(0.5, 0.07, 0.07, std(color, { roughness: 0.42, metalness: 0.12 }), 0.135, 0.02);
  bumperR.position.z = rearZ + 0.02;
  const grill = rbox(0.2, 0.04, 0.02, dark, 0.2, 0.006);
  grill.position.z = frontZ - 0.012;
  g.add(bumperF, bumperR, grill);

  const head = (x) => {
    const m = rbox(0.09, 0.05, 0.035, std(0xf2fbff, { emissive: 0xb8e4ff, emissiveIntensity: 0.95 }), 0.2, 0.012);
    m.position.set(x, 0.2, frontZ - 0.018);
    return m;
  };
  const tailLamp = (x) => {
    const m = rbox(0.08, 0.04, 0.03, std(0xe23b32, { emissive: 0xc02020, emissiveIntensity: 0.75 }), 0.2, 0.01);
    m.position.set(x, 0.2, rearZ + 0.018);
    return m;
  };
  const blink = (x) => {
    const m = rbox(0.035, 0.028, 0.022, std(0xf0a24b, { emissive: 0xe09030, emissiveIntensity: 0.6 }), 0.2, 0.008);
    m.position.set(x, 0.2, frontZ - 0.02);
    return m;
  };
  const mirror = (x) => {
    const arm = rbox(0.055, 0.028, 0.045, paint, van ? 0.34 : 0.32, 0.008);
    arm.position.set(x, van ? 0.34 : 0.32, van ? 0.22 : 0.16);
    return arm;
  };
  g.add(head(0.15), head(-0.15), tailLamp(0.14), tailLamp(-0.14), blink(0.23), blink(-0.23), mirror(0.26), mirror(-0.26));

  const wheel = (x, z) => {
    const w = new THREE.Group();
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.084, 0.084, 0.054, 16), dark);
    tire.rotation.z = Math.PI / 2;
    tire.castShadow = true;
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.058, 12), chrome);
    hub.rotation.z = Math.PI / 2;
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.06, 8), std(0x8aa0ae, { metalness: 0.42, roughness: 0.28 }));
    cap.rotation.z = Math.PI / 2;
    w.add(tire, hub, cap);
    w.position.set(x, 0.084, z);
    return w;
  };
  const wz = van ? 0.3 : 0.24;
  g.add(wheel(0.26, wz), wheel(-0.26, wz), wheel(0.26, -wz), wheel(-0.26, -wz));
  g.userData.len = len;
  return g;
}

function fadeGroup(root, alpha) {
  const a = Math.max(0, Math.min(1, alpha));
  root.visible = a > 0.02;
  if (!root.visible) return;
  root.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) {
      if (m.userData.baseOpacity == null) {
        m.userData.baseOpacity = m.opacity ?? 1;
        m.userData.baseDepthWrite = m.depthWrite !== false;
      }
      m.transparent = true;
      m.opacity = m.userData.baseOpacity * a;
      m.depthWrite = a > 0.82 && m.userData.baseDepthWrite;
    }
  });
}

function flutterBanner(cloth, t) {
  const pos = cloth.geometry.attributes.position;
  const rest = cloth.userData.rest;
  const half = cloth.userData.half;
  for (let i = 0; i < pos.count; i++) {
    const rx = rest[i * 3];
    const ry = rest[i * 3 + 1];
    const u = (rx + half) / (half * 2);
    const free = (1 - u) * (1 - u * 0.45);
    const rip = Math.sin(rx * 2.4 - t * 2.2 + ry * 1.1) * 0.055 * free;
    const rip2 = Math.sin(rx * 5.2 - t * 3.4) * 0.012 * free;
    const lift = Math.sin(rx * 1.8 - t * 1.8) * 0.04 * free;
    const sag = (1 - u) * (1 - u) * 0.05;
    pos.setXYZ(i, rx, ry + lift - sag, rip + rip2);
  }
  pos.needsUpdate = true;
  cloth.geometry.computeVertexNormals();
}

function makeTowBanner() {
  const tex = canvasTex(1280, 280, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const bx = 36;
    const by = 28;
    const bw = w - 72;
    const bh = h - 64;
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 34);
    const dye = ctx.createLinearGradient(0, by, 0, by + bh);
    dye.addColorStop(0, "#ffffff");
    dye.addColorStop(0.45, "#f4f9fc");
    dye.addColorStop(1, "#dce8f0");
    ctx.fillStyle = dye;
    ctx.fill();
    ctx.save();
    ctx.clip();
    for (let i = 0; i < 14; i++) {
      const x = bx + 20 + i * 84;
      ctx.fillStyle = i % 2 ? "rgba(170,196,214,0.08)" : "rgba(255,255,255,0.1)";
      ctx.fillRect(x, by, 18, bh);
    }
    ctx.strokeStyle = "#c5d5e2";
    ctx.lineWidth = 6;
    ctx.strokeRect(bx + 18, by + 16, bw - 36, bh - 32);
    ctx.font = "800 108px Geist, 'Noto Sans SC', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#2f6f9a";
    ctx.fillText("SOUTHEAST ASIA", w / 2, h / 2 - 12);
    ctx.restore();
  });
  tex.premultiplyAlpha = false;

  const half = 1.62;
  const geo = new THREE.PlaneGeometry(half * 2, 0.64, 36, 8);
  const cloth = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({
      map: tex,
      transparent: true,
      side: THREE.FrontSide,
      roughness: 0.78,
      metalness: 0,
      depthWrite: false,
      envMapIntensity: 0.5,
    }),
  );
  cloth.renderOrder = 5;
  cloth.castShadow = true;
  cloth.userData.rest = new Float32Array(geo.attributes.position.array);
  cloth.userData.half = half;
  flutterBanner(cloth, 0);

  const mastX = -1.02;
  cloth.position.set(mastX - half, -0.12, 0);
  const mast = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.018, 0.66, 10),
    std(0xc5d4dc, { roughness: 0.4, metalness: 0.18 }),
  );
  mast.position.set(mastX, -0.12, 0);

  const lineM = std(0x5c6b76, { roughness: 0.48, metalness: 0.12 });
  const line = (side) => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.74, 0.05, 0),
      new THREE.Vector3(-0.88, side * 0.1 - 0.05, 0),
      new THREE.Vector3(mastX, side * 0.28 - 0.12, 0),
    ]);
    return new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 0.009, 6, false), lineM);
  };

  const g = new THREE.Group();
  g.add(line(1), line(-1), mast, cloth);
  g.userData.cloth = cloth;
  return g;
}

function makeHeli() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.56, 6, 14), std(0xd5e4ee, { roughness: 0.32 }));
  body.rotation.z = Math.PI / 2;
  body.position.y = 0.12;
  const cabin = sphere(0.18, std(0x4f96b8, { roughness: 0.16, metalness: 0.28 }), 14);
  cabin.position.set(0.24, 0.14, 0);
  const tail = rbox(0.66, 0.06, 0.06, 0xb7c9d4, 0.12, 0.02);
  tail.position.x = -0.5;
  const stripe = rbox(0.22, 0.064, 0.064, RED, 0.12, 0.015);
  stripe.position.x = -0.38;
  const tailFin = rbox(0.09, 0.18, 0.03, 0x6a93a8, 0.22, 0.01);
  tailFin.position.set(-0.8, 0.22, 0);
  const hook = new THREE.Mesh(new THREE.TorusGeometry(0.028, 0.007, 6, 12), std(0x6a7b86, { metalness: 0.35, roughness: 0.4 }));
  hook.rotation.z = Math.PI / 2;
  hook.position.set(-0.74, 0.05, 0);
  const skid = () => {
    const s = rbox(0.7, 0.03, 0.04, 0xb7c4ce, 0, 0.01);
    s.position.y = -0.02;
    return s;
  };
  const skidL = skid(); skidL.position.z = 0.12;
  const skidR = skid(); skidR.position.z = -0.12;
  const rotor = new THREE.Group();
  rotor.add(rbox(1.45, 0.018, 0.08, 0x8aa4b5, 0, 0.008));
  rotor.add(rbox(0.08, 0.018, 1.45, 0x8aa4b5, 0, 0.008));
  rotor.position.y = 0.34;
  const banner = makeTowBanner();
  g.add(body, cabin, tail, stripe, tailFin, hook, skidL, skidR, rotor, banner);
  g.userData = { rotor, cloth: banner.userData.cloth };
  return g;
}

function makeDrone() {
  const g = new THREE.Group();
  const body = rbox(0.3, 0.09, 0.22, 0xe8eef3, 0.02, 0.025);
  const deck = rbox(0.2, 0.04, 0.14, WHITE, 0.07, 0.015);
  const stripe = rbox(0.12, 0.035, 0.18, candy(RED), 0.03, 0.01);
  const cam = sphere(0.05, std(0x1a1e24, { roughness: 0.32 }), 10);
  cam.position.set(0.14, -0.05, 0);
  const lens = sphere(0.024, std(0x38bdf8, { emissive: 0x38bdf8, emissiveIntensity: 0.7 }), 8);
  lens.position.set(0.175, -0.05, 0);
  g.add(body, deck, stripe, cam, lens);

  const rotors = [];
  [
    [0.24, 0.24, 0x22c55e],
    [-0.24, 0.24, 0xef4444],
    [0.24, -0.24, 0x22c55e],
    [-0.24, -0.24, 0xef4444],
  ].forEach(([x, z, led]) => {
    const arm = rbox(0.055, 0.04, 0.32, 0xc5d4dc, 0.02, 0.012);
    arm.position.set(x * 0.48, 0.02, z * 0.48);
    arm.rotation.y = Math.atan2(x, z);
    const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.048, 0.055, 10), std(0x94a3b8));
    motor.position.set(x, 0.05, z);
    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.15, 0.01, 22),
      std(0xcbd5e1, { transparent: true, opacity: 0.62, roughness: 0.28 }),
    );
    disc.position.set(x, 0.09, z);
    const blade = rbox(0.28, 0.012, 0.035, 0xe2e8f0, 0.095, 0.005);
    blade.position.set(x, 0.095, z);
    const light = sphere(0.02, std(led, { emissive: led, emissiveIntensity: 1.1 }), 8);
    light.position.set(x, -0.025, z);
    g.add(arm, motor, disc, blade, light);
    rotors.push(blade);
  });
  g.userData.rotors = rotors;
  g.scale.setScalar(2.05);
  return g;
}

function makeArch() {
  const g = new THREE.Group();
  const gold = candy(GOLD);
  const cream = candy(0xefd089);
  const red = candy(RED);
  const wood = std(0x7a4a28, { roughness: 0.62 });
  const woodDark = std(0x5a3218, { roughness: 0.7 });
  const span = 1.46;
  const mid = span / 2;

  function column(x) {
    const c = new THREE.Group();
    const plinth = rbox(0.38, 0.11, 0.38, 0xd7b56c, 0.055, 0.03);
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.185, 0.12, 20), gold);
    foot.position.y = 0.17;
    foot.castShadow = true;
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.145, 1.18, 22), cream);
    shaft.position.y = 0.82;
    shaft.castShadow = true;
    const ringLo = new THREE.Mesh(new THREE.TorusGeometry(0.145, 0.024, 8, 24), red);
    ringLo.rotation.x = Math.PI / 2;
    ringLo.position.y = 0.26;
    const ringHi = ringLo.clone();
    ringHi.position.y = 1.36;
    const capital = new THREE.Mesh(new THREE.CylinderGeometry(0.175, 0.13, 0.11, 20), gold);
    capital.position.y = 1.46;
    capital.castShadow = true;
    const knob = sphere(0.07, red, 14);
    knob.position.y = 1.56;
    const tip = sphere(0.026, gold, 10);
    tip.position.y = 1.64;
    const jamb = rbox(0.08, 1.28, 0.22, gold, 0.74, 0.02);
    jamb.position.x = x < mid ? 0.11 : -0.11;
    c.add(plinth, foot, shaft, ringLo, ringHi, capital, knob, tip, jamb);
    c.position.x = x;
    return c;
  }

  g.add(column(0), column(span));

  const beam = rbox(span + 0.48, 0.14, 0.36, gold, 1.56, 0.04);
  beam.position.x = mid;
  const fascia = rbox(span + 0.7, 0.5, 0.28, red, 1.88, 0.06);
  fascia.position.x = mid;
  const trim = rbox(span + 0.78, 0.055, 0.32, gold, 2.15, 0.02);
  trim.position.x = mid;
  const roof = rbox(span + 0.86, 0.08, 0.44, red, 2.22, 0.035);
  roof.position.x = mid;
  g.add(beam, fascia, trim, roof);

  const plaqueTex = canvasTex(840, 160, (ctx, w, h) => {
    ctx.fillStyle = "#e31c24";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#f0d48a";
    ctx.lineWidth = 12;
    ctx.strokeRect(12, 12, w - 24, h - 24);
    ctx.fillStyle = "#f7e6a8";
    ctx.font = "700 72px 'Noto Sans SC', 'Microsoft YaHei', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("温氏股份未来牧场", w / 2, h / 2 + 2);
  });
  const plaque = new THREE.Mesh(
    new THREE.PlaneGeometry(1.92, 0.44),
    new THREE.MeshBasicMaterial({ map: plaqueTex }),
  );
  plaque.position.set(mid, 1.88, 0.16);
  g.add(plaque);

  const step = rbox(span - 0.22, 0.06, 0.46, 0xd2ae6a, 0.03, 0.025);
  step.position.set(mid, 0.03, 0.06);
  const sill = rbox(span - 0.3, 0.04, 0.13, gold, 0.08, 0.015);
  sill.position.set(mid, 0.08, 0.02);
  g.add(step, sill);

  function door(hingeX, side) {
    const d = new THREE.Group();
    const w = 0.56;
    const leaf = rbox(w, 1.28, 0.07, wood, 0.74, 0.02);
    leaf.position.x = side * (w / 2);
    const insetT = rbox(w - 0.14, 0.46, 0.03, woodDark, 0.98, 0.01);
    insetT.position.set(side * (w / 2), 0.98, 0.026);
    const insetB = rbox(w - 0.14, 0.42, 0.03, woodDark, 0.46, 0.01);
    insetB.position.set(side * (w / 2), 0.46, 0.026);
    const bar = rbox(w - 0.1, 0.05, 0.04, gold, 0.74, 0.01);
    bar.position.set(side * (w / 2), 0.74, 0.028);
    const handle = sphere(0.028, gold, 10);
    handle.position.set(side * (w - 0.1), 0.74, 0.055);
    d.add(leaf, insetT, insetB, bar, handle);
    d.position.set(hingeX, 0.06, 0.03);
    d.rotation.y = side * 0.96;
    return d;
  }
  g.add(door(0.16, 1), door(span - 0.16, -1));

  g.position.set(-5.92, 0, 1.42);
  return g;
}

function monitor(x, y, z) {
  const g = new THREE.Group();
  const screen = rbox(0.22, 0.14, 0.02, std(0x7ec8e8, { emissive: 0x3aa0c8, emissiveIntensity: 0.55 }), 0, 0.01);
  const stand = box(0.03, 0.08, 0.03, 0xd5e0e8, 0);
  stand.position.y = -0.1;
  g.add(screen, stand);
  g.position.set(x, y, z);
  return g;
}

function labGlass() {
  return new THREE.MeshPhysicalMaterial({
    color: 0x38bdf8,
    metalness: 0,
    roughness: 0.08,
    transparent: true,
    opacity: 0.38,
    transmission: 0.82,
    thickness: 0.55,
    ior: 1.5,
    specularIntensity: 1,
    envMapIntensity: 1.15,
    attenuationColor: new THREE.Color(0x7dd3fc),
    attenuationDistance: 1.4,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
}

function makeLab() {
  const g = new THREE.Group();
  const white = std(WHITE, { roughness: 0.42 });
  const glass = labGlass();
  const blue = std(0x3b9eff, { roughness: 0.28, metalness: 0.18, emissive: 0x1a7ad0, emissiveIntensity: 0.45 });
  const cut = 1.48;
  const start = Math.PI / 2 + cut / 2;
  const span = Math.PI * 2 - cut;

  function floorDisc(r, y, color = 0xe7f3f8) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.07, 48), std(color));
    m.position.y = y;
    m.receiveShadow = true;
    m.castShadow = true;
    g.add(m);
  }
  function ringAt(r, y, tube = 0.05) {
    const m = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 10, 48), white);
    m.rotation.x = Math.PI / 2;
    m.position.y = y;
    g.add(m);
  }
  function glassShell(r, h, y) {
    const shell = new THREE.Mesh(
      new THREE.CylinderGeometry(r, r, h, 48, 1, true, start, span),
      glass,
    );
    shell.position.y = y;
    shell.renderOrder = 2;
    g.add(shell);
  }
  function posts(r, y, h, n = 8) {
    for (let i = 0; i < n; i++) {
      const a = start + 0.04 + (i / (n - 1)) * (span - 0.08);
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, h, 10), white);
      col.position.set(Math.cos(a) * r, y, Math.sin(a) * r);
      col.castShadow = true;
      g.add(col);
    }
  }
  function lamp(x, y, z) {
    const m = sphere(0.055, std(0xfff1c2, { emissive: 0xffe08a, emissiveIntensity: 0.9 }), 10);
    m.position.set(x, y, z);
    g.add(m);
  }
  function plant(x, y, z, s = 1, variant = 0) {
    const potM = std(0xd9895a, { roughness: 0.52 });
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.075 * s, 0.058 * s, 0.09 * s, 12), potM);
    pot.position.set(x, y + 0.045 * s, z);
    pot.castShadow = true;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.075 * s, 0.012 * s, 6, 14), potM);
    rim.rotation.x = Math.PI / 2;
    rim.position.set(x, y + 0.09 * s, z);
    const soil = new THREE.Mesh(
      new THREE.CylinderGeometry(0.062 * s, 0.062 * s, 0.014 * s, 12),
      std(0x5c4030, { roughness: 0.9 }),
    );
    soil.position.set(x, y + 0.092 * s, z);
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012 * s, 0.016 * s, 0.09 * s, 6),
      std(0x6a8f3a, { roughness: 0.8 }),
    );
    stem.position.set(x, y + 0.13 * s, z);
    g.add(pot, rim, soil, stem);
    const greens = [
      [0x7ed957, 0x5cb830, 0xa8ee72, 0x6fc44a],
      [0x9edc62, 0xb6ec7a, 0x4ea326, 0xc8f48c],
      [0x8fd056, 0xb0e872, 0x63b34a, 0xd4f8a0],
    ][variant % 3];
    [
      [0, 0.24, 0, 0.115],
      [0.075, 0.21, 0.035, 0.085],
      [-0.065, 0.2, -0.025, 0.08],
      [0.02, 0.3, -0.045, 0.072],
      [-0.04, 0.28, 0.05, 0.068],
    ].forEach(([px, py, pz, r], i) => {
      const m = sphere(r * s, std(greens[i % greens.length], { roughness: 0.82 }), 12);
      m.position.set(x + px * s, y + py * s, z + pz * s);
      g.add(m);
    });
  }
  function scope(x, y, z) {
    const base = rbox(0.1, 0.04, 0.1, 0xc5d0d8, y, 0.015);
    base.position.set(x, y, z);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.16, 8), std(0xb0bec5));
    arm.position.set(x, y + 0.1, z);
    const eyep = sphere(0.032, std(0x3a4a58), 8);
    eyep.position.set(x, y + 0.18, z);
    g.add(base, arm, eyep);
  }

  floorDisc(1.28, 0.1, 0xc5ebe4);
  floorDisc(1.14, 1.32, 0xdfe6ee);
  floorDisc(1.16, 2.48, 0xf4fafc);
  ringAt(1.26, 0.14, 0.062);
  ringAt(1.24, 1.22, 0.055);
  ringAt(1.14, 1.36, 0.06);
  ringAt(1.12, 2.42, 0.055);
  ringAt(1.14, 2.52, 0.05);
  glassShell(1.26, 1.08, 0.68);
  glassShell(1.14, 1.02, 1.9);
  posts(1.26, 0.68, 1.12, 8);
  posts(1.14, 1.9, 1.08, 7);

  const core = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 2.38, 14), white);
  core.position.y = 1.24;
  core.castShadow = true;
  g.add(core);

  const rail1 = new THREE.Mesh(new THREE.TorusGeometry(1.02, 0.022, 8, 36, span * 0.86), white);
  rail1.rotation.x = Math.PI / 2;
  rail1.rotation.z = start + 0.08;
  rail1.position.y = 1.52;
  const rail2 = rail1.clone();
  rail2.position.y = 2.18;
  g.add(rail1, rail2);

  for (let i = 0; i < 10; i++) {
    const a = 2.12 - i * 0.085;
    const y = 0.18 + i * 0.112;
    const step = rbox(0.3, 0.05, 0.16, WHITE, y, 0.012);
    step.position.set(Math.cos(a) * 0.96, y, Math.sin(a) * 0.96);
    step.rotation.y = -a;
    g.add(step);
  }

  const tubeColors = [0x22d3ee, 0xf59e0b, 0xef4444, 0xa3e635, 0xc084fc, 0x38bdf8, 0xfb7185, 0x2dd4bf];
  const tube = (x, y, z, c, h = 0.15) => {
    const m = new THREE.Mesh(
      new THREE.CylinderGeometry(0.016, 0.016, h, 8),
      std(c, { roughness: 0.18, transparent: true, opacity: 0.92, emissive: c, emissiveIntensity: 0.42 }),
    );
    m.position.set(x, y, z);
    m.castShadow = true;
    g.add(m);
  };
  const flask = (x, y, z, c) => {
    const bulb = sphere(0.04, std(c, { roughness: 0.22, emissive: c, emissiveIntensity: 0.2 }), 10);
    bulb.position.set(x, y, z);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.07, 8), std(0xdbeafe, { roughness: 0.15, transparent: true, opacity: 0.55 }));
    neck.position.set(x, y + 0.05, z);
    g.add(bulb, neck);
  };
  const plaque = (text, x, y, z, w = 0.36) => {
    const tex = canvasTex(220, 56, (ctx, cw, ch) => {
      ctx.fillStyle = "#1e3a5f";
      ctx.fillRect(0, 0, cw, ch);
      ctx.fillStyle = "#e2e8f0";
      ctx.font = "700 28px 'Noto Sans SC', 'Microsoft YaHei', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, cw / 2, ch / 2 + 1);
    });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, 0.1), new THREE.MeshBasicMaterial({ map: tex }));
    m.position.set(x, y, z);
    g.add(m);
  };

  const wetBench = rbox(0.95, 0.28, 0.3, WHITE, 0.26, 0.03);
  wetBench.position.set(-0.08, 0.26, -0.42);
  g.add(wetBench);
  const rack = (cx, cz) => {
    const tray = rbox(0.28, 0.025, 0.16, 0xb0bec5, 0.455, 0.006);
    tray.position.set(cx, 0.455, cz);
    g.add(tray);
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 5; j++) {
        tube(cx - 0.1 + j * 0.05, 0.55, cz - 0.05 + i * 0.05, tubeColors[(i * 5 + j) % tubeColors.length]);
      }
    }
  };
  const frontIsland = rbox(0.58, 0.26, 0.3, WHITE, 0.26, 0.03);
  frontIsland.position.set(-0.42, 0.26, 0.42);
  g.add(frontIsland);
  rack(-0.58, 0.42);
  rack(-0.26, 0.42);
  rack(0.08, -0.38);
  flask(-0.72, 0.5, 0.32, 0x22d3ee);
  flask(-0.08, 0.5, 0.32, 0xf59e0b);
  const hood = rbox(0.42, 0.52, 0.28, WHITE, 0.7, 0.03);
  hood.position.set(-0.78, 0.7, -0.18);
  const hoodGlass = rbox(0.36, 0.28, 0.02, glassMat(0.35), 0.78, 0.008);
  hoodGlass.position.set(-0.78, 0.78, -0.04);
  g.add(hood, hoodGlass);
  plaque("试管区", -0.42, 0.58, 0.58, 0.34);

  const sideBench = rbox(0.28, 0.3, 0.7, WHITE, 0.28, 0.03);
  sideBench.position.set(0.72, 0.28, 0.05);
  g.add(sideBench);
  for (let i = 0; i < 8; i++) {
    tube(0.72, 0.52, -0.18 + i * 0.07, tubeColors[i % tubeColors.length], 0.13);
  }

  const desk = rbox(0.72, 0.08, 0.36, 0xcfd8e3, 1.52, 0.03);
  desk.position.set(0.28, 1.52, 0.18);
  const deskLeg = rbox(0.68, 0.16, 0.32, WHITE, 1.4, 0.02);
  deskLeg.position.set(0.28, 1.4, 0.18);
  g.add(desk, deskLeg);
  g.add(monitor(0.08, 1.66, 0.12), monitor(0.42, 1.66, 0.16));
  scope(0.55, 1.54, 0.22);
  [0xf8fafc, 0xbae6fd, 0xfde68a].forEach((c, i) => {
    const s = rbox(0.08, 0.008, 0.05, c, 1.57, 0.004);
    s.position.set(0.12 + i * 0.1, 1.57, 0.28);
    g.add(s);
  });
  plaque("研究区", 0.28, 1.78, 0.38, 0.32);

  const dashTex = canvasTex(320, 160, (ctx, w, h) => {
    ctx.fillStyle = "#071525";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#1d4ed8";
    ctx.fillRect(0, 0, w, 22);
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "700 16px 'Noto Sans SC', 'Microsoft YaHei', sans-serif";
    ctx.fillText("数据监测", 12, 16);
    const bars = [0.55, 0.82, 0.4, 0.7, 0.92, 0.6];
    bars.forEach((v, i) => {
      ctx.fillStyle = ["#22d3ee", "#38bdf8", "#818cf8", "#34d399", "#f59e0b", "#fb7185"][i];
      ctx.fillRect(14 + i * 28, h - 18 - v * 90, 20, v * 90);
    });
    ctx.strokeStyle = "#22d3ee";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(190, 120);
    ctx.bezierCurveTo(210, 70, 230, 100, 250, 55);
    ctx.lineTo(280, 80);
    ctx.lineTo(305, 48);
    ctx.stroke();
    ctx.fillStyle = "#34d399";
    ctx.fillRect(190, 28, 54, 10);
    ctx.fillStyle = "#f59e0b";
    ctx.fillRect(250, 28, 40, 10);
  });
  const wallScreen = new THREE.Group();
  const screenBezel = rbox(0.92, 0.46, 0.05, 0x0f172a, 0, 0.012);
  const dash = new THREE.Mesh(
    new THREE.PlaneGeometry(0.84, 0.38),
    new THREE.MeshBasicMaterial({ map: dashTex }),
  );
  dash.position.z = 0.03;
  const screenGlow = rbox(0.88, 0.42, 0.02, std(0x22d3ee, { emissive: 0x22d3ee, emissiveIntensity: 0.35 }), 0, 0.008);
  screenGlow.position.z = 0.016;
  wallScreen.add(screenBezel, screenGlow, dash);
  wallScreen.position.set(-0.86, 1.9, 0.1);
  wallScreen.rotation.y = Math.PI / 2;
  g.add(wallScreen);
  const screenTag = canvasTex(220, 56, (ctx, cw, ch) => {
    ctx.fillStyle = "#1e3a5f";
    ctx.fillRect(0, 0, cw, ch);
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "700 28px 'Noto Sans SC', 'Microsoft YaHei', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("数据大屏", cw / 2, ch / 2 + 1);
  });
  const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.1), new THREE.MeshBasicMaterial({ map: screenTag }));
  tag.position.set(0, 0.3, 0.03);
  wallScreen.add(tag);

  lamp(0.35, 1.12, 0.2);
  lamp(-0.3, 1.12, 0.15);
  lamp(0.2, 2.32, 0.1);
  lamp(-0.25, 2.32, 0.18);
  plant(0.42, 2.52, 0.2, 1.12, 0);
  plant(-0.35, 2.52, 0.15, 0.95, 1);
  plant(0.1, 2.52, -0.28, 0.82, 2);

  const tx = 1.42;
  const tz = 0.28;
  const slabM = std(0xd8e4ec, { roughness: 0.48, metalness: 0.1 });
  const soffitM = std(0xa9bbc8, { roughness: 0.62 });
  const deck = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.6, 0.11, 32), slabM);
  deck.position.set(tx, 1.155, tz);
  deck.castShadow = true;
  deck.receiveShadow = true;
  const soffit = new THREE.Mesh(new THREE.CylinderGeometry(0.555, 0.555, 0.028, 32), soffitM);
  soffit.position.set(tx, 1.086, tz);
  const lawnPad = new THREE.Mesh(
    new THREE.CylinderGeometry(0.52, 0.52, 0.04, 32),
    std(0x6fbf3a, { roughness: 0.85 }),
  );
  lawnPad.position.set(tx, 1.228, tz);
  lawnPad.receiveShadow = true;
  const fascia = new THREE.Mesh(new THREE.TorusGeometry(0.59, 0.042, 8, 36), blue);
  fascia.rotation.x = Math.PI / 2;
  fascia.position.set(tx, 1.155, tz);
  const lip = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.56, 0.045, 32), soffitM);
  lip.position.set(tx, 1.058, tz);
  g.add(deck, soffit, lawnPad, fascia, lip);
  const ribM = std(0x8ea3b2, { roughness: 0.55, metalness: 0.08 });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.022, 0.5), ribM);
    rib.position.set(tx + Math.cos(a) * 0.08, 1.07, tz + Math.sin(a) * 0.08);
    rib.rotation.y = -a;
    g.add(rib);
  }
  for (let i = 0; i < 4; i++) {
    const a = 0.4 + i * 1.45;
    const lampPad = new THREE.Mesh(
      new THREE.CylinderGeometry(0.032, 0.032, 0.012, 12),
      std(0xf4fbff, { emissive: 0xfff4c8, emissiveIntensity: 0.7, roughness: 0.3 }),
    );
    lampPad.position.set(tx + Math.cos(a) * 0.3, 1.062, tz + Math.sin(a) * 0.3);
    g.add(lampPad);
  }
  [[-0.18, 0.12], [-0.18, -0.1]].forEach(([dx, dz]) => {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.055, 0.09), white);
    beam.position.set(tx + dx - 0.12, 1.145, tz + dz);
    beam.rotation.y = -0.2;
    beam.castShadow = true;
    g.add(beam);
  });
  const botOut = makeRobot();
  botOut.scale.setScalar(1);
  botOut.position.set(1.22, 1.26, 0.48);
  botOut.rotation.y = 0.4;
  g.add(botOut);
  const chick = makeChick();
  chick.scale.setScalar(1.28);
  chick.position.set(1.62, 1.26, 0.22);
  chick.rotation.set(-0.28, 0.18, 0);
  g.add(chick);
  g.userData.chick = chick;

  const annex = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.44, 0.72, 24, 1, true, -0.4, 3.6),
    glass,
  );
  annex.position.set(1.38, 0.44, 0.28);
  annex.renderOrder = 2;
  g.add(annex);
  [0xf59e0b, 0xef4444, 0x22c55e].forEach((c, i) => {
    const crate = rbox(0.12, 0.1, 0.12, c, 0.22, 0.03);
    crate.position.set(1.28 + (i % 2) * 0.14, 0.22, 0.18 + Math.floor(i / 2) * 0.14);
    g.add(crate);
  });

  g.userData.crew = [];
  g.position.set(-2.48, 0, 2.02);
  return g;
}

function makeHouse() {
  const g = new THREE.Group();
  const wallM = std(0xf7f1e6, { roughness: 0.62 });
  const woodM = std(0xc48a4a, { roughness: 0.5 });
  const W = 2.15;
  const D = 1.72;
  const wallH = 1.16;
  const thick = 0.08;
  const backZ = -D / 2 + thick / 2;
  const leftX = -W / 2 + thick / 2;
  const rightX = W / 2 - thick / 2;

  const floor = rbox(W, 0.06, D, 0xe7c992, 0.03, 0.02);
  const wallShape = new THREE.Shape();
  wallShape.moveTo(-W / 2, 0.03);
  wallShape.lineTo(W / 2, 0.03);
  wallShape.lineTo(W / 2, 0.03 + wallH);
  wallShape.lineTo(-W / 2, 0.03 + wallH);
  wallShape.closePath();
  const winHole = new THREE.Path();
  winHole.moveTo(-0.33, 0.62);
  winHole.lineTo(0.33, 0.62);
  winHole.lineTo(0.33, 1.02);
  winHole.lineTo(-0.33, 1.02);
  winHole.closePath();
  wallShape.holes.push(winHole);
  const back = new THREE.Mesh(
    new THREE.ExtrudeGeometry(wallShape, { depth: thick, bevelEnabled: false }),
    wallM,
  );
  back.position.z = -D / 2;
  back.castShadow = true;
  back.receiveShadow = true;
  const left = rbox(thick, wallH, D, wallM, wallH / 2 + 0.03, 0.02);
  left.position.x = leftX;
  const right = rbox(thick, wallH, D, wallM, wallH / 2 + 0.03, 0.02);
  right.position.x = rightX;
  const wainscot = (w, d, x, z) => {
    const band = rbox(w, 0.22, d, 0xf3e0c4, 0.17, 0.01);
    band.position.set(x, 0.17, z);
    g.add(band);
  };
  wainscot(W - 0.04, 0.02, 0, backZ + 0.03);
  wainscot(0.02, D - 0.04, leftX + 0.03, 0);
  wainscot(0.02, D - 0.04, rightX - 0.03, 0);

  const pitch = 0.38;
  const roofM = std(0x7ec85a, { roughness: 0.45 });
  const roofL = rbox(1.28, 0.07, D + 0.1, roofM, 0, 0.02);
  roofL.rotation.z = pitch;
  roofL.position.set(-0.54, 1.5, 0);
  const roofR = rbox(1.28, 0.07, D + 0.1, roofM, 0, 0.02);
  roofR.rotation.z = -pitch;
  roofR.position.set(0.54, 1.5, 0);
  const solar = rbox(0.7, 0.025, 0.82, std(0x1e4a72, { metalness: 0.45, roughness: 0.25 }), 0, 0.008);
  solar.rotation.z = pitch;
  solar.position.set(-0.54 - Math.sin(pitch) * 0.05, 1.56, -0.12);
  g.add(floor, back, left, right, roofL, roofR, solar);

  const viewTex = canvasTex(128, 80, (ctx, w, h) => {
    ctx.fillStyle = "#58c43a";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#3fa326";
    ctx.fillRect(0, h * 0.42, w, h);
    ctx.fillStyle = "#7ad64c";
    ctx.beginPath();
    ctx.ellipse(28, 22, 16, 12, 0, 0, Math.PI * 2);
    ctx.ellipse(98, 26, 14, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#2f8a1c";
    ctx.fillRect(0, h * 0.7, w, 4);
    ctx.fillRect(0, h * 0.86, w, 3);
  });
  const lawnView = new THREE.Mesh(
    new THREE.PlaneGeometry(0.64, 0.38),
    new THREE.MeshBasicMaterial({ map: viewTex }),
  );
  lawnView.position.set(0, 0.82, backZ + 0.01);
  const frameBar = (bw, bh, bx, by) => {
    const bar = rbox(bw, bh, 0.05, woodM, by, 0.008);
    bar.position.set(bx, by, backZ + 0.04);
    g.add(bar);
  };
  frameBar(0.76, 0.05, 0, 1.04);
  frameBar(0.76, 0.05, 0, 0.6);
  frameBar(0.05, 0.44, -0.355, 0.82);
  frameBar(0.05, 0.44, 0.355, 0.82);
  const mullion = rbox(0.03, 0.36, 0.03, woodM, 0.82, 0.008);
  mullion.position.z = backZ + 0.045;
  const curtain = (x) => {
    const c = rbox(0.1, 0.58, 0.035, 0xf2b7b0, 0.78, 0.02);
    c.position.set(x, 0.78, backZ + 0.07);
    return c;
  };
  g.add(lawnView, mullion, curtain(-0.44), curtain(0.44));

  const frameTex = (bg, inner) => canvasTex(64, 80, (ctx, w, h) => {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = inner;
    ctx.fillRect(8, 10, w - 16, h - 20);
  });
  const picture = (x, y, w, h, tex) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({ map: tex }),
    );
    m.position.set(x, y, backZ + 0.045);
    g.add(m);
  };
  picture(-0.82, 0.78, 0.22, 0.28, frameTex("#c47a3a", "#7ec85a"));
  picture(0.82, 0.72, 0.2, 0.24, frameTex("#d4a056", "#f0c14b"));

  const clock = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.03, 20), std(0xf7f4ee));
  clock.rotation.x = Math.PI / 2;
  clock.position.set(0, 1.08, backZ + 0.05);
  const hour = rbox(0.016, 0.05, 0.01, 0x2a2433, 0, 0.004);
  hour.position.set(0, 1.09, backZ + 0.07);
  hour.rotation.z = -0.55;
  const minute = rbox(0.012, 0.07, 0.01, 0x2a2433, 0, 0.004);
  minute.position.set(0, 1.1, backZ + 0.072);
  minute.rotation.z = 0.4;
  g.add(clock, hour, minute);

  const sideboard = rbox(0.72, 0.28, 0.18, woodM, 0.2, 0.03);
  sideboard.position.set(0.02, 0.2, backZ + 0.16);
  const vase = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.038, 0.1, 8), std(0xe35b4c));
  vase.position.set(-0.18, 0.4, backZ + 0.16);
  const blooms = sphere(0.05, std(0xf0a0b8, { roughness: 0.7 }), 8);
  blooms.position.set(-0.18, 0.48, backZ + 0.16);
  const photo = rbox(0.12, 0.1, 0.02, 0xf4efe6, 0.42, 0.006);
  photo.position.set(0.16, 0.42, backZ + 0.16);
  g.add(sideboard, vase, blooms, photo);

  const books = [
    [0x3aa37a, -0.08],
    [0x4b7fd4, 0],
    [0xd45b5b, 0.08],
  ];
  books.forEach(([c, x]) => {
    const b = rbox(0.055, 0.12, 0.09, c, 0.42, 0.01);
    b.position.set(0.42 + x, 0.42, backZ + 0.16);
    g.add(b);
  });

  const rug = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.44, 0.02, 24), std(0xc45c48, { roughness: 0.82 }));
  rug.position.set(0.08, 0.07, 0.1);
  g.add(rug);

  const table = rbox(0.92, 0.05, 0.52, woodM, 0.4, 0.03);
  table.position.set(0.08, 0.4, 0.1);
  const cloth = rbox(0.82, 0.012, 0.42, 0xf4efe4, 0.43, 0.02);
  cloth.position.set(0.08, 0.43, 0.1);
  [[-0.32, -0.16], [0.32, -0.16], [-0.32, 0.16], [0.32, 0.16]].forEach(([x, z]) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.38, 8), woodM);
    leg.position.set(0.08 + x, 0.2, 0.1 + z);
    leg.castShadow = true;
    g.add(leg);
  });
  g.add(table, cloth);

  const plate = (x, z) => {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.078, 0.012, 16), std(0xf8f4ee, { roughness: 0.35 }));
    p.position.set(x, 0.445, z);
    p.castShadow = true;
    g.add(p);
  };
  const rice = (x, z) => {
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.046, 0.028, 12), std(0xf2ece4));
    bowl.position.set(x, 0.455, z);
    const mound = sphere(0.032, std(0xf7f1dc, { roughness: 0.7 }), 8);
    mound.scale.y = 0.55;
    mound.position.set(x, 0.472, z);
    g.add(bowl, mound);
  };
  const dish = (x, z, color, r = 0.028) => {
    const food = sphere(r, std(color, { roughness: 0.55 }), 8);
    food.scale.y = 0.45;
    food.position.set(x, 0.46, z);
    g.add(food);
  };
  plate(0.08, -0.06);
  plate(-0.18, 0.12);
  plate(0.34, 0.12);
  rice(0.22, -0.04);
  rice(-0.06, 0.18);
  rice(0.22, 0.2);
  dish(0.08, -0.05, 0xb45309, 0.03);
  dish(-0.18, 0.13, 0x6fbf4a, 0.026);
  dish(0.34, 0.13, 0xe35b4c, 0.026);

  const roast = sphere(0.08, std(0xb45309, { roughness: 0.42 }), 12);
  roast.scale.set(1.25, 0.72, 0.95);
  roast.position.set(0.08, 0.5, 0.08);
  const drum = (side) => {
    const d = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.055, 4, 8), std(0xc4621a));
    d.position.set(0.08 + side * 0.09, 0.5, 0.08);
    d.rotation.z = side * 0.9;
    d.rotation.x = 0.35;
    g.add(d);
  };
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.078, 0.06, 14), std(0xde5a3a));
  pot.position.set(-0.12, 0.47, 0.02);
  const soup = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.012, 14), std(0xf0a04a, { roughness: 0.3 }));
  soup.position.set(-0.12, 0.5, 0.02);
  const greens = sphere(0.055, std(0x5aa046, { roughness: 0.7 }), 8);
  greens.scale.set(1.2, 0.4, 1.05);
  greens.position.set(0.28, 0.47, 0);
  const cup = (x, z) => {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.02, 0.032, 8), std(0xf2d2a0));
    c.position.set(x, 0.46, z);
    g.add(c);
  };
  cup(0.0, -0.16);
  cup(-0.28, 0.2);
  cup(0.4, 0.2);
  const chop = (x, z, a) => {
    const s = rbox(0.01, 0.01, 0.1, 0x2c241c, 0.448, 0.004);
    s.position.set(x, 0.448, z);
    s.rotation.y = a;
    g.add(s);
  };
  chop(0.16, -0.12, 0.4);
  chop(0.18, -0.1, 0.55);
  g.add(roast, pot, soup, greens);

  const steam = [0, 1, 2, 3].map((i) => {
    const s = new THREE.Mesh(
      new THREE.SphereGeometry(0.018, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, depthWrite: false }),
    );
    s.position.set(0.08 + (i % 2) * 0.04 - 0.02, 0.54, 0.08);
    s.renderOrder = 6;
    g.add(s);
    return s;
  });

  const chair = (x, z, ry) => {
    const c = new THREE.Group();
    const seat = rbox(0.18, 0.04, 0.18, 0xb88752, 0.24, 0.02);
    const backr = rbox(0.18, 0.22, 0.035, 0xb88752, 0.36, 0.02);
    backr.position.z = -0.08;
    const base = rbox(0.16, 0.2, 0.16, 0xa87844, 0.12, 0.02);
    c.add(seat, backr, base);
    c.position.set(x, 0, z);
    c.rotation.y = ry;
    g.add(c);
  };
  chair(0.08, -0.28, 0);
  chair(-0.32, 0.12, Math.PI / 2);
  chair(0.48, 0.12, -Math.PI / 2);

  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 0.1, 12, 1, true), std(0xffe7a8, { emissive: 0xffcc66, emissiveIntensity: 0.55, side: THREE.DoubleSide }));
  shade.position.set(0.08, 1.0, 0.1);
  const bulb = sphere(0.045, std(0xfff3c4, { emissive: 0xffe08a, emissiveIntensity: 0.9 }), 10);
  bulb.position.set(0.08, 0.96, 0.1);
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.18, 6), std(0xc5c0b8));
  cord.position.set(0.08, 1.12, 0.1);
  g.add(shade, bulb, cord);

  const counter = rbox(0.72, 0.36, 0.28, 0xe8dcc8, 0.24, 0.03);
  counter.position.set(-0.62, 0.24, -0.58);
  const stove = rbox(0.28, 0.02, 0.2, 0x2a2a32, 0.43, 0.008);
  stove.position.set(-0.7, 0.43, -0.58);
  const kettle = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), std(0xe35b4c, { roughness: 0.35, metalness: 0.2 }));
  kettle.position.set(-0.52, 0.48, -0.58);
  const kettleTop = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.03, 8), std(0xc44838));
  kettleTop.position.set(-0.52, 0.54, -0.58);
  const board = rbox(0.16, 0.015, 0.1, 0xd2a06a, 0.43, 0.008);
  board.position.set(-0.38, 0.43, -0.5);
  const fridge = rbox(0.28, 0.7, 0.26, WHITE, 0.41, 0.03);
  fridge.position.set(-0.88, 0.41, -0.18);
  const fridgeBar = rbox(0.02, 0.22, 0.02, 0xc5c0b8, 0.48, 0.006);
  fridgeBar.position.set(-0.74, 0.48, -0.18);
  g.add(counter, stove, kettle, kettleTop, board, fridge, fridgeBar);

  const plantPot = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.08, 8), std(0xc45c48));
  plantPot.position.set(0.88, 0.1, -0.62);
  const plant = sphere(0.12, std(0x5aa046), 10);
  plant.position.set(0.88, 0.24, -0.62);
  g.add(plantPot, plant);

  const shelf = rbox(0.08, 0.42, 0.36, woodM, 0.62, 0.02);
  shelf.position.set(rightX - 0.06, 0.62, 0.28);
  [[0xf0c14b, 0.52], [0x4b7fd4, 0.68], [0xe8a0b8, 0.84]].forEach(([c, y]) => {
    const bin = rbox(0.1, 0.08, 0.1, c, y, 0.02);
    bin.position.set(rightX - 0.08, y, 0.18);
    g.add(bin);
  });
  g.add(shelf);

  const sit = (p, faceCam = false) => {
    p.userData.legL.rotation.x = 1.18;
    p.userData.legR.rotation.x = 1.18;
    p.userData.legL.position.z = 0.045;
    p.userData.legR.position.z = 0.045;
    p.userData.armL.rotation.x = -0.95;
    p.userData.armR.rotation.x = -0.7;
    p.userData.head.rotation.x = faceCam ? -0.22 : 0.12;
    p.userData.faceCam = faceCam;
  };
  const seats = [
    { x: 0.08, z: -0.26, ry: 0, body: 0x3aa37a, pants: 0x2d8a64, hair: 0x2c241c, faceCam: true },
    { x: -0.3, z: 0.12, ry: Math.PI / 2, body: 0x4b7fd4, pants: 0x3a68b0, hair: 0x3a3020 },
    { x: 0.46, z: 0.12, ry: -Math.PI / 2, body: 0xe8a24b, pants: 0xc8883a, hair: 0x5a4030 },
  ];
  const guests = seats.map((s, i) => {
    const p = makePerson({ body: s.body, pants: s.pants, hair: s.hair, scale: 0.72 });
    p.position.set(s.x, 0.12, s.z);
    p.rotation.y = s.ry;
    sit(p, s.faceCam);
    p.userData.t = i * 0.85;
    g.add(p);
    return p;
  });

  const cook = makePerson({ body: 0xd45b5b, pants: 0xb84848, hair: 0x6a3028, scale: 0.78 });
  cook.position.set(-0.58, 0.03, -0.32);
  cook.rotation.y = Math.PI;
  cook.userData.armR.rotation.x = -0.85;
  g.add(cook);

  const robot = makeRobot();
  robot.position.set(0.78, 0.02, -0.52);
  robot.rotation.y = -0.55;
  g.add(robot);

  g.userData = { guests, cook, steam };
  g.position.set(1.05, 0, 2.22);
  return g;
}

function makeShop() {
  const g = new THREE.Group();
  const wallM = std(WHITE, { roughness: 0.48 });
  const W = 2.55;
  const D = 1.78;
  const wallH = 1.18;
  const thick = 0.08;
  const palette = [0xe35b4c, 0xf0c14b, 0x6fbf4a, 0x4aa3e0, 0xe8a0b8, 0xf4e4a0, 0xd97706, 0xfb7185, 0x34d399, 0x60a5fa, 0xf97316, 0xa78bfa];

  const floor = rbox(W, 0.06, D, 0xeef2f6, 0.03, 0.02);
  const back = rbox(W, wallH, thick, wallM, wallH / 2 + 0.03, 0.02);
  back.position.z = -D / 2 + thick / 2;
  const left = rbox(thick, wallH, D, wallM, wallH / 2 + 0.03, 0.02);
  left.position.x = -W / 2 + thick / 2;
  const right = rbox(thick, wallH, D, wallM, wallH / 2 + 0.03, 0.02);
  right.position.x = W / 2 - thick / 2;
  const ceiling = rbox(W - 0.04, 0.05, 0.58, WHITE, 1.24, 0.02);
  ceiling.position.z = -0.52;
  g.add(floor, back, left, right, ceiling);

  const fascia = rbox(W + 0.12, 0.34, 0.28, candy(RED), 1.3, 0.06);
  fascia.position.z = 0.78;
  const lintel = rbox(W - 0.2, 0.07, 0.08, WHITE, 1.08, 0.02);
  lintel.position.z = 0.86;
  const signTex = canvasTex(420, 96, (ctx, w, h) => {
    ctx.fillStyle = "#e31c24";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#fff";
    ctx.font = "700 56px 'Noto Sans SC', 'Microsoft YaHei', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("温氏食材", w / 2, h / 2 + 2);
  });
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(1.62, 0.3),
    new THREE.MeshBasicMaterial({ map: signTex }),
  );
  sign.position.set(0, 1.32, 0.93);
  g.add(fascia, lintel, sign);

  const item = (kind, x, y, z, c) => {
    if (kind === 0) {
      const m = rbox(0.09, 0.11, 0.07, c, y, 0.016);
      m.position.set(x, y, z);
      g.add(m);
    } else if (kind === 1) {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.08, 10), candy(c));
      m.position.set(x, y, z);
      m.castShadow = true;
      g.add(m);
    } else if (kind === 2) {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.02, 0.12, 8), candy(c));
      m.position.set(x, y, z);
      m.castShadow = true;
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.018, 8), std(0xf8fafc));
      cap.position.set(x, y + 0.07, z);
      g.add(m, cap);
    } else {
      const m = sphere(0.038, std(c, { roughness: 0.62 }), 10);
      m.position.set(x, y, z);
      g.add(m);
    }
  };
  function shelfUnit(cx, cz) {
    const backboard = rbox(1.16, 1.08, 0.04, 0xe4ebf0, 0.6, 0.02);
    backboard.position.set(cx, 0.6, cz);
    g.add(backboard);
    for (let row = 0; row < 4; row++) {
      const y = 0.18 + row * 0.25;
      const board = rbox(1.14, 0.032, 0.22, WHITE, y, 0.01);
      board.position.set(cx, y, cz + 0.11);
      g.add(board);
      for (let k = 0; k < 7; k++) {
        const c = palette[(row * 7 + k) % palette.length];
        item((row + k) % 4, cx - 0.48 + k * 0.16, y + (k % 2 === 0 ? 0.07 : 0.055), cz + 0.1, c);
      }
    }
  }
  shelfUnit(-0.62, -0.7);
  shelfUnit(0.62, -0.7);

  for (let row = 0; row < 3; row++) {
    const y = 0.28 + row * 0.28;
    const board = rbox(0.08, 0.03, 0.72, WHITE, y, 0.01);
    board.position.set(1.12, y, -0.12);
    g.add(board);
    for (let k = 0; k < 5; k++) {
      item(2, 1.08, y + 0.08, -0.38 + k * 0.14, palette[(row * 5 + k + 3) % palette.length]);
    }
  }

  const fridge = rbox(0.4, 0.92, 0.36, WHITE, 0.5, 0.04);
  fridge.position.set(-1.02, 0.5, 0.22);
  const fridgeBand = rbox(0.42, 0.08, 0.38, candy(RED), 0.9, 0.02);
  fridgeBand.position.set(-1.02, 0.9, 0.22);
  const door = rbox(0.3, 0.7, 0.03, glassMat(0.38), 0.52, 0.01);
  door.position.set(-1.02, 0.52, 0.41);
  g.add(fridge, fridgeBand, door);
  for (let col = 0; col < 2; col++) {
    for (let i = 0; i < 4; i++) {
      const pack = rbox(0.1, 0.12, 0.06, palette[(col * 4 + i) % palette.length], 0.28 + i * 0.16, 0.016);
      pack.position.set(-1.1 + col * 0.14, 0.28 + i * 0.16, 0.28);
      g.add(pack);
    }
  }

  const bin = (x, z, c, n = 7) => {
    const b = rbox(0.3, 0.14, 0.24, 0xf3e6c8, 0.16, 0.03);
    b.position.set(x, 0.16, z);
    g.add(b);
    for (let i = 0; i < n; i++) {
      const fruit = sphere(0.04, std(c, { roughness: 0.62 }), 10);
      fruit.position.set(x + (i % 3 - 1) * 0.07, 0.28 + Math.floor(i / 3) * 0.05, z + ((i % 2) - 0.4) * 0.06);
      g.add(fruit);
    }
  };
  bin(-0.38, 0.22, 0xe35b4c);
  bin(-0.02, 0.26, 0xf0c14b);
  bin(0.34, 0.2, 0x6fbf4a);

  for (let i = 0; i < 6; i++) {
    const s = new THREE.Mesh(new THREE.CapsuleGeometry(0.022, 0.1, 4, 8), candy(0xb45309));
    s.position.set(-0.5 + i * 0.12, 1.02, -0.38);
    s.rotation.z = 0.15;
    s.castShadow = true;
    g.add(s);
  }
  const crateStack = (x, z) => {
    [0xe35b4c, 0xf0c14b, 0x4aa3e0].forEach((c, i) => {
      const crate = rbox(0.16, 0.1, 0.14, c, 0.14 + i * 0.1, 0.02);
      crate.position.set(x, 0.14 + i * 0.1, z);
      g.add(crate);
    });
  };
  crateStack(0.08, -0.22);

  const counter = rbox(0.7, 0.36, 0.34, 0xe8eef3, 0.36, 0.04);
  counter.position.set(0.78, 0.36, 0.42);
  const scan = rbox(0.48, 0.03, 0.2, 0x9aaeb8, 0.56, 0.01);
  scan.position.set(0.78, 0.56, 0.42);
  const till = rbox(0.16, 0.12, 0.12, std(0x38bdf8, { emissive: 0x1a88c8, emissiveIntensity: 0.45 }), 0.62, 0.02);
  till.position.set(1.0, 0.62, 0.38);
  g.add(counter, scan, till);

  const lamp = (x, z) => {
    const m = sphere(0.055, std(0xfff1c2, { emissive: 0xffe08a, emissiveIntensity: 0.85 }), 10);
    m.position.set(x, 1.12, z);
    g.add(m);
  };
  lamp(-0.45, 0.05);
  lamp(0.5, 0.12);

  const dock = rbox(0.58, 0.2, 0.36, WHITE, 1.4, 0.04);
  dock.position.set(0.04, 1.4, -0.18);
  const dockHole = rbox(0.34, 0.1, 0.08, 0x243040, 1.4, 0.02);
  dockHole.position.set(-0.06, 1.4, -0.36);
  g.add(dock, dockHole);

  const staff = [];
  const cashier = makePerson({ body: 0xe25a3c, pants: 0xc44a32, hair: 0x4a3020, scale: 0.82 });
  cashier.position.set(0.78, 0.03, 0.12);
  cashier.lookAt(0.78, 0.03, 0.9);
  g.add(cashier);
  staff.push(cashier);

  const browse = makePerson({ body: 0x4b7fd4, pants: 0x3a68b0, hair: 0x2c241c, scale: 0.82 });
  browse.position.set(-0.28, 0.03, -0.12);
  browse.lookAt(-0.28, 0.03, -0.7);
  const basket = rbox(0.12, 0.08, 0.1, 0xf0c14b, 0, 0.02);
  basket.position.set(0.12, 0.38, 0.08);
  browse.add(basket);
  g.add(browse);
  staff.push(browse);

  const cartBody = rbox(0.22, 0.12, 0.28, 0xd7e2ea, 0.22, 0.03);
  cartBody.position.set(0.18, 0.22, 0.48);
  g.add(cartBody);

  g.userData.staff = staff;
  g.position.set(4.95, 0, 1.92);
  return g;
}

function makeTree() {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.085, 0.7, 12), std(0xd2a36a, { roughness: 0.92 }));
  trunk.position.y = 0.35;
  const puff = (x, y, z, r, c) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 14), std(c, { roughness: 0.95 }));
    m.position.set(x, y, z);
    m.castShadow = true;
    return m;
  };
  g.add(
    trunk,
    puff(0.00, 1.02, 0.00, 0.46, 0xb6ec7a),
    puff(0.32, 0.94, 0.10, 0.36, 0x9edc62),
    puff(-0.30, 0.92, -0.08, 0.34, 0xc8f48c),
    puff(0.10, 1.22, -0.10, 0.32, 0xa8e46a),
    puff(-0.14, 1.18, 0.16, 0.3, 0xd4f8a0),
    puff(0.22, 0.78, -0.18, 0.26, 0x8fd056),
    puff(-0.24, 0.76, 0.18, 0.24, 0xb0e872),
  );
  g.position.set(-7.04, 0, 4.31);
  g.scale.setScalar(1.12);
  return g;
}

function ringXZ(rxOut, rzOut, rxIn, rzIn, y, thick, color, extra = {}) {
  const shape = new THREE.Shape();
  const steps = 96;
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const x = Math.cos(t) * rxOut;
    const z = Math.sin(t) * rzOut;
    if (i === 0) shape.moveTo(x, z);
    else shape.lineTo(x, z);
  }
  const hole = new THREE.Path();
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const x = Math.cos(t) * rxIn;
    const z = Math.sin(t) * rzIn;
    if (i === 0) hole.moveTo(x, z);
    else hole.lineTo(x, z);
  }
  shape.holes.push(hole);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: thick, bevelEnabled: false });
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, std(color, extra));
  mesh.position.y = y;
  mesh.receiveShadow = true;
  return mesh;
}

function makeTrafficLight() {
  const g = new THREE.Group();
  const dark = std(0x1c222c, { roughness: 0.42, metalness: 0.18 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.048, 1.28, 10), dark);
  pole.position.y = 0.64;
  pole.castShadow = true;
  const base = rbox(0.18, 0.08, 0.18, 0x2a3340, 0.04, 0.03);
  const housing = rbox(0.2, 0.58, 0.16, dark, 1.38, 0.04);
  const visor = (y) => {
    const v = rbox(0.16, 0.04, 0.1, 0x151920, y, 0.01);
    v.position.z = 0.08;
    return v;
  };
  const lamp = (y, color) => {
    const m = sphere(0.048, std(color, { emissive: color, emissiveIntensity: 0.2, roughness: 0.22 }), 12);
    m.position.set(0, y, 0.1);
    return m;
  };
  const red = lamp(1.56, 0xef4444);
  const yellow = lamp(1.38, 0xf4c14b);
  const green = lamp(1.2, 0x22c55e);
  g.add(pole, base, housing, visor(1.62), visor(1.44), visor(1.26), red, yellow, green);
  g.userData.lamps = { red, yellow, green };
  return g;
}

function setLamp(mesh, on) {
  const mat = mesh.material;
  mat.emissiveIntensity = on ? 1.35 : 0.08;
  mat.color.setHex(on ? mat.emissive.getHex() : 0x2a3038);
}

function follow(obj, curve, u, y, smoothDt) {
  const uu = ((u % 1) + 1) % 1;
  const p = curve.getPointAt(uu);
  const tan = curve.getTangentAt(uu);
  obj.position.set(p.x, p.y + y, p.z);
  if (tan.x * tan.x + tan.z * tan.z < 1e-8) return;
  const yaw = Math.atan2(tan.x, tan.z);
  const prev = obj.userData.yaw;
  if (prev != null && smoothDt != null) {
    let d = Math.atan2(Math.sin(yaw - prev), Math.cos(yaw - prev));
    obj.userData.yaw = prev + d * Math.min(1, smoothDt * 5.2);
  } else {
    obj.userData.yaw = yaw;
  }
  obj.rotation.set(0, obj.userData.yaw, 0);
}

function makeCargo(kind) {
  const g = new THREE.Group();
  if (kind === 0) {
    const crate = rbox(0.24, 0.13, 0.18, 0xc9965a, 0.07, 0.02);
    const rim = rbox(0.25, 0.025, 0.19, 0xa87844, 0.14, 0.008);
    g.add(crate, rim);
    [0xe35b4c, 0xf0c14b, 0x6fbf4a, 0xe35b4c].forEach((c, i) => {
      const f = sphere(0.038, std(c, { roughness: 0.62 }), 8);
      f.position.set(-0.07 + (i % 2) * 0.09, 0.17, -0.04 + Math.floor(i / 2) * 0.08);
      g.add(f);
    });
  } else if (kind === 1) {
    const box = rbox(0.22, 0.16, 0.16, 0xe8d5b0, 0.08, 0.02);
    const tape = rbox(0.045, 0.17, 0.17, 0xd4a017, 0.08, 0.008);
    const label = rbox(0.1, 0.055, 0.012, candy(RED), 0.1, 0.004);
    label.position.set(0, 0.1, 0.086);
    g.add(box, tape, label);
  } else if (kind === 2) {
    const tray = rbox(0.23, 0.05, 0.16, 0xf3e6c8, 0.03, 0.015);
    g.add(tray);
    for (let i = 0; i < 8; i++) {
      const f = sphere(0.036, std(i % 2 ? 0xf0c14b : 0xe35b4c, { roughness: 0.6 }), 8);
      f.position.set(-0.075 + (i % 4) * 0.05, 0.08 + Math.floor(i / 4) * 0.045, -0.04 + Math.floor(i / 4) * 0.07);
      g.add(f);
    }
  } else {
    const cool = rbox(0.2, 0.13, 0.16, 0xe8eef3, 0.07, 0.02);
    const lid = rbox(0.21, 0.03, 0.17, 0x3aa3e0, 0.145, 0.01);
    const handle = rbox(0.08, 0.02, 0.04, 0x94a3b8, 0.17, 0.008);
    g.add(cool, lid, handle);
  }
  return g;
}

function ease01(x) {
  const k = Math.max(0, Math.min(1, x));
  return k * k * (3 - 2 * k);
}

function cycleLocal(t, period, start, dur) {
  const u = ((t % period) + period) % period;
  if (dur <= 0 || u < start || u > start + dur) return -1;
  return (u - start) / dur;
}

function walkPose(person, t, moving, amp = 0.22, rate = 11) {
  const { legL, legR, armL, armR, phase } = person.userData;
  const swing = moving ? Math.sin(t * rate + phase) * amp : 0;
  if (legL) legL.rotation.x = swing;
  if (legR) legR.rotation.x = -swing;
  if (armL) armL.rotation.x = -swing * 0.75;
  if (armR) armR.rotation.x = swing * 0.75;
}

export function initCampus(stage, { reducedMotion = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.style.pointerEvents = "none";
  stage.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.environment = makeStudioEnv(renderer);
  scene.environmentIntensity = 1.08;
  const world = new THREE.Group();
  scene.add(world);

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 120);
  camera.position.set(0.16, 8.55, 24.6);
  camera.lookAt(0.08, 1.7, 0.45);

  scene.add(new THREE.HemisphereLight(0xfff1dc, 0x3f7a32, 0.36));
  const key = new THREE.DirectionalLight(0xfff3d4, 2.2);
  key.position.set(-8.5, 15, 9);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -12;
  key.shadow.camera.right = 12;
  key.shadow.camera.top = 8;
  key.shadow.camera.bottom = -8;
  key.shadow.camera.near = 2;
  key.shadow.camera.far = 36;
  key.shadow.bias = -0.0002;
  key.shadow.normalBias = 0.035;
  key.shadow.radius = 2.5;
  key.shadow.intensity = 1;
  const fill = new THREE.DirectionalLight(0xb7d7ff, 0.22);
  fill.position.set(11, 6, 7);
  const rim = new THREE.DirectionalLight(0xffd8a8, 0.55);
  rim.position.set(2, 8, -12);
  const bounce = new THREE.DirectionalLight(0x8fce5a, 0.16);
  bounce.position.set(0, -2, 8);
  scene.add(key, fill, rim, bounce);

  const soil = new THREE.Mesh(
    new THREE.CylinderGeometry(1, 1.03, 0.22, 80),
    std(0x3f6e22, { roughness: 0.95, envMapIntensity: 0.08 }),
  );
  soil.scale.set(10.68, 1, 6.52);
  soil.position.y = -0.1;
  soil.receiveShadow = true;
  const island = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.24, 80), [
    std(0x478228, { roughness: 0.92, envMapIntensity: 0.12 }),
    std(GRASS, { roughness: 0.76, envMapIntensity: 0.18 }),
    std(0x3a6c20, { roughness: 0.96, envMapIntensity: 0.08 }),
  ]);
  island.scale.set(10.55, 1, 6.4);
  island.receiveShadow = true;
  const inner = new THREE.Mesh(
    new THREE.CylinderGeometry(1, 1, 0.04, 64),
    std(GRASS_IN, { roughness: 0.8, envMapIntensity: 0.16 }),
  );
  inner.scale.set(7.45, 1, 4.12);
  inner.position.y = 0.13;
  inner.receiveShadow = true;
  world.add(soil, island, inner);

  const aoLab = groundShadow(1.45, 1.35, 0.3);
  aoLab.position.set(-2.48, 0.152, 2.02);
  const aoHouse = groundShadow(1.25, 1.05, 0.28);
  aoHouse.position.set(1.05, 0.152, 2.22);
  const aoShop = groundShadow(1.55, 1.15, 0.3);
  aoShop.position.set(4.95, 0.152, 1.92);
  const aoLetters = groundShadow(6.2, 1.15, 0.2);
  aoLetters.position.set(-1.1, 0.152, -1.55);
  const aoArch = groundShadow(1.05, 0.7, 0.22);
  aoArch.position.set(-5.19, 0.152, 1.42);
  world.add(groundShadow(8.6, 5.15, 0.12), aoLab, aoHouse, aoShop, aoLetters, aoArch);

  world.add(
    ringXZ(9.45, 5.55, 8.4, 4.7, 0.14, 0.13, ROAD, { emissive: 0x0e6f88, emissiveIntensity: 0.22, roughness: 0.28, metalness: 0.12, envMapIntensity: 0.7 }),
    ringXZ(9.05, 5.22, 8.75, 4.98, 0.265, 0.02, ROAD_GLOW, { emissive: 0x5fd4ee, emissiveIntensity: 0.4, roughness: 0.22 }),
  );

  const roadPts = new THREE.EllipseCurve(0, 0, 8.9, 5.12, 0, Math.PI * 2, false, 0).getPoints(80);
  roadPts.pop();
  const road3 = new THREE.CatmullRomCurve3(
    roadPts.map((p) => new THREE.Vector3(p.x, 0, p.y)),
    true,
  );
  const LOOP_RX = 9.82;
  const LOOP_RZ = 5.82;
  const LOOP_Y = 0.12;
  const ROAD_Y = 0.338;
  const IN_Y = 0.15;
  const loopStartA = Math.atan2(5.72 / LOOP_RZ, 3.44 / LOOP_RX);
  const loopPt = (a, y = LOOP_Y) => new THREE.Vector3(Math.cos(a) * LOOP_RX, y, Math.sin(a) * LOOP_RZ);
  const outPts = [
    new THREE.Vector3(4.82, IN_Y, 2.90),
    new THREE.Vector3(4.22, IN_Y, 3.40),
    new THREE.Vector3(3.62, IN_Y, 3.96),
    new THREE.Vector3(3.52, ROAD_Y, 4.36),
    new THREE.Vector3(3.49, ROAD_Y, 4.76),
    new THREE.Vector3(3.46, ROAD_Y, 5.16),
    new THREE.Vector3(3.44, 0.2, 5.48),
    loopPt(loopStartA),
  ];
  const outCurve = new THREE.CatmullRomCurve3(outPts);
  const inCurve = new THREE.CatmullRomCurve3([...outPts].reverse());
  const loopPts = [];
  const LOOP_N = 40;
  for (let i = 0; i < LOOP_N; i++) {
    loopPts.push(loopPt(loopStartA + (i / LOOP_N) * Math.PI * 2));
  }
  const loopCurve = new THREE.CatmullRomCurve3(loopPts, true);
  const lenOut = outCurve.getLength();
  const lenLoop = loopCurve.getLength();
  const lenIn = inCurve.getLength();
  const WALK_SPEED = 0.55;
  const WAIT_OUT = 0.32;
  const WAIT_IN = 0.08;
  const STOP_U = 0.118;
  const CLEAR_U = 0.082;
  const zebraAng = Math.atan2(4.62, 3.5);
  const zebraCos = Math.cos(zebraAng);
  const zebraSin = Math.sin(zebraAng);
  const zebraMat = std(WHITE, {
    roughness: 0.42,
    metalness: 0.02,
  });
  for (let i = 0; i < 6; i++) {
    const r = 5.52 + i * 0.145;
    const stripe = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.08), zebraMat);
    stripe.rotation.x = -Math.PI / 2;
    stripe.rotation.z = -zebraAng;
    stripe.position.set(zebraCos * r, 0.272, zebraSin * r);
    stripe.receiveShadow = true;
    world.add(stripe);
  }
  const traffic = makeTrafficLight();
  traffic.position.set(3.22, 0, 4.18);
  traffic.rotation.y = 0.35;
  world.add(traffic);
  const conveyCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(4.88, 1.44, 1.58),
    new THREE.Vector3(4.52, 1.82, 0.62),
    new THREE.Vector3(3.98, 2.18, -0.22),
    new THREE.Vector3(3.58, 2.36, -0.82),
    new THREE.Vector3(3.42, 2.34, -1.2),
  ]);
  const channel = new THREE.Shape();
  channel.moveTo(-0.2, 0);
  channel.lineTo(-0.2, 0.1);
  channel.lineTo(-0.155, 0.1);
  channel.lineTo(-0.155, 0.028);
  channel.lineTo(0.155, 0.028);
  channel.lineTo(0.155, 0.1);
  channel.lineTo(0.2, 0.1);
  channel.lineTo(0.2, 0);
  channel.closePath();
  const channelMesh = new THREE.Mesh(
    new THREE.ExtrudeGeometry(channel, { steps: 48, bevelEnabled: false, extrudePath: conveyCurve }),
    std(0xd5dee4, { roughness: 0.45, metalness: 0.12 }),
  );
  channelMesh.castShadow = true;
  const beltShape = new THREE.Shape();
  beltShape.moveTo(-0.145, 0.03);
  beltShape.lineTo(-0.145, 0.042);
  beltShape.lineTo(0.145, 0.042);
  beltShape.lineTo(0.145, 0.03);
  beltShape.closePath();
  const beltMesh = new THREE.Mesh(
    new THREE.ExtrudeGeometry(beltShape, { steps: 48, bevelEnabled: false, extrudePath: conveyCurve }),
    std(0x9aaeb8, { roughness: 0.55, emissive: 0x3a5a66, emissiveIntensity: 0.12 }),
  );
  const railShape = (side) => {
    const s = new THREE.Shape();
    s.absarc(side * 0.185, 0.1, 0.022, 0, Math.PI * 2, false);
    return s;
  };
  const railL = new THREE.Mesh(
    new THREE.ExtrudeGeometry(railShape(-1), { steps: 48, bevelEnabled: false, extrudePath: conveyCurve }),
    candy(RED),
  );
  const railR = new THREE.Mesh(
    new THREE.ExtrudeGeometry(railShape(1), { steps: 48, bevelEnabled: false, extrudePath: conveyCurve }),
    candy(RED),
  );
  world.add(channelMesh, beltMesh, railL, railR);
  const port = rbox(0.5, 0.32, 0.2, WHITE, 2.34, 0.045);
  port.position.set(3.42, 2.34, -1.18);
  const portHole = rbox(0.34, 0.18, 0.08, 0x243040, 2.34, 0.02);
  portHole.position.set(3.42, 2.34, -1.08);
  world.add(port, portHole);

  const house = makeHouse();
  const shop = makeShop();
  const lab = makeLab();
  const tree = makeTree();
  const yardChick = makeChick({ sit: false, lookY: 0.22, down: 0xffd24a, pale: 0xffefb0, singleTuft: true });
  yardChick.scale.setScalar(1.18);
  yardChick.position.set(-6.90, 0.13, 4.40);
  yardChick.rotation.y = 0.22;
  yardChick.userData.home = { x: -6.90, y: 0.13, z: 4.40, ry: 0.22 };
  const yardChickAo = groundShadow(0.26, 0.22, 0.18);
  yardChickAo.position.set(-6.90, 0.152, 4.40);
  world.add(makeArch(), lab, house, shop, tree, yardChick, yardChickAo);
  const greeter = makePerson({
    body: NAVY,
    pants: 0x121820,
    hair: 0x2a221c,
    scale: 1.14,
    wave: true,
  });
  greeter.position.set(-5.58, 0.06, 1.54);
  greeter.rotation.y = 0.28;
  world.add(greeter);
  const guests = house.userData.guests;
  const shopStaff = shop.userData.staff;
  new FontLoader().load(
    "./vendor/fonts/helvetiker_bold.typeface.json",
    (font) => world.add(makeLetters(font)),
    undefined,
    () => world.add(makeLettersFallback()),
  );

  const bush = (x, z, s, c = 0x5aa046) => {
    const m = sphere(0.26 * s, std(c), 10);
    m.position.set(x, 0.2 * s, z);
    world.add(m);
  };
  bush(6.35, 2.22, 1.05, 0x63b34a);
  bush(6.55, 1.42, 0.85);
  bush(-7.15, 4.05, 0.82);

  const shopper = makePerson({ body: 0xe25a3c, pants: 0xc44a32, hair: 0x4a3020, scale: 1.22 });
  shopper.userData.u = 0;
  shopper.userData.rest = 0;
  shopper.userData.trip = "out";
  const bag = makePlasticBag();
  bag.position.set(0.05, -0.16, 0.03);
  bag.rotation.set(0.15, 0.2, -0.35);
  shopper.userData.armL.add(bag);
  shopper.userData.bag = bag;
  shopper.traverse((o) => {
    if (o.isMesh) o.renderOrder = 8;
  });
  world.add(shopper);

  const labPeople = [0, 1, 2, 3].map((i) => {
    const p = makePerson({
      body: 0xeef6ff,
      pants: 0xd5e6f2,
      hair: [0x2c241c, 0x6a4030, 0x3a3028, 0x4a3828][i],
      scale: 0.88,
    });
    p.userData.floor = i % 2;
    p.userData.t = i * 0.4;
    world.add(p);
    return p;
  });

  const cow = makeCow();
  cow.scale.setScalar(0.78);
  cow.position.set(2.78, 0.02, 2.52);
  world.add(cow);
  const pig = makePig();
  pig.position.set(6.72, 0.02, 4.48);
  pig.rotation.set(-0.38, -0.22, 0);
  const zzMark = (ch, size, color) => {
    const tex = canvasTex(128, 128, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = color;
      ctx.font = `700 ${size}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(ch, w / 2, h / 2 + 6);
    });
    tex.needsUpdate = true;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: tex,
      color: 0xffffff,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
      opacity: 0,
    }));
    s.center.set(0.5, 0.2);
    s.renderOrder = 20;
    return s;
  };
  const zzSmall = zzMark("z", 78, "#445572");
  zzSmall.position.set(0.22, 0.78, 0.4);
  const zzBig = zzMark("Z", 92, "#33425c");
  zzBig.position.set(0.36, 1.02, 0.46);
  pig.add(zzSmall, zzBig);
  pig.userData.zz = [zzSmall, zzBig];
  world.add(pig);
  const lawnPig = makePig({ spots: true, pink: 0xee9aad, lookY: 0.4, earDrop: 0.62 });
  lawnPig.scale.setScalar(0.74);
  lawnPig.position.set(-0.58, 0.13, 2.82);
  lawnPig.rotation.y = 0.72;
  const lawnPigAo = groundShadow(0.42, 0.32, 0.18);
  lawnPigAo.position.set(-0.58, 0.152, 2.82);
  world.add(lawnPig, lawnPigAo);

  const robots = [makeRobot(), makeRobot(), makeRobot()];
  robots[0].position.set(-4.15, 0.02, 3.15);
  robots[1].position.set(2.18, 0.02, 3.48);
  robots[2].position.set(6.08, 0.02, 2.22);
  robots.forEach((r) => world.add(r));

  const cars = [makeCar(0x2b3038), makeCar(0xf4f7fb), makeCar(0xe23b32, true)];
  cars.forEach((c, i) => {
    c.userData.u = i / 3;
    world.add(c);
  });

  const crates = [0, 1, 2, 3, 0].map((kind, i) => {
    const g = makeCargo(kind);
    g.userData.t = i / 5;
    world.add(g);
    return g;
  });

  const heli = makeHeli();
  heli.scale.setScalar(1.42);
  heli.position.set(-2.23, 6.55, -3.05);
  world.add(heli);
  const drone = makeDrone();
  drone.position.set(-6.05, 5.15, 0.45);
  world.add(drone);
  const cornerDrone = makeDrone();
  cornerDrone.scale.setScalar(2.35);
  cornerDrone.userData.start = new THREE.Vector3(7.8, -0.15, 14.8);
  cornerDrone.userData.rest = new THREE.Vector3(4.05, 0.78, 10.85);
  cornerDrone.position.copy(reducedMotion ? cornerDrone.userData.rest : cornerDrone.userData.start);
  cornerDrone.rotation.set(-0.28, Math.PI * 0.78, -0.32);
  world.add(cornerDrone);

  const pole = rbox(0.07, 0.72, 0.07, 0xb9c4ce, 0.36, 0.02);
  pole.position.set(7.37, 0.36, 3.92);
  const boardTex = canvasTex(480, 140, (ctx, w, h) => {
    ctx.fillStyle = "#f7fbff";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#c5d0da";
    ctx.lineWidth = 8;
    ctx.strokeRect(8, 8, w - 16, h - 16);
    ctx.fillStyle = "#1a2230";
    ctx.font = "700 64px Geist, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("WELCOME", w / 2, h / 2 + 3);
  });
  const board = new THREE.Mesh(new THREE.PlaneGeometry(0.98, 0.3), new THREE.MeshBasicMaterial({ map: boardTex }));
  board.position.set(7.37, 0.82, 3.97);
  world.add(pole, board);

  function resize() {
    const { width, height } = stage.getBoundingClientRect();
    renderer.setSize(Math.max(1, width), Math.max(1, height), false);
    camera.aspect = width / Math.max(height, 1);
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(stage);
  resize();

  let t0 = performance.now();
  let lastNow = t0;
  function tick(now) {
    const t = (now - t0) / 1000;
    const dt = Math.min(0.05, (now - lastNow) / 1000);
    lastNow = now;
    const cycle = t % 14.5;
    const pedGreen = cycle < 6.5;
    const pedClear = !pedGreen && cycle < 7.6;
    const { red, yellow: yel, green } = traffic.userData.lamps;
    setLamp(green, pedGreen);
    setLamp(yel, pedClear);
    setLamp(red, !pedGreen && !pedClear);
    if (!reducedMotion) {
      let trip = shopper.userData.trip || "out";
      let shopperU = shopper.userData.u;
      const waitU = trip === "in" ? WAIT_IN : WAIT_OUT;
      const atCurb = (trip === "out" || trip === "in") && shopperU >= waitU - 0.025 && shopperU <= waitU + 0.02;
      const shopperCrossing = (trip === "out" && shopperU > WAIT_OUT + 0.015 && shopperU < 0.84)
        || (trip === "in" && shopperU > WAIT_IN + 0.015 && shopperU < 0.7);
      const resting = trip === "rest" || trip === "turn";
      const step = (len) => (WALK_SPEED * dt) / Math.max(len, 0.01);
      if (trip === "rest") {
        shopper.userData.rest = (shopper.userData.rest || 0) + dt;
        shopperU = 1;
        if (shopper.userData.rest > 4.2) {
          shopper.userData.trip = "turn";
          shopper.userData.rest = 0;
          shopper.userData.turn = 0;
          trip = "turn";
        }
      } else if (trip === "turn") {
        shopper.userData.turn = (shopper.userData.turn || 0) + dt;
        shopperU = 0;
        if (shopper.userData.turn > 1.05) {
          shopper.userData.trip = "out";
          shopper.userData.u = 0;
          trip = "out";
        }
      } else if (trip === "loop") {
        shopperU += step(lenLoop);
        if (shopperU >= 1) {
          shopper.userData.trip = "in";
          shopper.userData.u = 0;
          trip = "in";
          shopperU = 0;
        } else shopper.userData.u = shopperU;
      } else {
        const len = trip === "in" ? lenIn : lenOut;
        if (shopperU < waitU - 0.012) shopperU = Math.min(waitU, shopperU + step(len));
        else if (atCurb && !pedGreen) shopperU = waitU;
        else shopperU += step(len);
        if (shopperU >= 1) {
          if (trip === "out") {
            shopper.userData.trip = "loop";
            shopper.userData.u = 0;
            trip = "loop";
            shopperU = 0;
          } else {
            shopper.userData.trip = "rest";
            shopper.userData.rest = 0;
            trip = "rest";
            shopperU = 1;
          }
        }
        shopper.userData.u = shopperU;
      }
      shopper.visible = true;
      const moving = !resting && !(atCurb && !pedGreen);
      walkPose(shopper, t, moving, 0.15, 7.3);
      shopper.userData.armL.rotation.z = 0.38;
      shopper.userData.armL.rotation.x = -0.28 + (moving ? Math.sin(t * 7.3 + shopper.userData.phase) * 0.08 : 0);
      if (shopper.userData.bag) shopper.userData.bag.rotation.x = 0.15 + Math.sin(t * 4.2) * (moving ? 0.1 : 0.03);

      const holdCars = pedGreen || pedClear || shopperCrossing;
      const CAR_GAP = 0.042;
      const ordered = [...cars].sort((a, b) => (
        (STOP_U - a.userData.u + 1) % 1 - (STOP_U - b.userData.u + 1) % 1
      ));
      ordered.forEach((car, i) => {
        const u = car.userData.u;
        const pastBy = (u - STOP_U + 1) % 1;
        const hasLeft = pastBy >= CLEAR_U && pastBy < 0.5;
        let next = (u + dt * 0.03) % 1;
        if (!hasLeft && holdCars) {
          const toLine = (STOP_U - u + 1) % 1;
          if (toLine < 0.5 && toLine <= dt * 0.03 + 0.001) next = STOP_U;
        }
        if (i > 0) {
          const aheadU = ordered[i - 1].userData.u;
          const toAhead = (aheadU - u + 1) % 1;
          if (toAhead < 0.5) {
            const cap = (aheadU - CAR_GAP + 1) % 1;
            const toCap = (cap - u + 1) % 1;
            const toNext = (next - u + 1) % 1;
            if (toCap < 0.5 && toNext > toCap) next = cap;
          }
        }
        car.userData.u = next;
        follow(car, road3, next, 0.26);
      });
      const shopStop = outPts[0];
      const faceShopYaw = Math.atan2(4.95 - shopStop.x, 1.92 - shopStop.z);
      const outYaw = Math.atan2(outPts[1].x - outPts[0].x, outPts[1].z - outPts[0].z);
      if (trip === "loop") follow(shopper, loopCurve, shopperU, 0, dt);
      else if (trip === "in") follow(shopper, inCurve, shopperU, 0, dt);
      else if (trip === "out") follow(shopper, outCurve, shopperU, 0, dt);
      else {
        shopper.position.set(shopStop.x, shopStop.y, shopStop.z);
        const k = trip === "turn" ? ease01((shopper.userData.turn || 0) / 1.05) : 0;
        let yaw = faceShopYaw + k * Math.atan2(Math.sin(outYaw - faceShopYaw), Math.cos(outYaw - faceShopYaw));
        shopper.userData.yaw = yaw;
        shopper.rotation.set(0, yaw, 0);
      }
      {
        const su = shopperU;
        let y = IN_Y;
        if (trip === "loop") y = LOOP_Y;
        else if (trip === "rest" || trip === "turn") y = IN_Y;
        else if (trip === "out") {
          if (su < 0.26) y = IN_Y;
          else if (su < WAIT_OUT) y = IN_Y + (ROAD_Y - IN_Y) * ease01((su - 0.26) / (WAIT_OUT - 0.26));
          else if (su < 0.82) y = ROAD_Y;
          else if (su < 0.94) y = ROAD_Y + (LOOP_Y - ROAD_Y) * ease01((su - 0.82) / 0.12);
          else y = LOOP_Y;
        } else if (trip === "in") {
          if (su < WAIT_IN) y = LOOP_Y;
          else if (su < 0.22) y = LOOP_Y + (ROAD_Y - LOOP_Y) * ease01((su - WAIT_IN) / (0.22 - WAIT_IN));
          else if (su < 0.68) y = ROAD_Y;
          else if (su < 0.84) y = ROAD_Y + (IN_Y - ROAD_Y) * ease01((su - 0.68) / 0.16);
          else y = IN_Y;
        }
        const prevY = shopper.userData.groundY ?? y;
        shopper.userData.groundY = prevY + (y - prevY) * Math.min(1, dt * 7);
        shopper.position.y = shopper.userData.groundY;
      }
      let overCar = false;
      if (shopperCrossing) {
        for (const car of cars) {
          const dx = shopper.position.x - car.position.x;
          const dz = shopper.position.z - car.position.z;
          if (dx * dx + dz * dz < 1.15 * 1.15) {
            overCar = true;
            break;
          }
        }
      }
      shopper.traverse((o) => {
        if (o.isMesh) o.renderOrder = overCar ? 10 : 8;
      });
      labPeople.forEach((p, i) => {
        const jobs = [
          { x: -3.05, y: 0.14, z: 2.28, ry: 0.4 },
          { x: -2.22, y: 0.14, z: 1.72, ry: Math.PI },
          { x: -2.18, y: 1.36, z: 2.18, ry: -0.55 },
          { x: -2.92, y: 1.36, z: 2.12, ry: -Math.PI / 2 },
        ];
        const j = jobs[i];
        p.position.set(j.x, j.y, j.z);
        p.rotation.set(0, j.ry, 0);
        walkPose(p, t, false);
        p.userData.armR.rotation.x = -0.72 + Math.sin(t * 2.1 + i) * 0.18;
        p.userData.armL.rotation.x = -0.5;
        p.userData.head.rotation.x = 0.12;
      });
      guests.forEach((p) => {
        const t0 = t + p.userData.t;
        const bite = (Math.sin(t0 * 2.1) + 1) * 0.5;
        p.userData.legL.rotation.x = 1.18;
        p.userData.legR.rotation.x = 1.18;
        p.userData.armL.rotation.x = -0.95;
        p.userData.armL.rotation.z = 0;
        p.userData.armR.rotation.z = 0.08;
        p.userData.armR.rotation.x = -0.55 - bite * 0.85;
        p.userData.head.rotation.x = (p.userData.faceCam ? -0.22 : 0.12) + bite * 0.08;
      });
      if (house.userData.cook) {
        const stir = Math.sin(t * 3.2);
        house.userData.cook.userData.armR.rotation.x = -0.7 + stir * 0.25;
        house.userData.cook.userData.armR.rotation.z = 0.15 + stir * 0.2;
        house.userData.cook.userData.head.rotation.y = Math.sin(t * 0.8) * 0.12;
      }
      house.userData.steam.forEach((s, i) => {
        const u = (t * 0.42 + i * 0.22) % 1;
        s.position.y = 0.54 + u * 0.28;
        s.scale.setScalar(0.7 + u * 1.1);
        s.material.opacity = 0.4 * (1 - u);
      });
      shopStaff.forEach((p, i) => {
        walkPose(p, t, false);
        p.userData.armR.rotation.x = -0.45 + Math.sin(t * 1.7 + i) * 0.28;
      });
      const wave = greeter.userData.waveArm;
      const flap = Math.sin(t * 7.4);
      wave.rotation.z = 2.08 + flap * 0.32;
      wave.rotation.x = -0.22 + flap * 0.08;
      greeter.userData.armL.rotation.z = 0.1;
      greeter.userData.head.rotation.y = Math.sin(t * 1.5) * 0.14;
      {
        const eatP = cycleLocal(t + 3.8, 14.6, 0, 2.8);
        let eat = 0;
        if (eatP >= 0) {
          if (eatP < 0.22) eat = ease01(eatP / 0.22);
          else if (eatP < 0.72) eat = 1;
          else eat = 1 - ease01((eatP - 0.72) / 0.28);
        }
        const chew = eat > 0.85 ? Math.sin(t * 9) * 0.06 : 0;
        cow.userData.head.rotation.z = -0.46 + eat * -0.58 + chew + Math.sin(t * 0.22) * 0.03;
        cow.position.x = 2.78 + Math.sin(t * 0.12) * 0.05;
      }
      {
        const napP = cycleLocal(t + 19.5, 36.5, 0, 17.8);
        let sleep = 0;
        let settle = 0;
        let zzOn = 0;
        let jolt = 0;
        if (napP >= 0) {
          if (napP < 0.056) sleep = ease01(napP / 0.056);
          else if (napP < 0.899) {
            sleep = 1;
            zzOn = 1;
          } else if (napP < 0.955) {
            jolt = (napP - 0.899) / 0.056;
            sleep = Math.max(0, 1 - jolt / 0.1);
            zzOn = Math.max(0, 1 - jolt / 0.07);
          } else {
            settle = 1 - ease01((napP - 0.955) / 0.045);
          }
        }
        const hop = jolt > 0 ? Math.sin(Math.min(jolt, 1) * Math.PI) : 0;
        const wobble = jolt > 0.22 ? Math.sin(jolt * 26) * (1 - jolt) * 0.24 : 0;
        const headWhip = jolt <= 0
          ? 0
          : jolt < 0.16
            ? -0.08 + ease01(jolt / 0.16) * 0.82
            : 0.74 - ease01((jolt - 0.16) / 0.84) * 0.28;
        pig.rotation.x = -0.38 - sleep * 0.22 + hop * 0.14 + settle * 0.08;
        pig.rotation.y = -0.22 + wobble * 0.45;
        pig.rotation.z = wobble;
        pig.position.y = 0.02 + hop * 0.38;
        const sy = jolt <= 0 ? 1 : jolt < 0.42 ? 1 + hop * 0.16 : 1 - Math.sin(((jolt - 0.42) / 0.58) * Math.PI) * 0.12;
        pig.scale.set(1 / sy, sy, 1 / sy);
        pig.userData.head.rotation.x = -0.42 - sleep * 0.5 + headWhip + settle * 0.1 + (sleep ? Math.sin(t * 1.1) * 0.03 : Math.sin(t * 0.7) * 0.06);
        const lid = sleep > 0 ? 1 - sleep * 0.82 : jolt > 0 && jolt < 0.4 ? 1.22 : 1;
        pig.userData.eyeL.scale.set(1, lid, 1);
        pig.userData.eyeR.scale.set(1, lid, 1);
        pig.userData.glintL.visible = sleep < 0.55;
        pig.userData.glintR.visible = sleep < 0.55;
        pig.userData.zz.forEach((z, i) => {
          const restY = i ? 1.02 : 0.78;
          const bob = Math.sin(t * 2.2 + i * 1.1) * 0.04;
          z.position.set(i ? 0.36 : 0.22, restY + zzOn * 0.14 + bob, i ? 0.46 : 0.4);
          z.material.opacity = zzOn * (0.82 + 0.18 * (0.5 + 0.5 * Math.sin(t * 2.4 + i)));
          const sc = (i ? 0.48 : 0.36) * (0.94 + 0.08 * Math.sin(t * 1.8 + i));
          z.scale.set(sc, sc, 1);
        });
      }
      lawnPig.userData.head.rotation.y = 0.4 + Math.sin(t * 0.9) * 0.12;
      lawnPig.userData.head.rotation.x = -0.36 + Math.sin(t * 0.55) * 0.05;
      {
        const hopChick = lab.userData.chick;
        const hopP = cycleLocal(t + 1.6, 12.8, 0, 1.12);
        let hop = 0;
        if (hopP >= 0) {
          if (hopP < 0.2) hop = ease01(hopP / 0.2);
          else if (hopP < 0.64) hop = 1 - 0.05 * (1 - Math.cos(((hopP - 0.2) / 0.44) * Math.PI * 2));
          else hop = (1 - ease01((hopP - 0.64) / 0.36)) * 0.95;
        }
        hopChick.position.y = 1.26 + hop * 0.15;
        const flap = hop > 0.04 ? Math.sin(t * 22) * (0.45 + hop * 0.55) : Math.sin(t * 0.7) * 0.04;
        hopChick.userData.wingL.rotation.z = hopChick.userData.wingL.userData.restZ - flap * 0.85;
        hopChick.userData.wingR.rotation.z = hopChick.userData.wingR.userData.restZ + flap * 0.85;
        hopChick.userData.head.rotation.x = -0.18 - hop * 0.1 + Math.sin(t * 0.55) * 0.05;
      }
      {
        const home = yardChick.userData.home;
        const leftX = -Math.cos(home.ry);
        const leftZ = Math.sin(home.ry);
        const span = 0.22;
        const u = ((t % 17.8) + 17.8) % 17.8;
        let along = 0;
        let moving = 0;
        let peck = 0;
        let face = home.ry;
        if (u < 1.2) {
          along = 0;
          face = home.ry;
        } else if (u < 3.1) {
          const p = ease01((u - 1.2) / 1.9);
          along = -span * p;
          moving = Math.sin(p * Math.PI * 2);
          face = home.ry + Math.PI / 2;
        } else if (u < 3.6) {
          along = -span;
          face = home.ry + Math.PI / 2;
        } else if (u < 5.8) {
          const p = ease01((u - 3.6) / 2.2);
          along = -span + span * 2 * p;
          moving = Math.sin(p * Math.PI * 2);
          face = home.ry - Math.PI / 2;
        } else if (u < 7.4) {
          along = span;
          face = home.ry - Math.PI / 2;
          const pk = (u - 5.8) / 1.6;
          if (pk < 0.3) peck = ease01(pk / 0.3);
          else if (pk < 0.5) peck = 1;
          else if (pk < 0.72) peck = 1 - ease01((pk - 0.5) / 0.22);
          else if (pk < 0.88) peck = ease01((pk - 0.72) / 0.16);
          else peck = 1 - ease01((pk - 0.88) / 0.12);
        } else if (u < 9.4) {
          const p = ease01((u - 7.4) / 2);
          along = span * (1 - p);
          moving = Math.sin(p * Math.PI * 2);
          face = home.ry + Math.PI / 2;
        } else {
          along = 0;
          face = home.ry;
        }
        const bob = Math.abs(moving) * 0.018;
        let faceNow = yardChick.userData.face ?? home.ry;
        let fd = face - faceNow;
        fd = Math.atan2(Math.sin(fd), Math.cos(fd));
        faceNow += fd * Math.min(1, dt * 8);
        yardChick.userData.face = faceNow;
        yardChick.position.set(home.x + leftX * along, home.y + bob, home.z + leftZ * along);
        yardChick.rotation.y = faceNow;
        yardChick.userData.legL.rotation.x = moving * 0.42;
        yardChick.userData.legR.rotation.x = -moving * 0.42;
        yardChick.userData.head.rotation.x = -0.16 + peck * 0.72 + Math.sin(t * 0.4) * 0.04;
        yardChick.userData.head.rotation.y = 0.08;
        yardChickAo.position.set(yardChick.position.x, 0.152, yardChick.position.z);
      }
      pig.rotation.y = -0.22 + Math.sin(t * 0.32) * 0.05;
      robots.forEach((r, i) => {
        r.position.y = 0.03 + Math.sin(t * 2.1 + i) * 0.02;
        r.rotation.y = t * (0.35 + i * 0.12);
        const pulse = 0.9 + 0.4 * (0.5 + 0.5 * Math.sin(t * 3.4 + i));
        if (r.userData.visor) r.userData.visor.material.emissiveIntensity = pulse;
        if (r.userData.tip) r.userData.tip.material.emissiveIntensity = 1 + 0.55 * (0.5 + 0.5 * Math.sin(t * 5.2 + i));
        if (r.userData.ring) r.userData.ring.material.emissiveIntensity = 0.75 + 0.5 * (0.5 + 0.5 * Math.sin(t * 4.1 + i));
      });
      crates.forEach((c) => {
        const u = ((c.userData.t + t * 0.07) % 1 + 1) % 1;
        const p = conveyCurve.getPointAt(u);
        const tg = conveyCurve.getTangentAt(u);
        c.position.set(p.x, p.y + 0.07, p.z);
        c.lookAt(p.x + tg.x, p.y + tg.y, p.z + tg.z);
        c.visible = u > 0.04 && u < 0.92;
      });
      const pu = (t * 0.048 + 0.34) % 1;
      heli.position.set(-9.2 + pu * 20.5, 6.55 + Math.sin(t * 1.05) * 0.2, -3.08);
      heli.rotation.set(Math.sin(t * 0.9) * 0.05, 0, Math.sin(t * 1.12) * 0.07);
      flutterBanner(heli.userData.cloth, t);
      heli.userData.rotor.rotation.y = t * 16;
      let heliFade = 1;
      if (pu < 0.14) {
        const k = Math.max(0, Math.min(1, (pu - 0.02) / 0.12));
        heliFade = k * k * (3 - 2 * k);
      } else if (pu > 0.76) {
        const k = Math.max(0, Math.min(1, (0.97 - pu) / 0.21));
        heliFade = k * k * (3 - 2 * k);
      }
      fadeGroup(heli, heliFade);
      drone.position.y = 5.15 + Math.sin(t * 0.9) * 0.05;
      drone.position.x = -6.05 + Math.sin(t * 0.18) * 0.1;
      drone.rotation.z = Math.sin(t * 0.9) * 0.015;
      drone.userData.rotors.forEach((r, i) => {
        r.rotation.y = t * 22 * (i % 2 ? 1 : -1);
      });
      const fly = Math.min(1, Math.max(0, (t - 0.28) / 1.2));
      const k = fly * fly * (3 - 2 * fly);
      const cs = cornerDrone.userData.start;
      const cr = cornerDrone.userData.rest;
      cornerDrone.position.lerpVectors(cs, cr, k);
      cornerDrone.rotation.set(-0.28, Math.PI * 0.78, -0.32);
      cornerDrone.userData.rotors.forEach((r, i) => {
        r.rotation.y = t * 22 * (i % 2 ? 1 : -1);
      });
    }
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  return { world, camera, renderer };
}
