// ============================================================
// TimeCycle — owns lights, fog, sky color and the game clock.
// Drives a dawn -> day -> dusk -> night look over the play session.
// ============================================================

import * as THREE from 'three';
import { TUNE } from './config.js';

// Keyframes by hour. Colors are hex; lerped between neighbours.
const KEYS = [
  { h: 5.0,  sky: 0x222848, fog: 0x2a2e4a, sun: 0xffb070, sunI: 0.30, amb: 0.30, hemi: 0.45, elev: 3 },
  { h: 7.0,  sky: 0xa7c8ec, fog: 0xdcc7ad, sun: 0xffd9a0, sunI: 1.00, amb: 0.55, hemi: 0.75, elev: 20 },
  { h: 11.0, sky: 0x8fc4f5, fog: 0xd2e2f0, sun: 0xfff3d6, sunI: 1.30, amb: 0.72, hemi: 0.98, elev: 62 },
  { h: 15.0, sky: 0x88bef0, fog: 0xccdcec, sun: 0xfff0cf, sunI: 1.18, amb: 0.70, hemi: 0.92, elev: 46 },
  { h: 17.5, sky: 0xf2ad6e, fog: 0xebbb90, sun: 0xff9a4a, sunI: 0.98, amb: 0.56, hemi: 0.72, elev: 14 },
  { h: 19.0, sky: 0x704d88, fog: 0x5d4672, sun: 0xc77a8a, sunI: 0.52, amb: 0.42, hemi: 0.52, elev: 6 },
  { h: 21.0, sky: 0x241a36, fog: 0x281f37, sun: 0x8a8ad0, sunI: 0.26, amb: 0.32, hemi: 0.42, elev: 3 },
];

function lerpHex(a, b, t) {
  const ca = new THREE.Color(a), cb = new THREE.Color(b);
  return ca.lerp(cb, t);
}

export class TimeCycle {
  constructor(scene) {
    this.scene = scene;
    this.hour = TUNE.startHour;
    this.day = 1;
    this.lampOn = false;

    // Lights
    this.hemi = new THREE.HemisphereLight(0xbfd4ec, 0x6b5a47, 0.8);
    scene.add(this.hemi);

    this.ambient = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(this.ambient);

    this.sun = new THREE.DirectionalLight(0xfff0d0, 1.1);
    this.sun.position.set(30, 40, 20);
    scene.add(this.sun);
    scene.add(this.sun.target);

    this.bg = new THREE.Color(0xa7c8ec);
    scene.background = this.bg;
    scene.fog = new THREE.Fog(0xdcc7ad, 35, 150);

    this.apply(); // initialise look at start hour
  }

  enableShadows(mapSize = 2048) {
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(mapSize, mapSize);
    const c = this.sun.shadow.camera;
    c.near = 1; c.far = 160;
    c.left = -70; c.right = 70; c.top = 70; c.bottom = -70;
    this.sun.shadow.bias = -0.0004;
  }

  // advance time
  update(dt) {
    const span = TUNE.endHour - TUNE.startHour;       // 13 hours
    const rate = span / TUNE.dayRealSeconds;          // hours per real second
    this.hour += rate * dt;
    if (this.hour > 23.0) this.hour = 23.0;            // clamp deep night
    this.apply();
  }

  setHour(h) { this.hour = h; this.apply(); }

  apply() {
    const h = this.hour;
    // find surrounding keyframes
    let k0 = KEYS[0], k1 = KEYS[KEYS.length - 1];
    for (let i = 0; i < KEYS.length - 1; i++) {
      if (h >= KEYS[i].h && h <= KEYS[i + 1].h) { k0 = KEYS[i]; k1 = KEYS[i + 1]; break; }
    }
    if (h <= KEYS[0].h) { k0 = k1 = KEYS[0]; }
    if (h >= KEYS[KEYS.length - 1].h) { k0 = k1 = KEYS[KEYS.length - 1]; }
    const t = (k1.h === k0.h) ? 0 : (h - k0.h) / (k1.h - k0.h);

    this.bg.copy(lerpHex(k0.sky, k1.sky, t));
    if (this.scene.fog) this.scene.fog.color.copy(lerpHex(k0.fog, k1.fog, t));

    this.sun.color.copy(lerpHex(k0.sun, k1.sun, t));
    this.sun.intensity = THREE.MathUtils.lerp(k0.sunI, k1.sunI, t);
    this.ambient.intensity = THREE.MathUtils.lerp(k0.amb, k1.amb, t);
    this.hemi.intensity = THREE.MathUtils.lerp(k0.hemi, k1.hemi, t);

    // sun position: azimuth east->west across the day, elevation from keyframes
    const elev = THREE.MathUtils.lerp(k0.elev, k1.elev, t) * Math.PI / 180;
    const dayT = THREE.MathUtils.clamp((h - 6) / 12, 0, 1);   // 0 at 6h, 1 at 18h
    const az = (-0.5 + dayT) * Math.PI * 1.1;                 // swing across sky
    const r = 80;
    this.sun.position.set(
      Math.sin(az) * Math.cos(elev) * r,
      Math.max(6, Math.sin(elev) * r),
      Math.cos(az) * Math.cos(elev) * r * 0.4 + 20
    );

    this.lampOn = (h < 6.7 || h > 17.6);
  }

  clockString() {
    const hh = Math.floor(this.hour);
    const mm = Math.floor((this.hour - hh) * 60);
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  }

  phase() {
    const h = this.hour;
    if (h < 7) return 'dawn';
    if (h < 11.5) return 'morning';
    if (h < 15.5) return 'afternoon';
    if (h < 18) return 'golden hour';
    if (h < 19.5) return 'dusk';
    return 'night';
  }
}
