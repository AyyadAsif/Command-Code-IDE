# Changelog

## Unreleased — 2026-08-23

- Fixed the installed app's Command Code invocation: the prompt now immediately follows the CLI's optional `-p` flag, so `cmdc` receives the message instead of exiting with “no query”.
- Fixed loading current Command Code transcripts whose chat turns use wrapped `message.role` / `message.content` records.
- Prevented a cached session from another project being resumed after switching folders and now shows the real CLI diagnostic when a run fails.
- Added a collapsible IDE file tree, draggable editor tabs, Markdown preview, a top-five model picker with “More models”, collapsible conversation history, and a comprehensive visual polish pass.

## 1.0.0 — 2026-08-20

- First release of Command Code IDE.
- Windows x64 NSIS installer and portable build.
- Command Code CLI is the sole agent engine (headless JSON protocol).
- Workspace explorer, Monaco editor, chat, sessions, models, permission modes, diffs, themes, command palette, settings.

### Build fixes

- Pinned `electron` to `33.4.11` and `electron-builder` to `26.15.3`.
- Upgrading `electron-builder` 25 → 26 removes the `winCodeSign` symlink-extraction step
  that made `npm run build:win` fail on Windows without Developer Mode/admin rights.
- Added a ready-made GitHub Actions workflow at `scripts/windows-build.yml` (copy to
  `.github/workflows/build-windows.yml` to build on every push to `main` and publish a
  Release with the `.exe` attached whenever a `v*` tag is pushed).
