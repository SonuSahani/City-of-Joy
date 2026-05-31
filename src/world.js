// ============================================================
// World — builds the stylized College Street block procedurally.
// No external assets: geometry + canvas textures only.
// Exposes colliders (Box3[]), named spots, and update(dt, time).
// ============================================================

import * as THREE from 'three';
import { COLORS, WORLD } from './config.js';

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[(Math.random() * arr.length) | 0];

const _texCache = new Map();
function buildingTextures(hex) {
  if (_texCache.has(hex)) return _texCache.get(hex);
  const w = 128, h = 256;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  const base = new THREE.Color(hex);
  const r255 = (v) => Math.round(v * 255);
  g.fillStyle = `rgb(${r255(base.r)},${r255(base.g)},${r255(base.b)})`;
  g.fillRect(0, 0, w, h);

  // emissive map (lit windows for night)
  const ec = document.createElement('canvas'); ec.width = w; ec.height = h;
  const eg = ec.getContext('2d');
  eg.fillStyle = '#000'; eg.fillRect(0, 0, w, h);

  const cols = 4, rows = 9, mw = 20, mh = 18;
  const gapX = (w - cols * mw) / (cols + 1);
  const gapY = (h - rows * mh) / (rows + 1);
  for (let ry = 0; ry < rows; ry++) {
    for (let cx = 0; cx < cols; cx++) {
      const x = gapX + cx * (mw + gapX);
      const y = gapY + ry * (mh + gapY);
      // window frame
      g.fillStyle = '#efe7d2';
      g.fillRect(x - 2, y - 2, mw + 4, mh + 4);
      g.fillStyle = '#34304a';
      g.fillRect(x, y, mw, mh);
      const lit = Math.random() < 0.45;
      eg.fillStyle = lit ? '#ffce7a' : '#000';
      eg.fillRect(x, y, mw, mh);
    }
  }
  const map = new THREE.CanvasTexture(c); map.colorSpace = THREE.SRGBColorSpace;
  const emissiveMap = new THREE.CanvasTexture(ec);
  const out = { map, emissiveMap };
  _texCache.set(hex, out);
  return out;
}

function signTexture(text, bg = '#9c2b22', fg = '#ffe7b0') {
  const w = 256, h = 64;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.strokeStyle = fg; g.lineWidth = 4; g.strokeRect(4, 4, w - 8, h - 8);
  g.fillStyle = fg;
  g.font = 'bold 30px Georgia, serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, w / 2, h / 2 + 2);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class World {
  constructor(scene, device) {
    this.scene = scene;
    this.device = device;
    this.shadows = device.shadows;
    this.colliders = [];
    this.buildingMats = [];
    this.lampMats = [];
    this.stringMats = [];
    this.spots = {};
    this._t = 0;

    this._build();
  }

  _box(w, h, d, color, x, y, z, opts = {}) {
    const mat = new THREE.MeshStandardMaterial({
      color, roughness: opts.rough ?? 0.85, metalness: opts.metal ?? 0.0,
      map: opts.map || null, emissive: opts.emissive ?? 0x000000,
      emissiveMap: opts.emissiveMap || null, emissiveIntensity: opts.emissiveIntensity ?? 0,
    });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = this.shadows && (opts.cast ?? true);
    mesh.receiveShadow = opts.receive ?? true;
    this.scene.add(mesh);
    return mesh;
  }

  _collider(x, z, w, d) {
    this.colliders.push(new THREE.Box3(
      new THREE.Vector3(x - w / 2, -10, z - d / 2),
      new THREE.Vector3(x + w / 2, 60, z + d / 2)
    ));
  }

  _build() {
    this._ground();
    this._street();
    this._buildings();
    this._coffeeHouse();
    this._bookFair();
    this._lampsAndTrees();
    this._stringLights();
    this._taxi();
    this._tram();
    this._metroEntrance();
    this._riverAndBridge();
    this._defineSpots();
  }

  _ground() {
    const g = new THREE.Mesh(
      new THREE.PlaneGeometry(300, 300),
      new THREE.MeshStandardMaterial({ color: 0x5d6b4a, roughness: 1 })
    );
    g.rotation.x = -Math.PI / 2;
    g.position.y = -0.02;
    g.receiveShadow = true;
    this.scene.add(g);
  }

  _street() {
    // road
    const road = new THREE.Mesh(
      new THREE.PlaneGeometry(WORLD.streetMaxX - WORLD.streetMinX, WORLD.roadHalf * 2),
      new THREE.MeshStandardMaterial({ color: COLORS.road, roughness: 0.95 })
    );
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0.01, 0);
    road.receiveShadow = true;
    this.scene.add(road);

    // dashed center line
    for (let x = WORLD.streetMinX + 2; x < WORLD.streetMaxX; x += 6) {
      this._box(2.4, 0.04, 0.3, COLORS.roadLine, x, 0.03, 0, { cast: false });
    }

    // footpaths (north & south)
    [-1, 1].forEach((s) => {
      const fp = new THREE.Mesh(
        new THREE.PlaneGeometry(WORLD.streetMaxX - WORLD.streetMinX, WORLD.pathHalf - WORLD.roadHalf),
        new THREE.MeshStandardMaterial({ color: COLORS.footpath, roughness: 1 })
      );
      fp.rotation.x = -Math.PI / 2;
      fp.position.set(0, 0.04, s * (WORLD.roadHalf + (WORLD.pathHalf - WORLD.roadHalf) / 2));
      fp.receiveShadow = true;
      this.scene.add(fp);
      // curb
      this._box(WORLD.streetMaxX - WORLD.streetMinX, 0.18, 0.25, 0xb9ad97, 0, 0.09, s * WORLD.roadHalf, { cast: false });
    });
  }

  _makeBuilding(x, z, facing) {
    const w = rand(7, 11);
    const h = rand(8, 19);
    const depth = rand(7, 9);
    const color = pick(COLORS.facades);
    const tex = buildingTextures(color);
    const b = this._box(w, h, depth, 0xffffff, x, h / 2, z, {
      map: tex.map, emissive: 0xffcf7a, emissiveMap: tex.emissiveMap, emissiveIntensity: 0, rough: 0.9,
    });
    b.material.color.set(0xffffff); // texture carries color
    this.buildingMats.push(b.material);
    // simple parapet trim
    this._box(w + 0.4, 0.5, depth + 0.4, COLORS.trim, x, h + 0.2, z, { cast: false });
    // balcony slab on the street-facing side
    const bz = z + facing * (depth / 2 + 0.3);
    this._box(w * 0.8, 0.2, 0.8, COLORS.trim, x, h * 0.5, bz, { cast: false });
    this._collider(x, z, w, depth);
    return { w, h, depth };
  }

  _buildings() {
    // north row (facing +z), south row (facing -z), with gaps for landmarks
    let x = WORLD.streetMinX + 5;
    while (x < WORLD.streetMaxX - 5) {
      const w = rand(7, 11);
      // north
      if (!(x > -30 && x < -12)) this._makeBuilding(x, -(WORLD.buildLine + 4), +1);
      // south (leave open near book fair x in [6,34] and metro x in [36,46])
      if (!(x > 6 && x < 46)) this._makeBuilding(x, (WORLD.buildLine + 4), -1);
      x += w + 1.5;
    }
  }

  _coffeeHouse() {
    const x = -21, z = -(WORLD.buildLine + 4);
    const w = 14, h = 12, d = 9;
    const color = 0xe6d2a0;
    const tex = buildingTextures(color);
    const b = this._box(w, h, d, 0xffffff, x, h / 2, z, {
      map: tex.map, emissive: 0xffcf7a, emissiveMap: tex.emissiveMap, emissiveIntensity: 0,
    });
    this.buildingMats.push(b.material);
    this._box(w + 0.6, 0.6, d + 0.6, COLORS.trim, x, h + 0.3, z, { cast: false });
    // sign board facing street
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(9, 2.3),
      new THREE.MeshStandardMaterial({ map: signTexture('COFFEE HOUSE'), emissive: 0x331008, emissiveIntensity: 0.4 })
    );
    sign.position.set(x, 7.5, z + d / 2 + 0.06);
    this.scene.add(sign);
    // awning
    this._box(w, 0.3, 2.4, COLORS.terracotta ?? 0xc75c3c, x, 5.4, z + d / 2 + 1.0, { cast: false });
    this._collider(x, z, w, d);
    this.spots.coffee = new THREE.Vector3(x, 0, z + d / 2 + 2.2);
  }

  _stall(x, z, color) {
    // table
    this._box(2.6, 1.1, 1.6, 0x7a4a2a, x, 0.55, z);
    // canopy
    this._box(3.0, 0.18, 2.0, color, x, 2.0, z, { cast: false });
    // 4 thin legs to canopy
    [[-1.2, -0.8], [1.2, -0.8], [-1.2, 0.8], [1.2, 0.8]].forEach(([dx, dz]) =>
      this._box(0.1, 1.9, 0.1, 0x6b4a32, x + dx, 1.0, z + dz, { cast: false }));
    // stacked books
    for (let i = 0; i < 7; i++) {
      this._box(rand(0.6, 1.0), 0.18, rand(0.5, 0.8), pick(COLORS.cloth),
        x + rand(-1, 1), 1.2 + (i % 3) * 0.2, z + rand(-0.5, 0.5), { cast: false });
    }
    this._collider(x, z, 2.8, 1.8);
  }

  _bookFair() {
    const xs = [9, 14.5, 24, 29];
    xs.forEach((x) => this._stall(x, 6.6, pick(COLORS.cloth)));
    // banner
    const banner = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 1.6),
      new THREE.MeshStandardMaterial({ map: signTexture('BOI MELA · BOOK FAIR', '#1f6f63', '#fff3cf'), side: THREE.DoubleSide })
    );
    banner.position.set(19, 4.3, 5.6);
    this.scene.add(banner);
    // the overturned crate (a quest photo target)
    const crate = this._box(1.3, 1.0, 1.3, 0x8a5a2a, 20.5, 0.5, 7.8);
    crate.rotation.z = 0.5;
    crate.rotation.y = 0.4;
    this.spots.crate = new THREE.Vector3(20.5, 0.6, 7.8);
    // scattered papers near crate
    for (let i = 0; i < 5; i++) {
      this._box(0.5, 0.02, 0.6, 0xf3ecd6, 20 + rand(-1.2, 1.2), 0.05, 7.6 + rand(-0.8, 0.8), { cast: false });
    }
  }

  _lampsAndTrees() {
    for (let x = WORLD.streetMinX + 6; x < WORLD.streetMaxX; x += 14) {
      [-7.8, 7.8].forEach((z) => {
        this._box(0.22, 4.2, 0.22, COLORS.lampPost, x, 2.1, z, { cast: false });
        this._box(0.7, 0.2, 0.7, COLORS.lampPost, x, 4.2, z, { cast: false });
        const glowMat = new THREE.MeshStandardMaterial({ color: COLORS.lampGlow, emissive: COLORS.lampGlow, emissiveIntensity: 0 });
        const glow = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), glowMat);
        glow.position.set(x, 4.0, z);
        this.scene.add(glow);
        this.lampMats.push(glowMat);
      });
    }
    // trees
    for (let x = WORLD.streetMinX + 13; x < WORLD.streetMaxX; x += 18) {
      [-7.2, 7.2].forEach((z) => {
        this._box(0.4, 2.2, 0.4, COLORS.treeTrunk, x, 1.1, z);
        const leaf = new THREE.Mesh(
          new THREE.SphereGeometry(rand(1.4, 1.9), 10, 8),
          new THREE.MeshStandardMaterial({ color: COLORS.treeLeaf, roughness: 1, flatShading: true })
        );
        leaf.position.set(x, 3.4, z);
        leaf.castShadow = this.shadows;
        this.scene.add(leaf);
      });
    }
  }

  _stringLights() {
    // festoon between two poles over the book fair
    const x0 = 6, x1 = 33, y = 5.2, z = 5.6;
    this._box(0.18, 6, 0.18, COLORS.lampPost, x0, 3, z, { cast: false });
    this._box(0.18, 6, 0.18, COLORS.lampPost, x1, 3, z, { cast: false });
    const n = 22;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const sx = x0 + (x1 - x0) * t;
      const sag = Math.sin(t * Math.PI) * 0.9;
      const mat = new THREE.MeshStandardMaterial({ color: 0xfff0c0, emissive: 0xffd070, emissiveIntensity: 0.2 });
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), mat);
      bulb.position.set(sx, y - sag, z);
      this.scene.add(bulb);
      this.stringMats.push(mat);
    }
  }

  _taxi() {
    const x = -10, z = 3.6;
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.3, 1.9),
      new THREE.MeshStandardMaterial({ color: COLORS.taxi, roughness: 0.4, metalness: 0.2 }));
    body.position.y = 0.9; body.castShadow = this.shadows; g.add(body);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.0, 1.7),
      new THREE.MeshStandardMaterial({ color: COLORS.taxi, roughness: 0.4, metalness: 0.2 }));
    cab.position.set(-0.2, 1.8, 0); cab.castShadow = this.shadows; g.add(cab);
    // windows
    const wm = new THREE.MeshStandardMaterial({ color: 0x2a3a4a, roughness: 0.2, metalness: 0.5 });
    const win = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.8, 1.72), wm);
    win.position.set(-0.2, 1.8, 0); g.add(win);
    // wheels
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x14110f });
    [[-1.3, 1.0], [1.3, 1.0], [-1.3, -1.0], [1.3, -1.0]].forEach(([dx, dz]) => {
      const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.4, 14), wheelMat);
      wh.rotation.x = Math.PI / 2; wh.position.set(dx, 0.5, dz); g.add(wh);
    });
    g.position.set(x, 0, z);
    g.rotation.y = -0.1;
    this.scene.add(g);
    this._collider(x, z, 4.4, 2.2);
    this.spots.taxi = new THREE.Vector3(x, 0, z);
  }

  _tram() {
    // rails
    [-0.8, 0.8].forEach((z) =>
      this._box(WORLD.streetMaxX - WORLD.streetMinX, 0.06, 0.12, 0x6a6a72, 0, 0.05, z, { cast: false }));
    // tram body
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(7.5, 2.6, 2.4),
      new THREE.MeshStandardMaterial({ color: COLORS.tram, roughness: 0.5 }));
    body.position.y = 1.7; body.castShadow = this.shadows; g.add(body);
    this._tramBody = body;
    // roof
    this._addTo(g, new THREE.BoxGeometry(7.7, 0.3, 2.6), COLORS.tramTrim, 0, 3.1, 0);
    // trim stripe
    this._addTo(g, new THREE.BoxGeometry(7.6, 0.4, 2.42), COLORS.tramTrim, 0, 1.1, 0);
    // windows (emissive so they glow at night)
    this._tramWinMat = new THREE.MeshStandardMaterial({ color: 0xbfe0e6, emissive: 0xffe7a0, emissiveIntensity: 0.0, roughness: 0.3 });
    for (let i = -2; i <= 2; i++) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.9, 2.46), this._tramWinMat);
      win.position.set(i * 1.35, 2.1, 0); g.add(win);
    }
    // wheels
    [[-2.6], [2.6]].forEach(([dx]) => {
      const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 2.0, 12),
        new THREE.MeshStandardMaterial({ color: 0x14110f }));
      wh.rotation.x = Math.PI / 2; wh.position.set(dx, 0.45, 0); g.add(wh);
    });
    g.position.set(0, 0, 0);
    this.scene.add(g);
    this.tram = { group: g, dir: 1, x: -40, bellCooldown: 0 };
  }

  _addTo(group, geo, color, x, y, z) {
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.7 }));
    m.position.set(x, y, z); m.castShadow = this.shadows; group.add(m);
    return m;
  }

  _metroEntrance() {
    const x = 41, z = 8.5;
    this._box(5, 0.4, 5, 0x9a958c, x, 0.2, z, { cast: false });
    this._box(4.4, 2.0, 0.4, 0xcfc8ba, x, 1.2, z - 2.0, { cast: false }); // back wall
    // canopy
    this._box(5.2, 0.3, 5.2, 0x2f8f83, x, 3.0, z, { cast: false });
    this._box(0.3, 3, 0.3, 0x2b2630, x - 2.3, 1.5, z - 2.3, { cast: false });
    this._box(0.3, 3, 0.3, 0x2b2630, x + 2.3, 1.5, z - 2.3, { cast: false });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.2),
      new THREE.MeshStandardMaterial({ map: signTexture('METRO', '#1f3a8a', '#ffffff'), emissive: 0x10204a, emissiveIntensity: 0.5, side: THREE.DoubleSide }));
    sign.position.set(x, 3.4, z + 2.6);
    this.scene.add(sign);
    this._collider(x, z - 1.6, 5, 1.4);
    this.spots.metro = new THREE.Vector3(x, 0, z + 3);
  }

  _riverAndBridge() {
    // river
    const river = new THREE.Mesh(new THREE.PlaneGeometry(300, 60),
      new THREE.MeshStandardMaterial({ color: COLORS.river, roughness: 0.2, metalness: 0.3 }));
    river.rotation.x = -Math.PI / 2;
    river.position.set(0, -0.3, WORLD.riverZ - 18);
    this.scene.add(river);
    this._river = river;

    // stylized Howrah-like bridge silhouette spanning the river
    const z = WORLD.riverZ;
    const col = COLORS.bridge;
    // deck
    this._box(70, 1.0, 5, col, 0, 9, z, { cast: false, receive: false });
    // two towers (A-frame-ish trapezoids)
    [-16, 16].forEach((tx) => {
      this._box(2.4, 22, 4, col, tx, 11, z, { cast: false, receive: false });
      this._box(7, 2, 4, col, tx, 22, z, { cast: false, receive: false });
    });
    // cross braces (X) between towers
    for (let i = -3; i <= 3; i++) {
      const b1 = this._box(0.6, 12, 0.6, col, i * 5, 14, z + 1.6, { cast: false, receive: false });
      b1.rotation.z = 0.5;
      const b2 = this._box(0.6, 12, 0.6, col, i * 5, 14, z + 1.6, { cast: false, receive: false });
      b2.rotation.z = -0.5;
    }
    this.spots.bridgeView = new THREE.Vector3(0, 0, -9.0);
  }

  _defineSpots() {
    // character & quest anchor points (XZ on the south footpath unless noted)
    this.spots.professor = new THREE.Vector3(17, 0, 7.4);
    this.spots.bookstall = new THREE.Vector3(28.5, 0, 7.6);
    this.spots.chai = new THREE.Vector3(-5, 0, 6.6);
    this.spots.riya = new THREE.Vector3(2.5, 0, 7.6);
    this.spots.engineer = new THREE.Vector3(40, 0, 6.2);
    this.spots.playerStart = new THREE.Vector3(-2, 0, 7.5);
    if (!this.spots.tram) this.spots.tram = new THREE.Vector3(0, 0, 0);
  }

  update(dt, time) {
    this._t += dt;
    // tram patrol along the road
    if (this.tram) {
      const t = this.tram;
      t.x += t.dir * 7 * dt;
      if (t.x > 52) { t.x = 52; t.dir = -1; }
      if (t.x < -52) { t.x = -52; t.dir = 1; }
      t.group.position.x = t.x;
      t.group.rotation.y = t.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      t.bellCooldown -= dt;
      if (t.bellCooldown <= 0 && Math.abs(t.x) < 30 && Math.random() < dt * 0.3) {
        t.bellCooldown = 6;
        if (this.onTramBell) this.onTramBell();
      }
    }

    // night lighting: lamps, lit windows, string lights, tram windows
    const target = time.lampOn ? 1 : 0;
    this._night = this._night === undefined ? target : THREE.MathUtils.lerp(this._night, target, dt * 1.5);
    const n = this._night;
    for (const m of this.lampMats) m.emissiveIntensity = 0.05 + n * 1.4;
    for (const m of this.buildingMats) m.emissiveIntensity = n * 0.9;
    if (this._tramWinMat) this._tramWinMat.emissiveIntensity = n * 1.0;
    const flick = 0.6 + Math.sin(this._t * 6) * 0.15;
    for (const m of this.stringMats) m.emissiveIntensity = 0.15 + n * flick;

    // gentle river shimmer
    if (this._river) this._river.material.color.offsetHSL(0, 0, Math.sin(this._t) * 0.0006);
  }
}
