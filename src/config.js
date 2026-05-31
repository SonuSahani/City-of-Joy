// ============================================================
// Global configuration: palette, world dimensions, tuning.
// ============================================================

export const COLORS = {
  // sky/day cycle keyframes are in timecycle.js
  road:        0x3a3640,
  roadLine:    0xd9c27a,
  footpath:    0x8d8478,
  footpathAlt: 0x7a7066,
  grass:       0x6f9a52,
  river:       0x4a6b86,

  // building facade palette (warm Bengali tones)
  facades: [0xd9a441, 0xc75c3c, 0xe2c275, 0x9cb4a6, 0xb08bbf, 0xd98b6a, 0xe8c98a, 0x7fa6a0],
  trim:        0xf3e7c8,
  window:      0x3b3550,
  windowLit:   0xffd98a,

  tram:        0xf4c542,
  tramTrim:    0x9c2b22,
  taxi:        0xf6c026,

  lampPost:    0x2b2630,
  lampGlow:    0xffce6b,
  treeTrunk:   0x6b4a32,
  treeLeaf:    0x5e8c46,

  bridge:      0xb6553e,

  skin:  [0xe8b48c, 0xc98a5e, 0xa9714a, 0xf0c39a, 0xd79b6b],
  cloth: [0xc0392b, 0x2980b9, 0x27ae60, 0x8e44ad, 0xe67e22, 0x16a085, 0xd35400, 0x2c3e50],
};

export const WORLD = {
  streetMinX: -62,
  streetMaxX: 62,
  roadHalf: 5,        // road spans z in [-5, 5]
  pathHalf: 8.5,      // footpaths up to z = +/-8.5
  buildLine: 12,      // building fronts at |z| ~ 12
  riverZ: -34,        // river center (north)
  bound: 60,          // soft play boundary on X
};

export const TUNE = {
  walkSpeed: 5.2,
  runSpeed: 9.0,
  turnLerp: 0.18,
  camDistance: 7.5,
  camHeight: 3.2,
  camLerp: 0.12,
  lookSpeedMouse: 0.0042,
  lookSpeedTouch: 0.006,
  pitchMin: -0.35,
  pitchMax: 0.95,
  staminaMax: 100,
  staminaDrain: 22,   // per second while running
  staminaRegen: 14,   // per second while not running
  interactRadius: 3.4,
  // day length: full 06:00 -> 19:00 game time over this many real seconds
  dayRealSeconds: 360,
  startHour: 6,
  endHour: 19,
};

export const SAVE_KEY = 'city-of-joy-save-v1';
