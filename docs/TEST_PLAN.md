# Test Plan

Automated tests live in `tests/` and run with `node --test` (no extra runner).

## Automated (CI + local)

| ID | Scenario | How |
| --- | --- | --- |
| A1 | Discover prefers `command-code` / `cmdc`, never Windows `cmd.exe` | `tests/discover.test.js` |
| A2 | NDJSON parser: event, result, unknown, malformed | `tests/parser.test.js` |
| A3 | Exit code mapping | `tests/parser.test.js` |
| A4 | Adapter builds argv: print, json, resume, fork, model, permission, never yolo by default | `tests/adapter.test.js` |
| A5 | Cancel stops the child | `tests/adapter.test.js` with mock CLI |
| A6 | Session catalog reads JSONL, ignores corrupt lines, never writes | `tests/sessions.test.js` |
| A7 | Custom slash discovery from commands dirs | `tests/slash.test.js` |
| A8 | Prompt context includes `@file` and selection only when chips say so | `tests/context.test.js` |
| A9 | Path traversal rejected | `tests/fs-safety.test.js` |
| A10 | Git porcelain parse | `tests/git.test.js` |
| A11 | Mock stream: tool_running then result.finalText, no invented events | `tests/stream.test.js` |
| A12 | Model list parser | `tests/models.test.js` |

## Manual / E2E (Windows with real Command Code)

See spec scenarios 1–20. Checklist in `docs/BUILD_PROGRESS.md`.

Clean-room: install NSIS exe on a machine that already has `command-code`, launch, open folder, New Chat, prompt, stream, edit, diff, model, resume, theme, close, reopen.
