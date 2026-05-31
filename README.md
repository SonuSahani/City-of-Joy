# City of Joy

An **anime-styled open-world life-simulation RPG** set in a modern-futuristic **West Bengal, India** — Kolkata as the beating heart, with travel to Digha, the Sundarbans, and Darjeeling.

Live a life: study at College Street, ride the Metro and the trams, build real friendships and romances, chase stories as a journalist or detective, and pandal-hop through Durga Puja — while mysteries run beneath the city like the tunnels themselves.

> **Inspirations:** the bond/calendar systems of *Persona 5*, the dense side-activities of *Yakuza: Like a Dragon*, the open-world freedom of *GTA V*, and the city-design ambition of *Neverness to Everness* — reimagined with a culture, architecture, food, and atmosphere that is unmistakably **Bengali and Indian**.

---

## 🎮 Play the game — "The Missing Manuscript"

A **complete, playable 3D browser game** is in this repo: a stylized slice of College Street where you play a young journalist solving a full mystery across a single in-game day. Built with **Three.js**, it runs on **desktop and mobile** (with automatic device detection) and needs **no install and no build step**.

### How to play it

**Option A — GitHub Pages (recommended, gives a shareable link):**
1. Push this repo to GitHub (already done if you're reading this there).
2. Go to **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. The included workflow (`.github/workflows/deploy.yml`) auto-deploys on every push to `main`.
4. Your game goes live at `https://<your-username>.github.io/City-of-Joy/`.

**Option B — Run locally** (any static server works, because there's no build step):
```bash
# from the repo root, using Python (or any static server)
python3 -m http.server 8000
# then open http://localhost:8000 in your browser
```
> An internet connection is needed the first time so the browser can fetch Three.js from the CDN (via the import map in `index.html`).

### Controls

| | Desktop | Mobile |
|---|---|---|
| Move | `W A S D` / arrows | left joystick |
| Look | click-drag mouse | drag on the right |
| Run | hold `Shift` | **RUN** toggle |
| Talk / interact / advance | `E` or `Space` | **●** button |
| Photo mode | `C` (then `E` to shoot) | **📷** (then **●** to shoot) |
| Journal / Menu | `J` / `Esc` | 📓 / ☰ |

### What's in the playable slice

- A walkable, stylized **College Street** at dawn → day → dusk with a live **day/night cycle**, a patrolling **tram**, a yellow Ambassador taxi, book-fair stalls, string lights, a Coffee House, a Metro entrance, and a **Howrah Bridge** silhouette over the Hooghly.
- A **full investigation**: gather 3 clues (interview characters + photograph the scene), present a **deduction**, then recover and return the manuscript for a **star-rated ending**.
- 5 distinct characters with branching dialogue, a **bond** system (Riya), a **photo mode** with a memories gallery, **stamina**, and **autosave**.

---

## Status

🟢 **Playable vertical slice shipped** (web/Three.js) + design foundation documented. This realizes Phase 1 of the roadmap; later phases expand the city, regions, and systems.

## Design Documentation

| Doc | What's inside |
|-----|---------------|
| [`docs/GDD.md`](docs/GDD.md) | Master Game Design Document: pitch, pillars, core loop, scope |
| [`docs/world.md`](docs/world.md) | World bible: regions, districts, transport, cultural texture |
| [`docs/systems.md`](docs/systems.md) | Gameplay systems, dependencies, and build order |
| [`docs/art-direction.md`](docs/art-direction.md) | Visual & audio identity; do's and don'ts |
| [`docs/roadmap.md`](docs/roadmap.md) | Phased plan, the first vertical slice, and engine choices |

## Code layout

```
index.html        # entry; import map pins Three.js (no build step)
styles.css        # responsive UI / HUD / mobile controls
src/
  main.js         # boot + game loop + state machine (menu/playing/paused/ended)
  config.js       # palette, world dimensions, tuning constants
  device.js       # PC vs touch detection + quality hints
  input.js        # unified input (keyboard/mouse + joystick/touch)
  timecycle.js    # lights, sky, fog, the in-game clock
  world.js        # procedural College Street (geometry + canvas textures)
  player.js       # character controller + third-person camera + collisions
  characters.js   # NPCs + branching conversations
  quest.js        # "The Missing Manuscript" investigation state machine
  photo.js        # photo mode + capture + clue/memory detection
  ui.js           # DOM screens, async dialogue, HUD, journal, deduction, ending
  audio.js        # procedural ambient + SFX (WebAudio, no asset files)
  save.js         # localStorage save/load
.github/workflows/deploy.yml   # auto-deploy to GitHub Pages
```

## What makes it unique

Most anime open-world games copy Tokyo, Seoul, or a generic neon future. Almost none explore Kolkata's Metro culture, the Howrah railway atmosphere, the Hooghly riverfront, Bengali festivals, Sundarbans ecology, the Darjeeling hills, Digha tourism, or College Street's book culture. **The setting itself is the hook.**

## Next step

Expand the slice per [`docs/roadmap.md`](docs/roadmap.md): more of College Street, the relationship/journalism systems in depth, a festival set-piece, then additional districts and the Metro as a fast-travel/mystery space.
