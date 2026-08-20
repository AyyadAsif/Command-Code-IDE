# Known Limitations

1. **Headless is one-shot per prompt.** Each message starts a CLI process. Session identity is preserved with `--resume`. There is no long-lived interactive TTY.

2. **Token-level streaming of assistant prose is not documented.** The official JSON stream guarantees tool `event` frames and a final `result.finalText`. The chat shows tool activity live and the answer as soon as Command Code emits it. We do not invent tokens.

3. **No interactive permission prompts.** Headless cannot ask “Allow this edit?”. Choose Plan, Auto-accept, Default (read-only in headless), or Don't-ask. Bypass/`--yolo` is off unless enabled in Settings.

4. **Not a VS Code-family editor.** `/ide`, `--ide-setup`, and `get_diagnostics` from Command Code are unsupported. Active file/selection are sent with `@mentions` and a visible context block.

5. **Rewind / plan-review TUIs** are interactive. The IDE lists checkpoints and plans from disk (read-only) and can forward `/rewind` as a prompt, but it will not rewrite Command Code transcripts or backups.

6. **Headless sessions are hidden** from Command Code’s interactive `/resume` picker. They are still real sessions and resume by id. Interactive sessions found on disk are also listed and resumed with `--resume`.

7. **`/goal` autonomy** across many unattended turns is an interactive-loop feature. The IDE can send `/goal …` and continue the same session; it does not silently add `--yolo` to keep a goal running overnight.

8. **Official Desktop app** (alpha) is a separate product with a bundled runtime. This IDE wraps the CLI you already installed.

9. **Terminal** is a command runner in the workspace (not a full PTY). Command Code remains the agent; the terminal is a user tool.

10. **Windows installer** is produced by GitHub Actions (`windows-latest`) via electron-builder NSIS + portable. Local Linux checkouts run `npm test` and `npm run preview`.

11. **Installer size** is dominated by Electron. The repo itself (source of truth) stays tiny — `node_modules` and `dist` are not committed.
