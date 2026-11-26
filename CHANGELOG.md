# Changelog

All notable changes to **AIM-Office** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.1] - 2026-11-25

### Security
- **Host Loopback Token Telemetry Bridge (`#30`):** Read host-only `0600` `~/aim-connect/backend/loopback.token` (or `AIM_LOOPBACK_TOKEN`) and attach `X-AIM-Loopback-Token` on local `aim-connect` `/api/fleet/panes` and `/api/swarm/activity` requests (`aim-connect#236`).
- **Full `/api/*` Cross-Origin & `GET`-Only Guard (`#23`):** Removed raw Vite `server.proxy` routes and gated every `/api/*` path through `handleOfficeBridgeRequest()` (`HTTP 403 CROSS_ORIGIN_BLOCKED` and `HTTP 403 READ_ONLY_MODE` with zero wildcard CORS).
- **Preview Server Parity (`#25`):** Wired `configurePreviewServer` alongside `configureServer` in `createOfficeBridgePlugin()` so `vite preview` serves `/api/office/*` JSON and enforces `HTTP 403` boundaries.

### Fixed
- **Ground-Truth Read-Only Inspector (`#24`):** Added read-only `GET /api/office/forensics` (structured transcript tool-call summaries without terminal scrollback) and `GET /api/office/workspace` (branch, git worktrees, brain files, and real `memory-wiki/log.md` delta), eliminating silent `HTTP 401` Demo fabrication when `demoMode === false`.
- **Per-Session Kanban Resolution (`#27`):** Prevented inherited template `CONFIG.json` (`number: 7` with empty `repo`) from overriding `SESSION_PROJECT_MAP`, removed the `<= 14` GitHub Project ceiling, and ignored indented metadata sub-bullets in `HANDOFF.md`.
- **Sprite CLI Flags & Threshold Tooltip (`#28`):** Added `--input` / `--slug` flag aliases alongside positional arguments in `scripts/slice_sprite_sheet.py`, updated `README.md`, and aligned the `AgentInspectorDrawer` `green < 20%` tooltip.
- **CI Workflow, Pillow 14 Compatibility & Repo Hygiene (`#26`, `#29`):** Added `.github/workflows/ci.yml`, migrated `tests/test_slice_sprite.py` to `get_flattened_data()`, updated `aim-auditor` demo path (`~/aim-agents/aim-auditor`), and pruned merged `archive-fix/*` branches.

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
