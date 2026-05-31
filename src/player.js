// ============================================================
// Player — stylized character + third-person orbit camera,
// collision push-out, run/stamina, simple walk animation.
// ============================================================

import * as THREE from 'three';
import { COLORS, WORLD, TUNE } from './config.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export class Player {
  constructor(scene, camera, device) {
    this.scene = scene;
    this.camera = camera;
    this.device = device;

    this.radius = 0.55;
    this.yaw = Math.PI;            // facing +z? we set mesh facing; start looking down-street
    this.camYaw = 0;
    this.camPitch = 0.25;
    this.stamina = TUNE.staminaMax;
    this.speed = 0;
    this._phase = 0;

    this._buildMesh();

    // camera init
    this._camPos = new THREE.Vector3();
    this._camTarget = new THREE.Vector3();
    this.snapCamera();
  }

  _buildMesh() {
    const cloth = COLORS.cloth[1];
    const skin = COLORS.skin[0];
    const g = new THREE.Group();

    const mk = (w, h, d, color, x, y, z, rough = 0.8) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d),
        new THREE.MeshStandardMaterial({ color, roughness: rough, flatShading: false }));
      m.position.set(x, y, z);
      m.castShadow = this.device.shadows;
      return m;
    };

    // legs (animated)
    this.legL = mk(0.26, 0.95, 0.32, 0x35506b, -0.18, 0.48, 0);
    this.legR = mk(0.26, 0.95, 0.32, 0x35506b, 0.18, 0.48, 0);
    this.legL.geometry.translate(0, -0.475, 0); this.legL.position.y = 0.95;
    this.legR.geometry.translate(0, -0.475, 0); this.legR.position.y = 0.95;
    g.add(this.legL, this.legR);

    // torso
    g.add(mk(0.72, 0.92, 0.42, cloth, 0, 1.4, 0));
    // a sash of color (Bengali touch)
    g.add(mk(0.74, 0.18, 0.44, COLORS.cloth[4], 0, 1.6, 0));

    // arms (animated) — pivot at the shoulder so they swing naturally
    this.armL = mk(0.2, 0.82, 0.24, cloth, -0.5, 1.8, 0);
    this.armR = mk(0.2, 0.82, 0.24, cloth, 0.5, 1.8, 0);
    [this.armL, this.armR].forEach((a) => { a.geometry.translate(0, -0.41, 0); });
    g.add(this.armL, this.armR);

    // head + hair + face
    const head = mk(0, 0, 0, skin, 0, 0, 0);
    head.geometry = new THREE.SphereGeometry(0.33, 16, 14);
    head.position.set(0, 2.05, 0);
    g.add(head);
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 12, 0, Math.PI * 2, 0, Math.PI / 1.7),
      new THREE.MeshStandardMaterial({ color: 0x241a16, roughness: 0.9 }));
    hair.position.set(0, 2.12, 0);
    hair.castShadow = this.device.shadows;
    g.add(hair);
    // face direction marker (nose) at +z so atan2(x,z) facing maths line up
    g.add(mk(0.12, 0.1, 0.12, 0xd98b6a, 0, 2.02, 0.3));

    // journalist's camera/bag on the back (-z)
    g.add(mk(0.4, 0.5, 0.2, 0x4a3a2a, 0, 1.4, -0.32));

    g.position.copy(new THREE.Vector3(WORLD.streetMinX + 4, 0, 7.5));
    this.scene.add(g);
    this.group = g;
  }

  get position() { return this.group.position; }

  teleport(vec) { this.group.position.set(vec.x, 0, vec.z); this.snapCamera(); }

  // ---------------- update ----------------
  update(dt, input, colliders, allowMove = true) {
    // ---- camera look ----
    const look = input.consumeLook();
    const ls = this.device.isTouch ? TUNE.lookSpeedTouch : TUNE.lookSpeedMouse;
    this.camYaw -= look.x * ls;
    this.camPitch = clamp(this.camPitch - look.y * ls, TUNE.pitchMin, TUNE.pitchMax);

    // ---- movement direction relative to camera ----
    const up = new THREE.Vector3(0, 1, 0);
    const forward = new THREE.Vector3(-Math.sin(this.camYaw), 0, -Math.cos(this.camYaw));
    const right = new THREE.Vector3().crossVectors(forward, up).normalize();

    let mv = new THREE.Vector3();
    if (allowMove) {
      mv.addScaledVector(forward, input.move.y);
      mv.addScaledVector(right, input.move.x);
    }
    const moving = mv.lengthSq() > 0.0004;
    if (moving) mv.normalize();

    // ---- run / stamina ----
    const wantRun = input.runHeld && moving && this.stamina > 1;
    if (wantRun) this.stamina = Math.max(0, this.stamina - TUNE.staminaDrain * dt);
    else this.stamina = Math.min(TUNE.staminaMax, this.stamina + TUNE.staminaRegen * dt);
    const targetSpeed = moving ? (wantRun ? TUNE.runSpeed : TUNE.walkSpeed) : 0;
    this.speed = THREE.MathUtils.lerp(this.speed, targetSpeed, 0.25);

    // ---- apply movement with collision (axis separated + push-out) ----
    const pos = this.group.position;
    if (moving) {
      pos.x += mv.x * this.speed * dt;
      pos.z += mv.z * this.speed * dt;
    }
    this._resolve(pos, colliders);

    // soft world bounds
    pos.x = clamp(pos.x, -WORLD.bound, WORLD.bound);
    pos.z = clamp(pos.z, -9.3, 9.3);

    // ---- face movement direction ----
    if (moving) {
      const targetYaw = Math.atan2(mv.x, mv.z);
      this.group.rotation.y = this._lerpAngle(this.group.rotation.y, targetYaw, TUNE.turnLerp);
    }

    // ---- walk animation ----
    if (moving) {
      this._phase += dt * (this.speed * 1.5 + 2);
      const sw = Math.sin(this._phase) * (wantRun ? 0.7 : 0.45);
      this.legL.rotation.x = sw;
      this.legR.rotation.x = -sw;
      this.armL.rotation.x = -sw * 0.8;
      this.armR.rotation.x = sw * 0.8;
      this.group.position.y = Math.abs(Math.sin(this._phase)) * 0.05;
    } else {
      this.legL.rotation.x *= 0.8; this.legR.rotation.x *= 0.8;
      this.armL.rotation.x *= 0.8; this.armR.rotation.x *= 0.8;
      this.group.position.y *= 0.8;
    }

    this._updateCamera(dt);
  }

  _resolve(pos, colliders) {
    const r = this.radius;
    for (const box of colliders) {
      const minx = box.min.x, maxx = box.max.x, minz = box.min.z, maxz = box.max.z;
      const cx = clamp(pos.x, minx, maxx);
      const cz = clamp(pos.z, minz, maxz);
      let dx = pos.x - cx, dz = pos.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 > r * r) continue;
      if (d2 > 1e-6) {
        const d = Math.sqrt(d2);
        const push = r - d;
        pos.x += (dx / d) * push;
        pos.z += (dz / d) * push;
      } else {
        // center inside: eject along nearest edge
        const left = pos.x - minx, rightP = maxx - pos.x, top = pos.z - minz, bottom = maxz - pos.z;
        const m = Math.min(left, rightP, top, bottom);
        if (m === left) pos.x = minx - r;
        else if (m === rightP) pos.x = maxx + r;
        else if (m === top) pos.z = minz - r;
        else pos.z = maxz + r;
      }
    }
  }

  _updateCamera(dt) {
    const cp = Math.cos(this.camPitch), sp = Math.sin(this.camPitch);
    const dist = TUNE.camDistance;
    const p = this.group.position;
    this._camTarget.set(p.x, p.y + 1.6, p.z);
    const desiredX = this._camTarget.x + Math.sin(this.camYaw) * cp * dist;
    const desiredY = this._camTarget.y + sp * dist + 1.2;
    const desiredZ = this._camTarget.z + Math.cos(this.camYaw) * cp * dist;
    this._camPos.set(desiredX, Math.max(0.8, desiredY), desiredZ);
    this.camera.position.lerp(this._camPos, TUNE.camLerp);
    this.camera.lookAt(this._camTarget);
  }

  snapCamera() {
    const cp = Math.cos(this.camPitch), sp = Math.sin(this.camPitch);
    const dist = TUNE.camDistance;
    const p = this.group.position;
    this._camTarget.set(p.x, p.y + 1.6, p.z);
    this.camera.position.set(
      this._camTarget.x + Math.sin(this.camYaw) * cp * dist,
      Math.max(0.8, this._camTarget.y + sp * dist + 1.2),
      this._camTarget.z + Math.cos(this.camYaw) * cp * dist
    );
    this.camera.lookAt(this._camTarget);
  }

  _lerpAngle(a, b, t) {
    let d = (b - a) % (Math.PI * 2);
    if (d > Math.PI) d -= Math.PI * 2;
    if (d < -Math.PI) d += Math.PI * 2;
    return a + d * t;
  }

  getState() {
    return { x: this.group.position.x, z: this.group.position.z, camYaw: this.camYaw };
  }
  setState(s) {
    if (!s) return;
    this.group.position.set(s.x ?? 0, 0, s.z ?? 7.5);
    this.camYaw = s.camYaw ?? 0;
    this.snapCamera();
  }
}
