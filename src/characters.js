// ============================================================
// Characters — NPC meshes + branching conversations that drive
// the investigation. Conversations use the async UI dialogue.
// ============================================================

import * as THREE from 'three';
import { COLORS } from './config.js';

function makePerson(scene, device, { cloth, skin, hair, prop }) {
  const g = new THREE.Group();
  const mk = (w, h, d, color, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d),
      new THREE.MeshStandardMaterial({ color, roughness: 0.85 }));
    m.position.set(x, y, z);
    m.castShadow = device.shadows;
    g.add(m);
    return m;
  };
  mk(0.26, 0.95, 0.32, 0x2e3a4a, -0.17, 0.47, 0);     // legs
  mk(0.26, 0.95, 0.32, 0x2e3a4a, 0.17, 0.47, 0);
  mk(0.72, 0.92, 0.42, cloth, 0, 1.4, 0);              // torso
  mk(0.74, 0.16, 0.44, COLORS.cloth[(COLORS.cloth.indexOf(cloth) + 3) % COLORS.cloth.length], 0, 1.62, 0); // sash
  mk(0.2, 0.8, 0.24, cloth, -0.5, 1.42, 0);            // arms
  mk(0.2, 0.8, 0.24, cloth, 0.5, 1.42, 0);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.33, 16, 14),
    new THREE.MeshStandardMaterial({ color: skin, roughness: 0.8 }));
  head.position.set(0, 2.05, 0); head.castShadow = device.shadows; g.add(head);
  const hairMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.35, 16, 12, 0, Math.PI * 2, 0, Math.PI / 1.7),
    new THREE.MeshStandardMaterial({ color: hair, roughness: 0.9 }));
  hairMesh.position.set(0, 2.12, 0); g.add(hairMesh);
  mk(0.12, 0.1, 0.12, 0xd98b6a, 0, 2.02, 0.3);         // nose marker (+z faces forward)
  if (prop) mk(0.3, 0.4, 0.18, prop, 0, 1.45, 0.28);   // a held prop (book, bag)
  scene.add(g);
  return g;
}

class NPC {
  constructor(def, game) {
    this.def = def;
    this.name = def.name;
    this.position = def.spot.clone();
    this.group = makePerson(game.scene, game.device, def);
    this.group.position.copy(this.position);
    this.group.rotation.y = def.faceYaw ?? Math.PI; // face the road by default
    this._phase = Math.random() * Math.PI * 2;
    this._baseY = 0;
  }
  label() { return this.def.verb || `talk to ${this.name}`; }
  update(dt) {
    this._phase += dt * 1.4;
    this.group.position.y = this._baseY + Math.sin(this._phase) * 0.03;
  }
  interact(game) { return this.def.talk(game); }
}

export function createCharacters(game) {
  const W = game.world.spots;

  const defs = [
    // ---------------- Professor Sen (quest hub) ----------------
    {
      id: 'sen', name: 'Professor Sen', spot: W.professor, faceYaw: Math.PI,
      cloth: 0xb0bec5, skin: COLORS.skin[2], hair: 0xdddddd, prop: 0x6d4c41,
      async talk(game) {
        const ui = game.ui, q = game.quest;
        if (q.step === 'intro') {
          await ui.say('Professor Sen', 'Oh, thank goodness. You\'re the young reporter Riya mentioned?');
          await ui.say('Professor Sen', 'My rare Tagore notebook — a handwritten manuscript — vanished from my stall at dawn. The police are too busy to care.');
          const c = await ui.choices('You', 'Will you help him?', ['"I\'ll find it, Professor."', '"Tell me exactly what happened."']);
          if (c === 1) await ui.say('Professor Sen', 'I stepped away for five minutes at sunrise. When I came back, my crate was overturned and the notebook gone.');
          await ui.say('Professor Sen', 'Ask around the fair, and photograph anything odd. Riya can help you think it through.');
          q.startInvestigation();
        } else if (q.step === 'gather') {
          await ui.say('Professor Sen', `Any progress? ${q.clueCount} of 3 leads so far. Talk to Bablu the chai-seller, photograph my stall, and ask Mitra next door.`);
        } else if (q.step === 'deduce') {
          await ui.say('Professor Sen', 'You look like you\'ve pieced it together. Tell me — what happened to my notebook?');
          const d = q.deductionOptions();
          const idx = await ui.deduction(d.prompt, d.options);
          if (q.solveDeduction(idx)) {
            await ui.say('Professor Sen', '...The metro engineer. Yes — that fits every clue. He rides the dawn tram. Hurry, catch him at the Metro before his shift!');
          } else {
            await ui.say('Professor Sen', 'Hmm... that doesn\'t fit what you found. Think again about the green shawl and that dropped tram ticket.');
          }
        } else if (q.step === 'recover') {
          await ui.say('Professor Sen', 'Go on — Arnab will be at the Metro entrance to the east. Bring my notebook home.');
        } else if (q.step === 'return') {
          await ui.say('Professor Sen', 'You have it! My Tagore notebook — after all these years...');
          await ui.say('Professor Sen', 'You\'ve given an old man his life\'s work back. Bengal needs reporters like you. Dhonnobad — thank you, truly.');
          q.returnToProfessor();
          ui.closeDialogue();
          game.win();
          return;
        } else {
          await ui.say('Professor Sen', 'My notebook is safe on the shelf again. Come share a cup of cha whenever you like.');
        }
        ui.closeDialogue();
      },
    },

    // ---------------- Riya (bond character) ----------------
    {
      id: 'riya', name: 'Riya', spot: W.riya, faceYaw: Math.PI,
      cloth: COLORS.cloth[2], skin: COLORS.skin[3], hair: 0x1c1310, prop: 0x222222,
      async talk(game) {
        const ui = game.ui, q = game.quest;
        if (q.step === 'done') {
          await ui.say('Riya', 'You did it! Tomorrow\'s headline: "Young Reporter Reunites Professor With Tagore Manuscript."');
          if (!q.flags.riyaEnd) { q.flags.riyaEnd = true; q.addBond(); }
          const c = await ui.choices('Riya', 'So... what now?', ['"Couldn\'t have done it without you."', '"Cha on Park Street to celebrate?"']);
          await ui.say('Riya', c === 0 ? 'Partners, then. On to the next story, reporter.' : 'It\'s a date — once we\'re both famous. Deal?');
          ui.closeDialogue();
          return;
        }
        const openers = [
          'Hey! Riya, City Chronicle. You must be Sen\'s new helper. Let\'s crack this together.',
          'Back already? Good. A nose for stories — I like that.',
          'You\'re getting the hang of College Street, aren\'t you?',
          'Honestly? You\'re becoming a better reporter than half my newsroom.',
        ];
        await ui.say('Riya', openers[Math.min(q.bond, openers.length - 1)]);
        const c = await ui.choices('Riya', 'She studies you, pen ready.',
          ['"What\'s your read on this case?"', '"Why journalism, of all things?"']);
        if (c === 0) {
          await ui.say('Riya', 'Follow the small, dull details — the dropped ticket, who was in a hurry. Big crimes hide in tiny habits.');
        } else {
          await ui.say('Riya', 'Because the city only changes when someone bothers to write it down. Kolkata deserves the truth, told kindly.');
        }
        q.addBond();
        if (q.clueCount >= 2 && !q.flags.riyaHint) {
          q.flags.riyaHint = true;
          await ui.say('Riya', 'My instinct: green shawl, a tram ticket, a regular who loves that notebook... follow the tram. Tell the Professor when you\'re sure.');
        }
        ui.closeDialogue();
      },
    },

    // ---------------- Bablu (chai vendor) ----------------
    {
      id: 'bablu', name: 'Bablu', spot: W.chai, faceYaw: Math.PI,
      cloth: COLORS.cloth[5], skin: COLORS.skin[1], hair: 0x14100c, prop: 0xb5651d,
      async talk(game) {
        const ui = game.ui, q = game.quest;
        await ui.say('Bablu', 'Cha lagbe, dada? Best chai on College Street — opens before the sun!');
        const c = await ui.choices('Bablu', 'What\'ll it be?',
          ['Have a cup of chai (restore stamina)', 'Ask: "See anything odd at dawn?"', 'Not now']);
        if (c === 0) {
          game.player.stamina = 100;
          q.flags.hadChai = true;
          game.audio && game.audio.good();
          ui.setStamina(100);
          ui.toast('☕ Hot cha! Stamina restored.');
          await ui.say('Bablu', 'Aha! Nothing wakes you like dawn cha.');
        } else if (c === 1) {
          await ui.say('Bablu', 'Strange? Haan. Just after sunrise, someone in a bright green shawl rushed past — straight for the tram. In a real hurry, that one.');
          q.addClue('A');
        }
        ui.closeDialogue();
      },
    },

    // ---------------- Mitra (book stall owner) ----------------
    {
      id: 'mitra', name: 'Mitra', spot: W.bookstall, faceYaw: Math.PI,
      cloth: COLORS.cloth[3], skin: COLORS.skin[4], hair: 0x2a1d14, prop: 0x8e44ad,
      async talk(game) {
        const ui = game.ui, q = game.quest;
        await ui.say('Mitra', 'Welcome to the oldest stall at the Boi Mela. Looking for something rare?');
        const c = await ui.choices('Mitra', 'How can I help?',
          ['Ask about the Tagore notebook', 'Ask who visits the fair', 'Just browsing']);
        if (c === 0 || c === 1) {
          await ui.say('Mitra', 'The Tagore notebook? Ah — a quiet regular kept admiring it. The metro engineer, Arnab. Polite fellow, always dashing for the last tram.');
          q.addClue('C');
        } else {
          await ui.say('Mitra', 'Take your time. A good book waits for the right reader.');
        }
        ui.closeDialogue();
      },
    },

    // ---------------- Arnab (metro engineer) ----------------
    {
      id: 'arnab', name: 'Arnab', spot: W.engineer, faceYaw: Math.PI,
      cloth: COLORS.cloth[6], skin: COLORS.skin[2], hair: 0x171012, prop: 0x2f8f83,
      async talk(game) {
        const ui = game.ui, q = game.quest;
        if (q.step === 'recover') {
          await ui.say('Arnab', 'You\'re Professor Sen\'s reporter? I... yes. I have the notebook.');
          await ui.say('Arnab', 'I found it at dawn, fallen between the tram seats. I was afraid it would be lost forever, so I kept it safe. I meant to return it after my shift — I swear it.');
          const c = await ui.choices('You', 'How do you respond?',
            ['"I believe you. Let\'s return it together."', '"You should have spoken up sooner."']);
          await ui.say('Arnab', c === 0 ? 'Thank you. Truly. The green shawl was my mother\'s — I wear it on the dawn tram.' : 'You\'re right. I was a coward about it. I\'m sorry.');
          await ui.say('You', '(You carefully take the Tagore notebook. Time to bring it home.)');
          q.recoverManuscript();
        } else if (q.step === 'return' || q.step === 'done') {
          await ui.say('Arnab', 'Give the Professor my apologies — and my thanks for understanding.');
        } else {
          await ui.say('Arnab', 'The dawn tram is peaceful. Best part of my day, honestly. Mind the gap, hm?');
        }
        ui.closeDialogue();
      },
    },
  ];

  return defs.map((d) => new NPC(d, game));
}
