# Command Code IDE

A Windows desktop IDE around **Command Code** — the CLI you already use. The IDE is the workspace (files, editor, chat, diffs, themes). Command Code is the engine (reasoning, tools, sessions, models, permissions).

This application does **not** ship a second AI agent. It starts your installed `command-code` / `cmdc` process in official headless JSON mode and shows what it actually did.

## Install (Windows)

1. Install [Command Code](https://commandcode.ai/docs/quickstart) if you have not: `npm i -g command-code`
2. Get the installer **CommandCodeIDE-Setup-x64.exe** (see below) and double-click it
3. Follow the installer (Start Menu + optional desktop shortcut)
4. Launch **Command Code IDE**

Portable (no install): **CommandCodeIDE-Portable.exe**.

**How to get the `.exe`:**

- **Build it yourself (2 commands)** — works on any Windows x64 machine, no admin /
  Developer Mode required (fixed in `electron-builder` 26):
  ```powershell
  npm install
  npm run build:win
  ```
  Outputs `dist\CommandCodeIDE-Setup-x64.exe` and `dist\CommandCodeIDE-Portable.exe`.

- **Automatic GitHub-built releases (set up once)** — copy the ready-made workflow
  `scripts\windows-build.yml` to `.github\workflows\build-windows.yml` and push it.
  From then on every `v*` tag builds the installer on GitHub and attaches it to a
  [Release](https://github.com/AyyadAsif/Command-Code-IDE/releases), so you can just
  download `CommandCodeIDE-Setup-x64.exe`.

> The installer is not code-signed (it uses no certificate), so Windows SmartScreen
> may show a prompt. Click **More info → Run anyway**.

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
| `Electron failed to install correctly` (dev only) | The Electron binary did not download. Delete `node_modules/electron`, make sure `npm config get ignore-scripts` is `false`, then `npm install` again (or run `node node_modules/electron/install.js`). |
| Build fails with `Cannot create symbolic link` (winCodeSign) | Old `electron-builder` 24/25 bug on Windows without Developer Mode. This project now pins `electron-builder` 26.x, which fixes it — delete `node_modules` + `package-lock.json` and reinstall if you still see it. |
| Command Code missing | `npm i -g command-code`, then Detect. On native Windows the alias is `cmdc`, not `cmd`. |
| Sign in required | Settings → Command Code Login |
| Writes never happen | You are in **plan** or **default** (headless default denies writes). Switch to **auto-accept**. |
| Engine died | Command palette → Restart Engine |
| Need raw CLI output | Status bar **Log** |

Logs: **Help → Open Logs Folder** (`%USERPROFILE%\.commandcode-ide\logs`). Secrets are redacted.

## Develop from source

```bash
npm install
npm test
npm run preview   # http://localhost:4173
npm start         # Electron (after npm install)
```

Windows installer from any Windows x64 machine (no admin / no Developer Mode required):

```bash
npm install
npm run build:win
```

Outputs:

- `dist/CommandCodeIDE-Setup-x64.exe`
- `dist/CommandCodeIDE-Portable.exe`

A ready-to-use GitHub Actions workflow is included at `scripts/windows-build.yml`.
To enable automatic builds + tagged Releases, copy it to
`.github/workflows/build-windows.yml` and push.

## Support

- Command Code docs: https://commandcode.ai/docs
- Architecture and capability map: `docs/`
