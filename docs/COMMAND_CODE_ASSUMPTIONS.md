# Command Code Assumptions

Each assumption is tagged: **verified** | **highly likely** | **observed** | **undocumented** | **unresolved**.

| Assumption | Status | Notes |
| --- | --- | --- |
| Native Windows executable names are `cmdc` and `command-code` | verified | Official Windows docs |
| POSIX / WSL alias is `cmd` | verified | Official docs |
| Headless `-p --output-format json` is the supported machine-readable API | verified | Headless docs: NDJSON event frames + result line |
| Unknown `event.type` values must be ignored (forward compatible) | verified | Headless docs |
| `sessionId` and `stopReason` on result are optional | verified | Headless docs |
| Headless sessions are hidden from interactive `/resume` picker but resumable by exact id | verified | Sessions + headless docs |
| `--continue` in print mode continues the latest **headless** session in cwd | verified | Headless docs |
| `--fork-session` with `--resume`/`--continue` creates a new session leaving original intact | verified | CLI + sessions docs |
| Transcripts live at `~/.commandcode/projects/<slug>/<id>.jsonl` | verified | Sessions docs |
| `auth.json` must never be written by the IDE | verified | Settings docs |
| `--yolo` / bypass is launch-only and must not be enabled silently | verified | Permissions docs |
| Headless default **denies** writes and shell (no TTY prompt) | verified | Headless permissions |
| `--permission-mode auto-accept` allows normal edits without prompts | highly likely | Documented as auto-accept mode; required for a useful IDE without `--yolo` |
| `--trust` skips the first-run project trust prompt | verified | CLI flags |
| `--skip-onboarding` is appropriate for IDE-launched runs | verified | CLI flags, recommended for automation |
| Cancellation is SIGINT/SIGTERM → exit 130 | verified | Headless exit codes |
| There is **no** public third-party IDE protocol equivalent to the VS Code extension | verified | IDE integration lists only VS Code/Cursor/Windsurf |
| Active-file context for this IDE must use `@path` mentions and explicit prompt context, not a fake extension handshake | verified | Official context mechanism for non-listed editors |
| `cmd --list-models` prints live model ids | verified | CLI reference |
| `cmd status --json` emits auth/status as one JSON line | verified | CLI subcommand options |
| Session JSONL first line is a header with id, created time, cwd | verified | Sessions docs |
| JSONL entry schema beyond “header + entries forming a tree” | undocumented | Parser is schema-tolerant |
| Project slug algorithm | undocumented | IDE matches sessions by reading headers’ cwd rather than guessing the slug |
| Complete AgentEvent type list | undocumented | Only `tool_running` is exemplified. Parser treats unknown types as passthrough |
| Concurrent headless processes in one cwd | highly likely | Separate session files; not officially stress-tested. IDE serializes per session id and allows parallel sessions as separate processes |
| Sending a slash command as the `-p` prompt invokes agent-invokable slash commands | highly likely | Docs: slash commands are agent-invokable; headless says do not type slash as flags — sending as the query is the remaining path for `/init`, `/compact`, etc. |
| Interactive-only commands (`/resume` picker, `/rewind` UI, plan review keys) cannot be driven from headless | verified | Headless limitations table |
| Rewind from the IDE cannot call `/rewind` interactively; exposing rewind would require undocumented file writes | verified / unresolved | IDE exposes rewind as “open in CLI” plus read-only checkpoint listing if sidecar files exist. Does **not** rewrite checkpoints |
| Official desktop app architecture is not a reusable library | verified | Alpha, ships its own runtime |
| Minimum compatible CLI: 1.x with `--output-format json` | highly likely | Warn if `--help` lacks `output-format` |
| Home directory on Windows is `%USERPROFILE%\.commandcode` | highly likely | Docs write `~/.commandcode` |
| Environment: inherit user PATH; do not inject API keys | verified | Security requirement of this IDE |
| `CMD_TOOLS_ALL_ENABLE` exists | verified | Headless tool-calls section |
| File mentions use `@path` | verified | Interactive mode |
| Model set with `-m` is session-scoped and does not change saved default | verified | Interactive mode |
| `/model` (interactive) changes default for future new sessions | verified | Not used by this IDE; IDE uses `-m` per run to avoid surprising other sessions |
