# Changelog

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
