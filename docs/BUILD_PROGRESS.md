# Build Progress

## Research complete

- Official docs systematically reviewed (see `COMMAND_CODE_SOURCES.md`).
- npm `command-code@1.28.4` confirmed bins: `cmd`, `cmdc`, `commandcode`, `command-code`.
- Official desktop audited: alpha, bundled runtime, not reused.
- Architecture selected: hidden CLI child + official headless NDJSON.

## Integration discoveries

- `--output-format json` NDJSON is the machine contract.
- Windows alias `cmdc` (never `cmd.exe`).
- Sessions: `~/.commandcode/projects/<slug>/<id>.jsonl`.
- Do not touch `auth.json` or rewrite jsonl.
- Headless denies writes unless auto-accept/yolo.
- No third-party IDE protocol.

## Architecture decisions

See `ARCHITECTURE_DECISION.md`. Electron vanilla + Monaco. Adapter isolation.

## Features implemented

- Engine discovery, version, status, models
- Session create / resume / fork / continue
- NDJSON parser + event normalization
- Chat streaming of real events
- File explorer, Monaco editor, diffs, git indicators
- Composer: slash, @files, context chips, drafts
- Command palette, themes, settings, logs
- Welcome / missing CLI setup
- Tests with mock CLI
- Windows CI packaging

## Tests

Automated suite in `tests/`. Real Command Code E2E requires the user’s installed CLI and account.

## Remaining risks

- Undocumented AgentEvent variants — parser is forward-compatible.
- Headless permission UX differs from TTY prompts.
- Electron installer size must stay compressed under 100 MB.
