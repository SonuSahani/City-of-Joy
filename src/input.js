// ============================================================
// InputManager — one unified control surface for PC + mobile.
//
// Exposes each frame:
//   move    : {x, y}  strafe/forward in [-1,1]  (y>0 = forward)
//   runHeld : bool
//   consumeLook() -> {x, y} pixel deltas since last call
//   consumeInteract() / consumeCamera() / consumePause() /
//   consumeJournal() / consumeConfirm() -> bool (edge-triggered)
// ============================================================

export class InputManager {
  constructor(canvas, device) {
    this.canvas = canvas;
    this.device = device;

    this.move = { x: 0, y: 0 };
    this.runHeld = false;
    this._lookX = 0;
    this._lookY = 0;

    this._queued = { interact: false, camera: false, pause: false, journal: false, confirm: false };

    this.keys = new Set();
    this._touchRun = false;

    // pointer tracking
    this._lookId = null;
    this._lastPX = 0;
    this._lastPY = 0;
    this._joyId = null;
    this._joyCenter = { x: 0, y: 0 };

    this.enabled = true;     // world controls (movement/look) on/off
    this.uiOnly = false;     // when true, only confirm/pause pass through

    this._bindKeyboard();
    this._bindPointer();
    if (device.isTouch) this._bindTouchControls();
  }

  // ---------------- Keyboard (PC) ----------------
  _bindKeyboard() {
    window.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
      if (e.repeat) return;
      this.keys.add(k);
      if (k === 'e') this._queued.interact = true;
      if (k === 'c') this._queued.camera = true;
      if (k === 'escape' || k === 'p') this._queued.pause = true;
      if (k === 'j') this._queued.journal = true;
      if (k === ' ' || k === 'enter') this._queued.confirm = true;
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => this.keys.clear());
  }

  _readKeyboardMove() {
    let x = 0, y = 0;
    if (this.keys.has('w') || this.keys.has('arrowup')) y += 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) y -= 1;
    if (this.keys.has('a') || this.keys.has('arrowleft')) x -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) x += 1;
    if (x !== 0 && y !== 0) { const n = Math.SQRT1_2; x *= n; y *= n; }
    return { x, y };
  }

  // ---------------- Pointer look (drag) ----------------
  _bindPointer() {
    const el = this.canvas;
    el.addEventListener('pointerdown', (e) => {
      if (!this.enabled || this.uiOnly) return;
      if (this._lookId !== null) return;
      this._lookId = e.pointerId;
      this._lastPX = e.clientX;
      this._lastPY = e.clientY;
    });
    window.addEventListener('pointermove', (e) => {
      if (e.pointerId === this._lookId) {
        this._lookX += e.clientX - this._lastPX;
        this._lookY += e.clientY - this._lastPY;
        this._lastPX = e.clientX;
        this._lastPY = e.clientY;
      } else if (e.pointerId === this._joyId) {
        this._updateJoystick(e.clientX, e.clientY);
      }
    });
    const end = (e) => {
      if (e.pointerId === this._lookId) this._lookId = null;
      if (e.pointerId === this._joyId) this._resetJoystick();
    };
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
  }

  consumeLook() {
    const out = { x: this._lookX, y: this._lookY };
    this._lookX = 0;
    this._lookY = 0;
    return out;
  }

  // ---------------- Touch controls ----------------
  _bindTouchControls() {
    const joy = document.getElementById('joystick');
    this._knob = document.getElementById('joystick-knob');
    if (joy) {
      joy.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        const r = joy.getBoundingClientRect();
        this._joyCenter = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        this._joyId = e.pointerId;
        this._joyRadius = r.width * 0.42;
        this._updateJoystick(e.clientX, e.clientY);
      });
    }

    const run = document.getElementById('tbtn-run');
    if (run) run.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this._touchRun = !this._touchRun;
      run.classList.toggle('active-toggle', this._touchRun);
    });

    const cam = document.getElementById('tbtn-camera');
    if (cam) cam.addEventListener('pointerdown', (e) => { e.preventDefault(); this._queued.camera = true; });

    const inter = document.getElementById('tbtn-interact');
    if (inter) inter.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this._queued.interact = true;
      this._queued.confirm = true; // doubles as dialogue-advance on mobile
    });
  }

  _updateJoystick(px, py) {
    let dx = px - this._joyCenter.x;
    let dy = py - this._joyCenter.y;
    const r = this._joyRadius || 50;
    const len = Math.hypot(dx, dy) || 1;
    if (len > r) { dx = (dx / len) * r; dy = (dy / len) * r; }
    if (this._knob) this._knob.style.transform = `translate(${dx}px, ${dy}px)`;
    this.move.x = dx / r;
    this.move.y = -dy / r; // screen-down is backward
  }

  _resetJoystick() {
    this._joyId = null;
    this.move.x = 0;
    this.move.y = 0;
    if (this._knob) this._knob.style.transform = 'translate(0px, 0px)';
  }

  // ---------------- Per-frame update ----------------
  update() {
    // Movement: keyboard overrides joystick when keys are pressed.
    if (!this.device.isTouch || this.keys.size) {
      const km = this._readKeyboardMove();
      if (km.x !== 0 || km.y !== 0) { this.move.x = km.x; this.move.y = km.y; }
      else if (!this.device.isTouch) { this.move.x = 0; this.move.y = 0; }
    }
    this.runHeld = this.keys.has('shift') || this._touchRun;
    if (!this.enabled) { this.move.x = 0; this.move.y = 0; }
  }

  // ---------------- Edge consumers ----------------
  consumeInteract() { const v = this._queued.interact; this._queued.interact = false; return v; }
  consumeCamera()   { const v = this._queued.camera;   this._queued.camera = false;   return v; }
  consumePause()    { const v = this._queued.pause;    this._queued.pause = false;    return v; }
  consumeJournal()  { const v = this._queued.journal;  this._queued.journal = false;  return v; }
  consumeConfirm()  { const v = this._queued.confirm;  this._queued.confirm = false;  return v; }

  // External trigger (e.g., clicking dialogue box advances)
  queueConfirm() { this._queued.confirm = true; }
}
