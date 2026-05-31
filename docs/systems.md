# Gameplay Systems

This document details the interlocking systems. Each is tagged with a rough **complexity / priority** to guide phasing (see [`roadmap.md`](./roadmap.md)).

Legend — Priority: **P0** (vertical slice), **P1** (early), **P2** (later), **P3** (stretch).

---

## 1. Time, Calendar & Daily Routine — `P0`
The backbone of the life-sim. A day is divided into time blocks (Morning / Afternoon / Evening / Night). Actions consume blocks; the calendar advances; events and deadlines are scheduled. Scarcity of time is the core meaningful-choice driver.

## 2. Social Stats & Skills — `P0`
- **Social Stats:** Courage, Knowledge, Charm, Empathy, Reflexes (names TBD). Gate dialogue options, jobs, and bonds.
- **Skills:** Photography, Cooking, Driving, Investigation, Fishing, etc. — leveled by doing the activity.

## 3. Relationship System — `P1`
Romanceable and friendship characters are **full characters with goals, personalities, and story arcs**. All romanceable characters are adults.

**Cast archetypes (examples):**
| Character | Hook |
|-----------|------|
| College student | Shared classes, exam-season stress, youthful idealism |
| Journalist | Drags you into investigations; ambition vs. ethics |
| Metro engineer | Access to tunnels/incidents; quiet competence |
| Police officer | The law-and-order lens; duty vs. friendship |
| Doctor | Night shifts, life-and-death perspective, calm warmth |
| Artist | Festival commissions, creative chaos, free spirit |
| IT professional | Salt Lake/New Town life, burnout, hidden depth |
| Travel blogger | Pulls you to Digha/Darjeeling; wanderlust |

**Features:** friendship levels, personal quests (confidant-style arcs), dating events, group activities, branching **story endings**.

## 4. Student Life — `P0` (slice anchor)
Attend college, take **exams**, join **clubs**, participate in **festivals**, build **friendships**. This is the connective tissue every player experiences and the natural home of the first vertical slice (College Street).

## 5. Detective Work — `P1`
Investigate **missing persons, corporate scandals, Metro incidents, smuggling cases**. Mechanics: collect clues, photograph evidence, interview NPCs, assemble deductions on a case board, reach conclusions that branch.

## 6. Police Career (optional path) — `P2`
Patrol duty, investigations, traffic control, criminal pursuit. A structured alternative lens on the same crimes the detective/journalism paths touch.

## 7. Journalism — `P1`
Take photos, interview sources, **publish reports**, uncover stories. Published work shifts public opinion/reputation and can open or close other doors.

## 8. City Life — `P1`
Cafes, shopping, apartments (player housing/customization), public transport, festivals — the texture that makes the city pleasant to inhabit.

## 9. Transportation — `P0` (basic) → `P2` (full)
Metro, local trains, ferries, buses, trams, taxis, personal vehicles. Start with **walking + Metro fast-travel** in the slice; expand to driveable vehicles and full networks later.

## 10. Activities — phased
| Category | Examples | Priority |
|----------|----------|----------|
| Casual | Photography, fishing, reading, shopping, cooking | P1 |
| Social | Festivals, concerts, club meetings, cultural events | P1 |
| Adventure | Exploration, urban legends, treasure hunts, investigations | P2 |

---

## System Dependencies (build order logic)

```
Time/Calendar (P0)
   └─> Social Stats & Skills (P0)
         └─> Student Life loop (P0)  <-- vertical slice lives here
               ├─> Relationships (P1)
               ├─> Detective Work (P1) ──> Journalism (P1) ──> Police (P2)
               └─> City Life & Activities (P1/P2)
Transport: walking + Metro fast-travel (P0) ──> full network & vehicles (P2)
```

The vertical slice proves **Time + Stats + Student Life + one bond + one mini-investigation** in a single believable district. Everything else extends outward from that proven core.
