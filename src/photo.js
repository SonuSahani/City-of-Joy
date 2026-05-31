// ============================================================
// PhotoMode — viewfinder + capture. Photographing the right
// subjects gives a clue (the crate) or "memories" (landmarks).
// ============================================================

import * as THREE from 'three';

export class PhotoMode {
  constructor(game) {
    this.g = game;
    this.active = false;
    this._v = new THREE.Vector3();
  }

  toggle() { this.active ? this.exit() : this.enter(); }

  enter() {
    this.active = true;
    this.g.ui.setCamera(true);
    this.g.ui.prompt(this.g.device.isTouch
      ? 'Tap [●] to capture · [📷] to exit'
      : 'Press [E] to capture · [C] to exit');
    // gentle zoom for a viewfinder feel
    this.g.camera.fov = 48;
    this.g.camera.updateProjectionMatrix();
  }

  exit() {
    this.active = false;
    this.g.ui.setCamera(false);
    this.g.ui.prompt(null);
    this.g.camera.fov = 60;
    this.g.camera.updateProjectionMatrix();
  }

  _targets() {
    const w = this.g.world;
    const tram = w.tram ? w.tram.group.position.clone().setY(2) : new THREE.Vector3(0, 2, 0);
    return [
      { pos: w.spots.crate.clone().setY(0.8), key: 'crate', label: 'the overturned crate', range: 14, clue: true },
      { pos: new THREE.Vector3(0, 13, -34), key: 'bridge', label: 'the Howrah Bridge silhouette', range: 200 },
      { pos: tram, key: 'tram', label: 'the College Street tram', range: 40 },
      { pos: w.spots.riya.clone().setY(1.6), key: 'riya', label: 'Riya, mid-laugh', range: 12 },
      { pos: w.spots.professor.clone().setY(1.6), key: 'professor', label: 'Professor Sen', range: 12 },
      { pos: w.spots.coffee.clone().setY(4), key: 'coffeehouse', label: 'the Coffee House sign', range: 24 },
    ];
  }

  _flash() {
    const f = document.createElement('div');
    f.style.cssText = 'position:fixed;inset:0;background:#fff;z-index:60;pointer-events:none;opacity:0.85;transition:opacity .35s ease;';
    document.body.appendChild(f);
    requestAnimationFrame(() => { f.style.opacity = '0'; });
    setTimeout(() => f.remove(), 400);
  }

  capture() {
    if (!this.active) return;
    this.g.audio && this.g.audio.shutter();
    this._flash();

    // snapshot the current frame
    try {
      const url = this.g.renderer.domElement.toDataURL('image/jpeg', 0.5);
      this.g.ui.addPhoto(url);
    } catch (e) { /* tainted canvas guard — ignore */ }

    // figure out what's framed (near screen centre, in front, in range)
    const cam = this.g.camera;
    let captured = false;
    for (const t of this._targets()) {
      this._v.copy(t.pos).project(cam);
      const onScreen = this._v.z < 1 && Math.abs(this._v.x) < 0.6 && Math.abs(this._v.y) < 0.6;
      if (!onScreen) continue;
      const dist = cam.position.distanceTo(t.pos);
      if (dist > t.range) continue;

      if (t.clue && (this.g.quest.step === 'gather' || this.g.quest.step === 'deduce')) {
        const added = this.g.quest.addClue('B');
        if (!added) this.g.quest.addPhoto(t.key, null);
        captured = true;
      } else {
        this.g.quest.addPhoto(t.key, t.label);
        captured = true;
      }
    }
    if (!captured) {
      this.g.quest.addPhoto(null, null);
      this.g.ui.toast('📷 Nice shot of College Street');
    }
  }
}
