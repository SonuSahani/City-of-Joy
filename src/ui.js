// ============================================================
// UI — all DOM screens, the async dialogue system (typewriter +
// choices), HUD, journal, deduction modal, toasts, photo strip.
// ============================================================

export class UI {
  constructor() {
    this.audio = null;            // set by main
    this.dialogueActive = false;
    this._typing = false;
    this._typer = null;
    this._typedCb = null;
    this._onAdvance = null;
    this._toastTimer = null;

    this.$ = (id) => document.getElementById(id);

    // dialogue
    this.dlg = this.$('dialogue');
    this.dlgName = this.$('dialogue-name');
    this.dlgText = this.$('dialogue-text');
    this.dlgChoices = this.$('dialogue-choices');
    this.dlgContinue = this.$('dialogue-continue');

    // clicking/tapping the dialogue box advances it
    if (this.dlg) {
      this.dlg.addEventListener('pointerdown', (e) => {
        if (this.dlgChoices.contains(e.target)) return; // let choice buttons handle
        this.advance();
      });
    }
  }

  // ---------- generic helpers ----------
  show(el) { el && el.classList.remove('hidden'); }
  hide(el) { el && el.classList.add('hidden'); }
  visible(el) { return el && !el.classList.contains('hidden'); }

  // returns true when world input should be blocked
  uiBlocking() {
    return this.dialogueActive ||
      ['start-screen', 'how-screen', 'journal', 'deduction', 'pause-screen', 'end-screen', 'loading']
        .some((id) => this.visible(this.$(id)));
  }

  // ---------- start / how / loading ----------
  setDeviceNote(text) { const e = this.$('device-note'); if (e) e.textContent = text; }
  showLoading(t) { if (t) this.$('loading-text').textContent = t; this.show(this.$('loading')); }
  hideLoading() { this.hide(this.$('loading')); }
  showStart(hasSave) {
    this.show(this.$('start-screen'));
    const c = this.$('btn-continue');
    if (hasSave) this.show(c); else this.hide(c);
  }
  hideStart() { this.hide(this.$('start-screen')); }
  showHowTo(html) { this.$('how-content').innerHTML = html; this.show(this.$('how-screen')); }
  hideHowTo() { this.hide(this.$('how-screen')); }

  showHUD() { this.show(this.$('hud')); }
  showTouch() { this.show(this.$('touch-controls')); }

  // ---------- HUD setters ----------
  setClock(day, clock, phase) {
    this.$('hud-day').textContent = `Day ${day}`;
    this.$('hud-clock').textContent = phase ? `${clock} · ${phase}` : clock;
  }
  setBond(n) {
    n = Math.max(0, Math.min(5, n));
    this.$('hud-bond').textContent = '♥'.repeat(n) + '♡'.repeat(5 - n);
  }
  setStamina(pct) { this.$('stamina-fill').style.width = `${Math.max(0, Math.min(100, pct))}%`; }
  setObjective(text, clues, total) {
    this.$('objective-text').textContent = text;
    const cc = this.$('clue-count');
    if (total > 0) { cc.textContent = `Clues: ${clues} / ${total}`; this.show(cc); }
    else this.hide(cc);
  }

  prompt(text) {
    const p = this.$('prompt');
    if (!text) { this.hide(p); return; }
    // [E] tokens -> styled keys
    p.innerHTML = text.replace(/\[([^\]]+)\]/g, '<span class="key">$1</span>');
    this.show(p);
  }

  toast(msg, dur = 2400) {
    const t = this.$('toast');
    t.textContent = msg;
    this.show(t);
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => this.hide(t), dur);
  }

  setCamera(active) { active ? this.show(this.$('camera-overlay')) : this.hide(this.$('camera-overlay')); }

  // ---------- dialogue (async) ----------
  _showDialogue() { this.show(this.dlg); this.dialogueActive = true; }
  _clearChoices() { this.dlgChoices.innerHTML = ''; }

  _type(text, cb) {
    this._typing = true;
    this._typedCb = cb || null;
    this.dlgContinue.classList.add('hidden');
    this.dlgText.textContent = '';
    const full = String(text);
    let i = 0;
    clearInterval(this._typer);
    this._typer = setInterval(() => {
      i++;
      this.dlgText.textContent = full.slice(0, i);
      if (i >= full.length) this._doneTyping(full);
    }, 16);
    this._full = full;
  }
  _doneTyping(full) {
    clearInterval(this._typer);
    this.dlgText.textContent = full;
    this._typing = false;
    const cb = this._typedCb; this._typedCb = null;
    if (cb) cb();
  }
  _finishType() { if (this._typing) this._doneTyping(this._full); }

  advance() {
    if (this._onAdvance) this._onAdvance();
  }

  say(name, text) {
    return new Promise((resolve) => {
      this._showDialogue();
      this.dlgName.textContent = name;
      this._clearChoices();
      this._type(text, () => this.dlgContinue.classList.remove('hidden'));
      this._onAdvance = () => {
        if (this._typing) this._finishType();
        else { this._onAdvance = null; resolve(); }
      };
    });
  }

  choices(name, text, options) {
    return new Promise((resolve) => {
      this._showDialogue();
      this.dlgName.textContent = name;
      this._clearChoices();
      this.dlgContinue.classList.add('hidden');
      const render = () => {
        this._clearChoices();
        options.forEach((label, idx) => {
          const b = document.createElement('button');
          b.className = 'choice-btn';
          b.textContent = label;
          b.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
            this.audio && this.audio.blip();
            this._onAdvance = null;
            this._clearChoices();
            resolve(idx);
          });
          this.dlgChoices.appendChild(b);
        });
      };
      this._type(text, render);
      this._onAdvance = () => { if (this._typing) this._finishType(); };
    });
  }

  closeDialogue() {
    this.dialogueActive = false;
    this._onAdvance = null;
    clearInterval(this._typer);
    this._typing = false;
    this._clearChoices();
    this.hide(this.dlg);
  }

  // ---------- journal ----------
  openJournal(clues, people) {
    const cl = this.$('journal-clues');
    cl.innerHTML = clues.length
      ? clues.map((c) => `<li>${c}</li>`).join('')
      : '<li class="muted">No clues yet. Talk to people and photograph the scene.</li>';
    const pl = this.$('journal-people');
    pl.innerHTML = people.map((p) => `<li><b>${p.name}</b> — ${p.note}</li>`).join('');
    this.show(this.$('journal'));
  }
  closeJournal() { this.hide(this.$('journal')); }

  // ---------- deduction ----------
  deduction(promptText, options) {
    return new Promise((resolve) => {
      const p = this.$('deduction').querySelector('p');
      if (p && promptText) p.textContent = promptText;
      const box = this.$('deduction-choices');
      box.innerHTML = '';
      options.forEach((opt, idx) => {
        const b = document.createElement('button');
        b.className = 'ded-btn';
        b.innerHTML = opt;
        b.addEventListener('pointerdown', () => {
          this.audio && this.audio.blip();
          this.hide(this.$('deduction'));
          resolve(idx);
        });
        box.appendChild(b);
      });
      this.show(this.$('deduction'));
    });
  }

  // ---------- pause / end ----------
  showPause() { this.show(this.$('pause-screen')); }
  hidePause() { this.hide(this.$('pause-screen')); }
  showEnd(title, stars, summaryHTML) {
    this.$('end-title').textContent = title;
    this.$('end-rank').textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
    this.$('end-summary').innerHTML = summaryHTML;
    this.show(this.$('end-screen'));
  }
  hideEnd() { this.hide(this.$('end-screen')); }

  // ---------- photo strip ----------
  addPhoto(dataURL) {
    const strip = this.$('photo-strip');
    const img = document.createElement('img');
    img.className = 'photo-thumb';
    img.src = dataURL;
    strip.insertBefore(img, strip.firstChild);
    while (strip.children.length > 5) strip.removeChild(strip.lastChild);
  }
  clearPhotos() { this.$('photo-strip').innerHTML = ''; }

  setMuteIcon(muted) { this.$('btn-mute').textContent = muted ? '🔇' : '🔊'; }
}
