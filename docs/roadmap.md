# Roadmap, MVP & Tech Decisions

This is the honest, build-it-for-real plan. The goal is to always have **something playable**, and to grow it outward from a proven core.

---

## The Reality (why we phase)

The full vision = the combined scope of multiple AAA titles. Built naively, it never ships. Built as **vertical slices**, it becomes real: each phase is a complete, polished, playable thing that de-risks the next.

> **North star for Phase 1:** *Two streets of College Street that feel so alive a player would happily just hang out there.*

---

## Phase 0 — Foundation (docs & decisions) ✅ in progress
- [x] Vision, world bible, systems, art direction documented.
- [ ] **Choose engine** (see below).
- [ ] Choose a single first-slice scenario.
- [ ] Repo structure + project skeleton for the chosen engine.

## Phase 1 — Vertical Slice: "A Day on College Street" 🎯
The minimum that proves the *feel*. Scope it ruthlessly.
- One small, dense, beautiful district block (College Street).
- **Time/calendar** system with day blocks.
- **Walk + interact**: enter a coffee house, browse a book stall, talk to NPCs.
- **One bond character** with 2–3 hangout scenes and dialogue choices.
- **One mini-investigation** (a small missing-item/missing-person case) using clue + photo + deduction.
- Day/night cycle, ambient crowd, tram passing by, basic Bengali soundscape.
- *Success test:* a stranger plays for 15 minutes and says "this feels like Kolkata."

## Phase 2 — The Living District
- Expand College Street; add **relationship system** depth, **journalism** loop, more NPC routines, shops, cafes, a festival event (Saraswati Puja or Durga Puja set-piece).

## Phase 3 — Connected City
- Add 2–3 more Kolkata districts (Howrah, Park Street, Port Area), the **Metro** as fast-travel + mystery space, basic vehicles.

## Phase 4 — Regions & Paths
- Add a travel region (start with **Digha** — smallest/cheapest), the **detective** & **police** paths in depth.

## Phase 5+ — Full World
- Sundarbans, Darjeeling, full transport sim, full cast arcs and endings, full festival calendar.

---

## Engine / Tech Options (decision needed)

The single biggest decision. Trade-offs for a stylized-3D, anime, open-world, solo/small-team project:

| Engine | Pros | Cons | Best if… |
|--------|------|------|----------|
| **Godot 4** | Free, open-source, lightweight, great 2D+3D, GDScript is fast to iterate, growing toon-shading support | Smaller ecosystem for huge open worlds; you build more yourself | Solo/indie, want full control & no licensing |
| **Unity** | Huge asset store (toon shaders, characters, tools), tons of tutorials, proven for stylized 3D + open world | Licensing history concerns; heavier | Small team, want to assemble from assets fast |
| **Unreal 5** | Best-in-class rendering, large-world tools (World Partition) | Heavy; harder to get a clean *anime* look without effort; steep | Visual fidelity is top priority, have art muscle |
| **Web (Three.js / Babylon.js)** | Runs in a browser, instantly shareable, easiest to preview in this environment | Not a realistic *production* target for a AAA-scope 3D open world | You want a quick playable **proof-of-feel** demo first |

### Recommendation
- For the **real game**: **Godot 4** (solo/indie) or **Unity** (small team) — both are well-suited to stylized 3D.
- For a **fast, shareable first prototype right now**: a **web (Three.js)** mini-demo of a College Street block — it can be built and previewed without installing a heavy editor, proving the loop before committing to a full engine.

> ⚠️ Note on this environment: heavy editors (Unity/Unreal/Godot) can't be *run* inside this browser sandbox — I can scaffold their project files and code, but you'd build/run locally. A **web prototype** is the only thing playable directly from here.

---

## Immediate Next Step (your call)
Pick one to start Phase 1:
1. **Web proof-of-feel** — I scaffold a Three.js "walk around a College Street block, talk to one NPC, day/night" demo you can run in a browser. Fastest path to *seeing* it.
2. **Godot project skeleton** — folder structure, time/calendar system, player controller, one interactable NPC, ready to open in Godot 4 locally.
3. **Unity project skeleton** — same idea, structured for Unity.
4. **Keep designing** — flesh out the first case, the first bond character's arc, or the festival event before any code.
