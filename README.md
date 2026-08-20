# Command Code IDE

A Windows desktop IDE around **Command Code** — the CLI you already use. The IDE is the workspace (files, editor, chat, diffs, themes). Command Code is the engine (reasoning, tools, sessions, models, permissions).

This application does **not** ship a second AI agent. It starts your installed `command-code` / `cmdc` process in official headless JSON mode and shows what it actually did.

## Install (Windows)

1. Install [Command Code](https://commandcode.ai/docs/quickstart) if you have not: `npm i -g command-code`
2. Download **CommandCodeIDE-Setup-x64.exe** from [Releases](https://github.com/AyyadAsif/Command-Code-IDE/releases)
3. Run the installer (Start Menu + optional desktop shortcut)
4. Launch **Command Code IDE**

Portable build: **CommandCodeIDE-Portable.exe** (no installer).

To produce those artifacts, run `npm run build:win` on a Windows x64 machine (or GitHub Actions using `scripts/windows-build.yml`).

## First launch

- If Command Code is on your PATH (`cmdc` or `command-code`), the welcome screen shows the version.
- If it is missing, install it, then click **Detect Command Code**.
- Sign in with **Settings → Command Code Login** (opens the real `cmdc login` flow — the IDE never asks you to paste tokens).
- **Open Folder** on your project.

## Everyday use

| You want | Do this |
| --- | --- |
| Start coding with the agent | **New Chat**, type a request, Enter |
| Newline in the prompt | Shift+Enter |
| Slash commands | Type `/` — built-ins plus your `.commandcode/commands` |
| Mention a file | Type `@` or drag from the explorer |
| Active file / selection | Chips above the composer; they match what is sent (`@path` + selected lines) |
| Switch model | Dropdown (from `cmdc --list-models`) |
| Permission mode | Title bar control or Shift+Tab: `default` → `auto-accept` → `plan` |
| Fork a chat | Fork button (`--fork-session`) |
| Resume | Click a session in the sidebar (real `--resume <id>`) |
| Diffs | Git gutter + context menu **Open diff** |
| Command palette | Ctrl+Shift+P |
| Quick open | Ctrl+P |
| Stop the agent | Stop (kills the Command Code process) |

**Auto-accept** is the default for this IDE because headless Command Code cannot show interactive “allow this edit?” prompts. Plan mode is read-only. Bypass (`--yolo`) stays off until you enable it under Settings → Security.

## Themes

Midnight, Futuristic, Retro, Graphite, Light — Settings or the command palette.

## Troubleshooting

| Symptom | What to try |
| --- | --- |
| Command Code missing | `npm i -g command-code`, then Detect. On native Windows the alias is `cmdc`, not `cmd`. |
| Sign in required | Settings → Command Code Login |
| Writes never happen | You are in **plan** or **default** (headless default denies writes). Switch to **auto-accept**. |
| Engine died | Command palette → Restart Engine |
| Need raw CLI output | Status bar **Log** |

Logs: **Help → Open Logs Folder** (`%USERPROFILE%\.commandcode-ide\logs`). Secrets are redacted.

## Develop from source

```bash
npm test
npm run preview   # http://localhost:4173
npm start         # Electron (after npm install)
```

Windows installer from a Windows machine or CI:

```bash
npm install
npm run build:win
```

Outputs:

- `dist/CommandCodeIDE-Setup-x64.exe`
- `dist/CommandCodeIDE-Portable.exe`

## Support

- Command Code docs: https://commandcode.ai/docs
- Architecture and capability map: `docs/`
