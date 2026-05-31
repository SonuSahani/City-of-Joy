// ============================================================
// Quest — "The Missing Manuscript" investigation state machine.
// Tracks clues, bond with Riya, photos/memories, deduction, ending.
// ============================================================

export const PEOPLE = [
  { id: 'sen', name: 'Professor Sen', note: 'Retired literature professor. Lost a rare Tagore notebook.' },
  { id: 'riya', name: 'Riya', note: 'Sharp young journalist. A good ally — and good company.' },
  { id: 'bablu', name: 'Bablu', note: 'Chai vendor who opens before dawn. Sees everything.' },
  { id: 'mitra', name: 'Mitra', note: 'Runs the oldest book stall at the fair.' },
  { id: 'arnab', name: 'Arnab', note: 'Quiet metro engineer. Rides the last tram each night.' },
];

const CLUE_TEXT = {
  A: 'Bablu saw someone in a green shawl hurry from the fair toward the tram at dawn.',
  B: 'Photo evidence: an overturned crate, fresh footprints, and a dropped tram ticket.',
  C: 'Mitra says a regular — the metro engineer — admired the Tagore notebook and always catches the last tram.',
};

export class Quest {
  constructor(game) {
    this.g = game;
    this.reset();
  }

  reset() {
    this.step = 'intro';            // intro -> gather -> deduce -> recover -> done
    this.clues = { A: false, B: false, C: false };
    this.clueLog = [];
    this.bond = 0;
    this.photos = 0;
    this.memories = new Set();
    this.solved = false;
    this.hasManuscript = false;
    this.solvedHour = null;
    this.flags = { riyaHint: false, hadChai: false, professorIntro: false };
  }

  get clueCount() { return Object.values(this.clues).filter(Boolean).length; }
  get total() { return (this.step === 'intro') ? 0 : 3; }

  objectiveText() {
    switch (this.step) {
      case 'intro':   return 'Find Professor Sen by the Book Fair banner.';
      case 'gather':  return 'Investigate: gather 3 clues. Talk to people and photograph the scene.';
      case 'deduce':  return 'You have the clues. Return to Professor Sen and present your theory.';
      case 'recover': return 'Find Arnab, the metro engineer, by the Metro entrance.';
      case 'return':  return 'Bring the Tagore notebook back to Professor Sen.';
      case 'done':    return 'Case solved! Wander College Street, photograph it, or chat with Riya.';
      default:        return '';
    }
  }

  startInvestigation() {
    if (this.step === 'intro') { this.step = 'gather'; this.flags.professorIntro = true; this.g.syncHUD(); }
  }

  addClue(key) {
    if (this.clues[key]) return false;
    this.clues[key] = true;
    this.clueLog.push(CLUE_TEXT[key]);
    this.g.audio && this.g.audio.good();
    this.g.ui.toast(`🔎 Clue found! (${this.clueCount}/3)`);
    if (this.clueCount >= 3 && this.step === 'gather') this.step = 'deduce';
    this.g.syncHUD();
    this.g.save();
    return true;
  }

  addBond() {
    if (this.bond >= 5) return;
    this.bond++;
    this.g.ui.setBond(this.bond);
    this.g.ui.toast(`♥ Bond with Riya grew (${this.bond}/5)`);
    this.g.save();
  }

  addPhoto(memoryKey, label) {
    this.photos++;
    if (memoryKey && !this.memories.has(memoryKey)) {
      this.memories.add(memoryKey);
      if (label) this.g.ui.toast(`📷 Memory captured: ${label}`);
    }
    this.g.save();
  }

  deductionOptions() {
    return {
      prompt: 'You\'ve gathered the clues. What really happened to Professor Sen\'s manuscript?',
      options: [
        '<b>The book-stall owner</b> secretly sold the notebook to a collector.',
        '<b>A passing thief</b> snatched it and fled Kolkata for good.',
        '<b>The metro engineer</b> took it — but not to steal. He found it and means to return it.',
      ],
      correct: 2,
    };
  }

  solveDeduction(idx) {
    const correct = this.deductionOptions().correct;
    if (idx === correct) { this.step = 'recover'; this.g.syncHUD(); this.g.save(); return true; }
    return false;
  }

  recoverManuscript() {
    this.hasManuscript = true;
    this.step = 'return';
    this.g.audio && this.g.audio.good();
    this.g.syncHUD();
    this.g.save();
  }

  returnToProfessor() {
    this.solved = true;
    this.step = 'done';
    this.solvedHour = this.g.time.hour;
    this.g.audio && this.g.audio.fanfare();
    this.g.syncHUD();
    this.g.save();
  }

  computeEnding() {
    const hour = this.solvedHour ?? this.g.time.hour;
    let stars = 1;
    if (hour < 17) stars++;                                  // efficient
    if (this.bond >= 3 || this.memories.size >= 3) stars++;  // connected / observant
    stars = Math.max(1, Math.min(3, stars));

    const timeStr = `${String(Math.floor(hour)).padStart(2, '0')}:${String(Math.floor((hour % 1) * 60)).padStart(2, '0')}`;
    let flavour;
    if (stars === 3) flavour = 'A model young journalist — sharp, kind, and observant. College Street will remember your name.';
    else if (stars === 2) flavour = 'A solid first case. The newsroom will be pleased.';
    else flavour = 'Case closed — though there\'s room to grow. Try a sharper, faster investigation next time.';

    const summary = `
      <p><b>The Missing Manuscript — solved at ${timeStr}.</b></p>
      <p>Arnab had found the Tagore notebook fallen by the tram at dawn and kept it safe,
      meaning to find its owner. You reunited it with Professor Sen.</p>
      <ul>
        <li>Bond with Riya: ${'♥'.repeat(this.bond)}${'♡'.repeat(5 - this.bond)}</li>
        <li>Memories photographed: ${this.memories.size}</li>
        <li>Clues gathered: ${this.clueCount} / 3</li>
      </ul>
      <p>${flavour}</p>`;
    return { title: 'Case Closed', stars, summary };
  }

  getState() {
    return {
      step: this.step, clues: this.clues, clueLog: this.clueLog,
      bond: this.bond, photos: this.photos, memories: [...this.memories],
      solved: this.solved, hasManuscript: this.hasManuscript,
      solvedHour: this.solvedHour, flags: this.flags,
    };
  }
  setState(s) {
    if (!s) return;
    this.step = s.step ?? 'intro';
    this.clues = s.clues ?? { A: false, B: false, C: false };
    this.clueLog = s.clueLog ?? [];
    this.bond = s.bond ?? 0;
    this.photos = s.photos ?? 0;
    this.memories = new Set(s.memories ?? []);
    this.solved = s.solved ?? false;
    this.hasManuscript = s.hasManuscript ?? false;
    this.solvedHour = s.solvedHour ?? null;
    this.flags = s.flags ?? { riyaHint: false, hadChai: false, professorIntro: false };
  }
}
