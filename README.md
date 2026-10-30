# 🏢 AIM-Office (`v1.0.0`)

[![Version](https://img.shields.io/badge/version-1.0.0-cyan.svg)](CHANGELOG.md)
[![Security: Zero-Execution Read-Only](https://img.shields.io/badge/security-read--only%20visualizer-emerald.svg)](SECURITY.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Sovereign Isometric 2.5D Pixel-Art Agent Command Center for the A.I.M. / J.O.S.H.U.A. Ecosystem**

`aim-office` transforms your live multi-agent `tmux` fleet into an interactive, isometric 2.5D pixel-art command center. Watch autonomous coding vessels (`AGY`, `Grok`, `OpenCode`, `Codex`, `Auditor`) work at their desks, walk `aim-communicate` dispatches across the floor, lounge around smart break-room furniture when idle, update per-project GitHub Kanban whiteboards, and surface live **30%-Rule Context Window** telemetry—while keeping all privileged command execution safely isolated inside **[aim-connect](https://github.com/BrianV1981/aim-connect)**.

---

## ✨ Core Features

- **Live `aim-connect` Telemetry & Sub-2ms Caching:** Proxies `GET /api/fleet/panes` and `GET /api/swarm/activity` from `aim-connect` (`http://127.0.0.1:8000`) with a `2.5s` in-memory cache (plus a `3.0s`-cached read-only local `tmux` fallback if `:8000` is restarting—or zero-dependency **Demo Mode** out of the box).
- **30%-Rule Context & Amnesia Reactor:** Real-time context meters (`green < 20%`, `amber 20–29%`, `red >= 30%`) over every agent and inside the Tactical Top HUD. Agents crossing the `30%` precision envelope trigger visual `🔥 AMNESIA` alerts for `/aim-memory-wiki` and `/aim-handoff`.
- **4 Selectable Isometric 2.5D Theme Packs:**
  1. `🛡️ Subterranean War Room` (`sovereign-war-room`) — Tactical bunker with holographic situation table & WOPR telemetry bulkheads.
  2. `🏢 Sovereign Command Office` (`classic-command`) — High-tech executive command floor with wall-mounted skewed Kanban TaskBoard.
  3. `🎨 Cutaway Creative Agency` (`cutaway-agency`) — Sunlit 3-alcove studio floorplan with strategy wing whiteboard & woven rug bays.
  4. `🚬 Retro 90s Bullpen (Smoke Haze)` (`retro-90s-bullpen`) — Classic bullpen with compositor-friendly atmospheric haze overlays.
- **Elastic 11-to-32 Workstation Lattice & Camera Controls:** Dynamically scales up to 8 parallel 2x2 quad benches (`32` workstations) with smooth mouse-wheel zoom (`0.75x – 1.8x`), drag-to-pan camera, and RTS squad quick-select hotbar (`1`–`8`).
- **20-Persona Sovereign Roster (`80` Original Sprites):** Ships with 20 clean-sheet, 4-direction (`front-left`, `front-right`, `rear-left`, `rear-right`) pixel-art character personas and a searchable, filterable left-docked **Staff & Fleet Roster**.
- **Interactive Build Mode & Sims-Style Idle Hangouts:** Toggle `🛠️ BUILD` to drag-and-drop desks or place items from the 6-piece **Smart Furniture Catalog** (`☕ Coffee Bar`, `🛋️ Lounge Sofa`, `🚬 Smoke Stand`, `💨 Cyber-Vape Pod`, `💧 Water Cooler`, `🕹️ Arcade Cab`) with per-theme `localStorage` persistence. With `☕ BREAKS ON`, `IDLE` agents gather at hangout spots (including 4-angle seated sofa postures and SVG prop overlays) and sprint back to their workstations the instant they resume work.
- **Physical `aim-communicate` Courier Walks & Per-Project Kanban:** Animates agents walking dispatches along BFS corridor waypoints between cubicles and `aim-joshua`'s Boss Desk, and resolves live GitHub Projects V2 / `HANDOFF.md` Kanban columns per selected agent.
- **Zero-Execution Security Boundary (`Option A`):** `aim-office` runs strictly as a **Read-Only Visualizer** bound to `127.0.0.1:5175`. All `tmux` prompt injection and raw terminal scrollback scraping are disabled at the server layer (`HTTP 403 READ_ONLY_MODE`); clicking **Command in AIM-Connect** deep-links directly into `aim-connect` where E2EE encryption, WebAuthn biometrics, TOTP, and `🔊` spoken-summary audio reside. See [SECURITY.md](SECURITY.md).

---

## 🚀 Quickstart

### Prerequisites
- **Node.js** `20+` and `npm`
- *(Optional for live telemetry)* **[aim-connect](https://github.com/BrianV1981/aim-connect)** running on `http://127.0.0.1:8000` and/or local `tmux` sessions (runs in interactive **Demo Mode** automatically if neither is present)
- *(Optional for custom sprite slicing)* **Python** `3.10+` with `Pillow` and `pytest`

### Installation & Local Run

```bash
git clone https://github.com/BrianV1981/aim-office.git
cd aim-office
npm install
npm run dev
```

Open **`http://127.0.0.1:5175`** in your browser.

---

## ⚙️ Configuration & Daemonization

### Environment Variables

| Variable | Default | Description |
| :--- | :--- | :--- |
| `VITE_AIM_CONNECT_URL` | `http://localhost:8000` | Base URL for `aim-connect` telemetry proxy and Inspector deep-links. |
| `VITE_AIM_API_TOKEN` | *(empty)* | Optional read token forwarded as `x-api-token` to `aim-connect`. |
| `AIM_PROJECT_MAP_JSON` | *(empty)* | Optional JSON map (`{"my-session": 12}`) overriding default session-to-GitHub-Project numbers when `<repo>/joshua_os/.aim_core/CONFIG.json` is absent. |

### Auto-Restart Integration with `aim-tmux-dashboard` (`tmux-resurrect`)
To manage `aim-office` alongside `aim-connect` and auto-resurrect it across reboots via **[aim-tmux-dashboard](https://github.com/BrianV1981/aim-tmux-dashboard)** (`~node` in `@resurrect-processes`), launch Vite directly via `node` inside your workspace session:

```bash
tmux new-window -d -t aim-connect-workspace -n "office" -c "$HOME/aim-office"
tmux send-keys -t aim-connect-workspace:office "/usr/bin/node $HOME/aim-office/node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5175" Enter
```

---

## 🎨 2x2 Pixel-Art Sprite Pipeline

All 80 directional character sprites in `public/sprites/characters/` are 100% original assets sliced from 2x2 quadrant sheets (`top-left: front-left`, `top-right: front-right`, `bottom-left: rear-left`, `bottom-right: rear-right`) with automatic magenta/checkerboard chroma-key alpha removal:

```bash
python3 scripts/slice_sprite_sheet.py \
  --input raw_sheet.png \
  --output-dir public/sprites/characters \
  --slug agent-custom
```

---

## 🧪 Testing & Production Build

```bash
# Run TypeScript / React Vitest suite (telemetry, security boundary, isometric stage, HUD)
npm test

# Run Python sprite-slicer unit tests
PYTHONPATH=. python3 -m pytest tests/test_slice_sprite.py

# Type-check and build production bundle
npm run build
```

---

## 🔒 Security Architecture

`aim-office` enforces a strict **Zero-Execution Read-Only Boundary**. Review [SECURITY.md](SECURITY.md) for full details on loopback binding, cross-origin anti-CSRF protection, and why command execution is delegated exclusively to `aim-connect`.

---

## 📜 License

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Copyright (c) 2026 Brian Vasquez. Released under the [MIT License](LICENSE).

---

<!-- AIM_ECOSYSTEM_START -->
### 🧬 The A.I.M. Ecosystem

AIM-Office is the visual isometric simulation layer in the larger A.I.M. (Actual Intelligent Memory) architecture.

👉 **[The A.I.M. Ecosystem Directory](https://github.com/BrianV1981/aim-ecosystem)**
<!-- AIM_ECOSYSTEM_END -->
