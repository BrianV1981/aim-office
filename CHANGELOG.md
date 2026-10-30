# Changelog

All notable changes to **AIM-Office** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-10-30

### Security
- **Zero-Execution Read-Only Visualizer Boundary (`#21`):** Removed all `tmux` keystroke/buffer injection (`reply`, `communicate`) and raw terminal scrollback (`output`) endpoints from `src/server/officeBridge.ts` and `src/services/aimConnectClient.ts`, returning `HTTP 403 READ_ONLY_MODE` and delegating interactive command & control via deep-link to `aim-connect`.
- **Loopback Binding & Cross-Origin Protection (`#21`):** Bound Vite `dev` and `preview` servers strictly to `127.0.0.1:5175` and added `isAllowedLocalReadRequest()` (`HTTP 403 CROSS_ORIGIN_BLOCKED`) against cross-site browser requests.
- **Open-Source Path & Persona Sanitization (`#22`):** Replaced hardcoded local home paths with dynamic `os.homedir()` / `~/...` resolution and generalized all 20 Sovereign Roster personas (`80` directional sprites) for clean cross-machine portability.

### Added
- **2.5D Isometric Engine & BFS Waypoint Pathfinder (`#1`, `#4`, `#5`, `#8`):** Depth-sorted `1376x768` isometric stage, elastic 11-to-32 agent parallel 2x2 quad benches, mouse-wheel zoom (`0.75x–1.8x`), drag-to-pan camera, and Python `Pillow` 2x2 directional sprite slicer (`scripts/slice_sprite_sheet.py`).
- **4 Theme Packs (`#8`, `#9`, `#10`, `#19`):** `Subterranean War Room`, `Sovereign Command Office`, `Cutaway Creative Agency`, and `Retro 90s Bullpen (Smoke Haze)` with calibrated workstation coordinates and Day/Night lighting modes.
- **Live `aim-connect` Telemetry & 30%-Rule Context Gauges (`#2`, `#15`, `#16`, `#20`):** Sub-2ms cached `/api/office/fleet` proxy to `aim-connect` (`:8000/api/fleet/panes`), ground-truth `1M` / `200k` context window bars with `30%` Amnesia alerts, false-positive idle footer filtering, and physical `aim-communicate` courier walks.
- **Tactical RTS HUD, Staff Roster & Per-Project Kanban (`#3`, `#10`, `#11`, `#12`, `#13`, `#14`):** Floating 3-pod Tactical Top HUD, draggable 20-persona `AgentStaffRoster`, draggable `AgentInspectorDrawer` (`ZERO-EXECUTION MODE`), skewed `WallTaskBoard`, and scrollable `WhiteboardModal`.
- **Interactive Build Mode & Sims-Style Idle Hangouts (`#17`, `#18`, `#19`):** Real-time furniture drag-and-drop (`BuildModeDock`), 6-item Smart Furniture Catalog (`Coffee Bar`, `Lounge Sofa`, `Smoke Stand`, `Cyber-Vape Pod`, `Water Cooler`, `Arcade Cab`) with per-theme `localStorage` persistence, `IDLE` hangout routing, 4-angle seated postures, and SVG prop overlays.
- **Documentation Suite (`#22`):** Comprehensive `README.md`, `SECURITY.md`, `CHANGELOG.md`, and `VERSION` (`1.0.0`).

### Performance
- **Compositor & Subprocess Diet (`#20`):** Eliminated all `backdrop-filter: blur(...)` rules and continuous infinite stationary CSS animations on the isometric stage, and cached upstream `aim-connect` and repo config reads in memory.
