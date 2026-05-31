// ============================================================
// City of Joy — The Missing Manuscript
// Entry point: boots Three.js, builds the game, runs the loop,
// wires UI, handles the menu/playing/paused/ended state machine.
// ============================================================

import * as THREE from 'three';
import { detectDevice } from './device.js';
import { InputManager } from './input.js';
import { AudioEngine } from './audio.js';
import { TimeCycle } from './timecycle.js';
import { World } from './world.js';
import { Player } from './player.js';
import { UI } from './ui.js';
import { Quest, PEOPLE } from './quest.js';
import { PhotoMode } from './photo.js';
import { createCharacters } from './characters.js';
import { saveGame, loadGame, clearSave, hasSave } from './save.js';
import { TUNE } from './config.js';

class Game {
  constructor() {
    this.device = detectDevice();
    this.ui = new UI();
    this.ui.setDeviceNote(this.device.label);

    this.canvas = document.getElementById('game-canvas');
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: !this.device.lowPower,
      preserveDrawingBuffer: true, // needed for photo capture
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(this.device.dpr);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    if (this.device.shadows) {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 400);

    this.mode = 'loading';           // loading | menu | playing | paused | ended
    this.clock = new THREE.Clock();
    this._menuT = 0;
    this._saveTimer = 0;

    this.audio = new AudioEngine();
    this.ui.audio = this.audio;

    window.addEventListener('resize', () => this._onResize());
    this._bindButtons();
  }

  // ---------------- build ----------------
  async init() {
    this.ui.showLoading('Waking up the city…');
    await this._frame(); // let the loading screen paint

    this.input = new InputManager(this.canvas, this.device);
    this.time = new TimeCycle(this.scene);
    if (this.device.shadows) this.time.enableShadows(this.device.isTouch ? 1024 : 2048);

    this.world = new World(this.scene, this.device);
    this.world.onTramBell = () => this.audio.tramBell();

    this.player = new Player(this.scene, this.camera, this.device);
    this.player.teleport(this.world.spots.playerStart);

    this.photo = new PhotoMode(this);
    this.quest = new Quest(this);
    this.characters = createCharacters(this);

    this.ui.hideLoading();
    this.mode = 'menu';
    this.ui.showStart(hasSave());
    this.clock.start();
    this._loop();
  }

  _frame() { return new Promise((r) => requestAnimationFrame(() => r())); }

  // ---------------- buttons / menu ----------------
  _bindButtons() {
    const $ = (id) => document.getElementById(id);
    $('btn-play').addEventListener('click', () => this.startPlaying(true));
    $('btn-continue').addEventListener('click', () => this.continueGame());
    $('btn-how').addEventListener('click', () => this.ui.showHowTo(this._howHTML()));
    $('btn-how-close').addEventListener('click', () => this.ui.hideHowTo());
    $('btn-pause-how').addEventListener('click', () => this.ui.showHowTo(this._howHTML()));
    $('btn-mute').addEventListener('click', () => {
      this.audio.start();
      const m = this.audio.toggleMute();
      this.ui.setMuteIcon(m);
    });
    $('btn-journal').addEventListener('click', () => this._toggleJournal());
    $('btn-journal-close').addEventListener('click', () => this.ui.closeJournal());
    $('btn-pause').addEventListener('click', () => this.pause());
    $('btn-resume').addEventListener('click', () => this.resume());
    $('btn-restart').addEventListener('click', () => this.restart());
    $('btn-end-replay').addEventListener('click', () => this.restart());
  }

  _howHTML() {
    if (this.device.isTouch) {
      return `<p style="text-align:left;line-height:1.7">
        <b>Move:</b> left joystick<br>
        <b>Look:</b> drag anywhere on the right<br>
        <b>RUN:</b> toggle button (uses stamina)<br>
        <b>📷 Camera:</b> enter photo mode, then <b>●</b> to capture<br>
        <b>● button:</b> talk / interact / advance dialogue<br>
        <b>📓 / ☰:</b> journal & menu</p>
        <p>Goal: gather <b>3 clues</b> (talk to people + photograph the scene), then present your theory to Professor Sen.</p>`;
    }
    return `<p style="text-align:left;line-height:1.7">
      <b>Move:</b> WASD / Arrow keys<br>
      <b>Look:</b> click-drag the mouse<br>
      <b>Run:</b> hold Shift (uses stamina)<br>
      <b>Interact / talk / advance:</b> E or Space<br>
      <b>Photo mode:</b> C — then E to capture, C to exit<br>
      <b>Journal:</b> J &nbsp; <b>Menu:</b> Esc</p>
      <p>Goal: gather <b>3 clues</b> (talk to people + photograph the scene), then present your theory to Professor Sen.</p>`;
  }

  _toggleJournal() {
    if (this.ui.visible(document.getElementById('journal'))) { this.ui.closeJournal(); return; }
    const people = PEOPLE.filter((p) => p.id !== 'arnab' || this.quest.clues.C || this.quest.step !== 'gather');
    this.ui.openJournal(this.quest.clueLog, people);
  }

  // ---------------- state transitions ----------------
  startPlaying(fresh) {
    this.audio.start();
    this.ui.hideStart();
    this.ui.hideEnd();
    this.ui.hideHowTo();

    if (fresh) {
      clearSave();
      this.quest.reset();
      this.player.teleport(this.world.spots.playerStart);
      this.player.camYaw = -Math.PI / 2;   // look east, down the fair
      this.player.camPitch = 0.22;
      this.player.stamina = TUNE.staminaMax;
      this.time.setHour(TUNE.startHour);
      this.time.day = 1;
      this.ui.clearPhotos();
    }
    this.player.snapCamera();
    this.ui.showHUD();
    if (this.device.isTouch) this.ui.showTouch();
    this.ui.setBond(this.quest.bond);
    this.ui.setMuteIcon(this.audio.muted);
    this.syncHUD();
    this.mode = 'playing';
    if (fresh) {
      setTimeout(() => this.ui.toast('Dawn on College Street. Find Professor Sen by the Book Fair banner.', 4200), 400);
    }
  }

  continueGame() {
    const s = loadGame();
    if (!s) { this.startPlaying(true); return; }
    this.player.setState(s.player);
    this.quest.setState(s.quest);
    this.time.setHour(s.hour ?? TUNE.startHour);
    this.time.day = s.day ?? 1;
    this.audio.setMuted(!!s.mute);
    this.ui.clearPhotos();
    this.startPlaying(false);
  }

  pause() {
    if (this.mode !== 'playing' || this.ui.dialogueActive) return;
    this.mode = 'paused';
    this.ui.showPause();
    this.save();
  }
  resume() { this.ui.hidePause(); this.mode = 'playing'; }

  restart() {
    this.ui.hideEnd();
    this.ui.hidePause();
    this.ui.closeDialogue();
    this.ui.closeJournal();
    if (this.photo.active) this.photo.exit();
    this.startPlaying(true);
  }

  win() {
    this.mode = 'ended';
    clearSave();
    const e = this.quest.computeEnding();
    setTimeout(() => this.ui.showEnd(e.title, e.stars, e.summary), 600);
  }

  // ---------------- helpers ----------------
  syncHUD() {
    this.ui.setObjective(this.quest.objectiveText(), this.quest.clueCount, this.quest.total);
    this.ui.setBond(this.quest.bond);
  }

  save() {
    saveGame({
      player: this.player.getState(),
      quest: this.quest.getState(),
      hour: this.time.hour,
      day: this.time.day,
      mute: this.audio.muted,
    });
  }

  _onResize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(this.device.dpr);
  }

  _nearestNPC() {
    let best = null, bestD = TUNE.interactRadius;
    const p = this.player.position;
    for (const npc of this.characters) {
      const d = Math.hypot(npc.position.x - p.x, npc.position.z - p.z);
      if (d < bestD) { bestD = d; best = npc; }
    }
    return best;
  }

  // ---------------- main loop ----------------
  _loop() {
    requestAnimationFrame(() => this._loop());
    const dt = Math.min(0.05, this.clock.getDelta());

    // idle animation for NPCs + tram always run so the city feels alive
    if (this.characters) for (const n of this.characters) n.update(dt);

    if (this.mode === 'playing') {
      const blocking = this.ui.uiBlocking();
      this.input.enabled = !blocking;
      this.input.update();

      // advance time only while actively playing (not in menus/dialogue)
      if (!blocking && !this.photo.active) this.time.update(dt);

      this.world.update(dt, this.time);
      this.player.update(dt, this.input, this.world.colliders, true);

      this._handleInteractions(blocking);

      // HUD
      this.ui.setClock(this.time.day, this.time.clockString(), this.time.phase());
      this.ui.setStamina(this.player.stamina);

      // periodic autosave
      this._saveTimer += dt;
      if (this._saveTimer > 8) { this._saveTimer = 0; this.save(); }
    } else {
      // menu / paused / ended: keep the world gently alive
      this.world && this.world.update(dt, this.time);
      if (this.mode === 'menu') this._menuCamera(dt);
    }

    this.renderer.render(this.scene, this.camera);
  }

  _handleInteractions(blocking) {
    const input = this.input;

    // pause hotkey
    if (input.consumePause()) { this.pause(); return; }

    if (blocking) {
      // route confirm/interact to dialogue advance; swallow others
      if (this.ui.dialogueActive && (input.consumeConfirm() || input.consumeInteract())) this.ui.advance();
      input.consumeCamera();
      this.ui.prompt(null);
      return;
    }

    if (input.consumeJournal()) { this._toggleJournal(); return; }

    if (this.photo.active) {
      if (input.consumeCamera()) { this.photo.exit(); return; }
      if (input.consumeInteract()) this.photo.capture();
      input.consumeConfirm();
      return;
    }

    // enter photo mode
    if (input.consumeCamera()) { this.photo.enter(); input.consumeInteract(); return; }

    // NPC interaction
    const npc = this._nearestNPC();
    if (npc) {
      const key = this.device.isTouch ? '●' : 'E';
      this.ui.prompt(`[${key}] ${npc.label()}`);
      if (input.consumeInteract()) {
        this.ui.prompt(null);
        npc.interact(this);   // async; UI dialogue takes over
      }
    } else {
      this.ui.prompt(null);
      input.consumeInteract();
    }
    input.consumeConfirm();
  }

  _menuCamera(dt) {
    this._menuT += dt * 0.12;
    const center = new THREE.Vector3(10, 1.4, 4);
    const r = 20;
    this.camera.position.set(
      center.x + Math.cos(this._menuT) * r,
      8 + Math.sin(this._menuT * 0.6) * 1.5,
      center.z + Math.sin(this._menuT) * r
    );
    this.camera.lookAt(center);
  }
}

// boot
const game = new Game();
game.init();
window.__cityOfJoy = game; // handy for debugging
