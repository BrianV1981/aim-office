# Security Policy & Architecture (`v1.0.0`)

## 1. Threat Model

In the A.I.M. / J.O.S.H.U.A. ecosystem, autonomous coding agents inside `tmux` frequently operate with elevated local shell and filesystem permissions (e.g., `--dangerously-skip-permissions`). Consequently, **any unauthenticated HTTP endpoint capable of injecting keystrokes into `tmux` or reading raw terminal scrollback is equivalent to local Remote Code Execution (RCE) and secret exfiltration**—including via drive-by Cross-Site Request Forgery (`mode: "no-cors"` `POST` requests from unrelated browser tabs).

---

## 2. Enforced `v1.0.0` Posture: Option A — Zero-Execution Read-Only Visualizer (`#21`)

`aim-office` (`v1.0.0`) is architected strictly as a **Read-Only Visual Command Center**:

1. **Zero `tmux` Write / Injection Capability:** `src/server/officeBridge.ts` contains **no** `tmux set-buffer`, `paste-buffer`, or `send-keys` routines. Any non-`GET` request (`POST`, `PUT`, `PATCH`, `DELETE`) or legacy `/api/office/session/*` and `/api/office/communicate` path is rejected immediately with `HTTP 403` (`READ_ONLY_MODE`).
2. **Zero Raw Scrollback Scraping:** Raw terminal scrollback endpoints are removed so API keys, `.env` values, and sensitive console output printed inside `tmux` panes cannot be scraped through `:5175`.
3. **Loopback-Only Binding (`127.0.0.1:5175`):** Both `vite.config.ts` and `package.json` bind `dev` and `preview` servers strictly to `127.0.0.1` rather than `0.0.0.0`, preventing unauthenticated LAN exposure.
4. **Anti-CSRF / Cross-Origin Request Gate:** `isAllowedLocalReadRequest()` rejects any browser request carrying `Sec-Fetch-Site: cross-site` or a non-loopback `Origin` header (`HTTP 403 CROSS_ORIGIN_BLOCKED`).
5. **Authenticated Command Delegation to `aim-connect`:** Selecting an agent in `AgentInspectorDrawer` provides a deep-link (`http://localhost:8000/?session=<name>`) into **[aim-connect](https://github.com/BrianV1981/aim-connect)**, keeping password/passphrase hashing, TOTP, WebAuthn biometrics, end-to-end encryption (E2EE), and `🔊` spoken-summary TTS consolidated inside one hardened gateway.

---

## 3. Architectural Alternatives Evaluated (Why Options B & C Were Avoided)

During the `#21` security review, two alternative architectures were evaluated and intentionally set aside for `v1.0.0`:

- **Option B (Standalone Hardened `aim-office`):** Porting multi-step authentication (password, passphrase, TOTP, WebAuthn biometrics), E2EE encryption, and `🔊` spoken-summary extraction directly into `aim-office` was **avoided** because duplicating cryptographic and authentication stacks across two repositories doubles long-term security maintenance and creates a second privileged command-execution surface.
- **Option C (Embedding `aim-office` Inside `aim-connect`):** Merging the 2.5D React/Vite isometric stage directly into `aim-connect` as an embedded view mode was **avoided** to prevent feature creep and UI/build coupling inside `aim-connect`, preserving strict Unix modularity across both projects.

---

## 4. Supported Versions & Reporting a Vulnerability

| Version | Supported |
| :--- | :--- |
| `1.0.x` | ✅ Yes |
| `< 1.0.0` | ❌ No (upgrade to `>= 1.0.0` immediately) |

To report a security vulnerability, please open a GitHub Security Advisory on **[BrianV1981/aim-office](https://github.com/BrianV1981/aim-office/security/advisories)** rather than filing a public issue with exploit details.
