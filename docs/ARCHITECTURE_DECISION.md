# Architecture Decision

Date: 2026-08-20  
Product: **Command Code IDE** (Windows-first desktop shell around Command Code)

## Options

### Option A — Command Code CLI as a hidden child process

Spawn `command-code` / `cmdc` / `cmd` from the IDE.

- **Reliability:** High. This is the supported product.
- **Streaming:** Official NDJSON via `-p --output-format json`. Tool events stream; final text arrives on the result frame. Unknown events ignored.
- **Session compatibility:** `--resume <id>`, `--continue`, `--fork-session`, `--session`, `-n`. Transcripts remain Command Code’s files.
- **Command coverage:** Flags for model, permission mode, plan, effort, add-dir, trust. Subcommands for login/status/models/skills/mcp. Slash commands that are agent-invokable can be sent as the prompt. Interactive-only UIs (rewind picker, plan review keys) are not emulated.
- **Windows:** `cmdc` / `command-code`, CREATE_NO_WINDOW so no console flashes.
- **Maintenance / upgrades:** Flag-oriented adapter; capability detection from `--help` / version.
- **Security:** No `--yolo` unless the user explicitly enables Bypass in Settings. Tokens stay in Command Code’s `auth.json`.
- **Cancellation:** Kill process group / `taskkill` / SIGINT → exit 130.
- **Concurrency:** One child process per in-flight prompt; multiple session ids allowed.
- **Resume / models / files:** First-class flags + filesystem watchers.
- **Latency:** Process start per turn (headless is one-shot). Acceptable; we keep the adapter warm (discovered binary, cached version/models).
- **Packaging:** IDE does not bundle Command Code. Detects the user’s install.

### Option B — Official programmatic / IPC mechanism

Headless JSON **is** the official programmatic mechanism. There is no documented long-lived daemon, gRPC, or IDE socket for third-party apps.

The VS Code/Cursor/Windsurf extension protocol is **not** documented for third parties and only auto-installs inside those IDEs.

### Option C — Official desktop architecture

Command Code Desktop is an **alpha** app that **bundles its own agent runtime**. It is not published as a library. Reusing it would duplicate a product, fight licensing/packaging, and violate “do not replace Command Code” if we vendored a second runtime. Interoperability = same session files on disk, same CLI.

### Option D — Other supported paths

- Filesystem: **read** session JSONL / meta / plans / config. **Never write** auth or transcripts.
- Hooks / MCP / skills: expose via CLI subcommands and command palette, not a new engine.
- `--ide-setup`: not applicable (we are not a listed editor).

## Decision

**Selected: Option A, using Option B’s official headless JSON protocol as the wire format.**

```
IDE UI  →  Application State  →  CommandCodeAdapter
        →  SessionManager  →  CommandCodeEngine
        →  cmdc/command-code  -p --output-format json …
```

The IDE is a presentation and workspace shell. Command Code remains the only agent, tool executor, session engine, and model router.

### Permission mapping (honest)

Headless cannot show Command Code’s interactive permission prompts. Therefore:

| IDE control | CLI | Behavior |
| --- | --- | --- |
| Plan | `--permission-mode plan` | Read-only planning |
| Default | `--permission-mode default` | Headless denies mutating tools (no TTY). UI warns. |
| Auto-accept | `--permission-mode auto-accept` | Edits/safe commands without prompts. **Recommended for coding.** |
| Don't-ask | `--permission-mode dont-ask` | Fail-closed allowlist |
| Bypass | `--yolo` | Only if user enables “Allow bypass” in Security settings |

The IDE never silently adds `--yolo`.

### IDE context

Because we are not VS Code/Cursor/Windsurf, we do **not** fake `/ide` connectivity. Active file and selection are attached using official `@path` mentions plus an explicit, visible context block in the prompt. The UI chips match what is actually sent.

### Stack (size-constrained)

- **Electron + vanilla renderer + Monaco** for a real Windows desktop IDE.
- **No extra AI SDK.** No competing agent.
- Production app size target: compressed NSIS installer well under 100 MB (Electron ~80 MB compressed; we do not bundle Chromium twice, Command Code, or node_modules in git).
- GitHub Actions produces `CommandCodeIDE-Setup-x64.exe` and a portable zip.
- Repo excludes `node_modules/` and `dist/` so source stays tiny.

### Why not Tauri

Tauri would be smaller, but Windows cross-compilation from this environment is weaker, and Node’s `child_process` + file watchers are the natural fit for wrapping a Node-based CLI. Electron is the reliable Windows packaging path; installer size stays inside the 100 MB band with NSIS maximum compression.
