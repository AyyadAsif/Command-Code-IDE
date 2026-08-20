# Command Code Capability Map

Authoritative integration specification for Command Code IDE.  
Classification keys: **Fully supported** · **Supported through CLI** · **Supported through interactive CLI** · **Supported through filesystem/session data** · **Supported through IDE integration** · **Supported through hooks** · **Supported through official desktop architecture** · **Possible but undocumented** · **Unsupported** · **Unknown**.

Contract kinds: **Official** · **Observed** · **Reverse-engineered** (none used).

| Capability | Command Code Source | Exact Mechanism | Input | Output | UI Needed | Implemented | Tested | Confidence | Class | Contract |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Start CLI | CLI | `cmdc` / `command-code` / `cmd` | cwd, env, flags | process | Engine status | yes | yes | high | CLI | Official |
| Detect workspace | CLI | process `cwd` = opened folder | path | session header cwd | Explorer | yes | yes | high | CLI | Official |
| Authentication | CLI | `login`, `logout`, `status --json`, `whoami` | browser/device flow | status JSON | Setup / settings | yes | yes | high | CLI | Official |
| Create session | Headless | `-p query` (no `--resume`) | prompt | `result.sessionId` + jsonl | New Chat | yes | yes | high | CLI | Official |
| Resume session | CLI | `-p --resume <id>` | session id | continued transcript | Session sidebar | yes | yes | high | CLI | Official |
| Continue latest | CLI | `-p --continue` | cwd | session | Continue | yes | yes | high | CLI | Official |
| Fork session | CLI | `--resume <id> --fork-session` | id | new session id | Fork Chat | yes | yes | high | CLI | Official |
| Name session | CLI | `-n/--name` | name | meta title | New Chat name | yes | yes | high | CLI | Official |
| Discover history | Filesystem | read `~/.commandcode/projects/**/*.jsonl` + `.meta.json` | home | list | Sidebar | yes | yes | high | filesystem | Official path, undocumented slug |
| Load transcript | Filesystem | parse JSONL (read-only) | file | messages | Chat | yes | yes | medium | filesystem | Official location, undocumented entry schema |
| List models | CLI | `--list-models` | none | text list | Model selector | yes | yes | high | CLI | Official |
| Set model | CLI | `-m/--model` per run | model id | session uses model | Model selector | yes | yes | high | CLI | Official |
| Active model | Filesystem + flag | meta.json `model` or last `-m` | — | id | Indicator | yes | yes | medium | mixed | Official meta + flag |
| Permission default | CLI | `--permission-mode default` | — | denies writes in headless | Mode control | yes | yes | high | CLI | Official |
| Plan mode | CLI | `--plan` / `--permission-mode plan` | — | read-only | Plan badge | yes | yes | high | CLI | Official |
| Auto-accept | CLI | `--auto-accept` | — | edits without prompt | Mode control | yes | yes | high | CLI | Official |
| Don't-ask | CLI | `--permission-mode dont-ask` | — | fail-closed | Settings | yes | yes | high | CLI | Official |
| Bypass / yolo | CLI | `--yolo` | explicit user opt-in | skip prompts | Security setting | yes | yes | high | CLI | Official |
| Trust project | CLI | `--trust` | — | skip trust UI | Engine start | yes | yes | high | CLI | Official |
| Tool calls | Headless JSON | `event.event.type` e.g. `tool_running` | NDJSON | tool cards | Chat | yes | yes | medium | CLI | Official example; full enum undocumented |
| Tool results | Headless JSON | subsequent events / result | NDJSON | cards | Chat | yes | yes | medium | CLI | Forward-compatible |
| Text responses | Headless JSON | `result.finalText` | NDJSON | markdown | Chat | yes | yes | high | CLI | Official |
| Token streaming | Headless JSON | not documented as token deltas | — | may arrive only at end | Chat | yes | yes | medium | CLI | Official: events + final result |
| Progress | CLI | `--verbose` stderr + events | stderr | status | Status / log | yes | yes | medium | CLI | Official verbose session id |
| Errors | CLI | result subtype error, exit codes | process | friendly error | Error UI | yes | yes | high | CLI | Official |
| Cancellation | Process | terminate child → 130 | — | stopped | Stop button | yes | yes | high | CLI | Official |
| Agent completion | Headless JSON | final `type: result` line | NDJSON | idle | Status | yes | yes | high | CLI | Official |
| Exit codes | Headless | 0,1,3–10,130 | process | mapped messages | Error UI | yes | yes | high | CLI | Official |
| File edits | Command Code tools | real filesystem writes | agent | watcher refresh | Explorer/editor/diff | yes | yes | high | CLI | Official |
| Diffs | Filesystem + git | `git diff` / snapshot compare | paths | diff view | Diff panel | yes | yes | high | filesystem | Official git |
| Shell commands | Command Code tools | agent `Shell` | — | tool cards | Chat | yes | n/a live | high | CLI | Official |
| Background tasks | Command Code | agent-internal | — | if events emitted | Chat | partial | no | low | CLI | Official feature, events undocumented |
| Subagents | Tools | agent tool | — | if events emitted | Chat | partial | no | low | CLI | Official |
| Skills | CLI | `skills list/add/remove` | — | palette | Palette | yes | yes | high | CLI | Official |
| Agents | Slash | `/agents` as prompt | — | forwarded | Palette | yes | yes | medium | interactive | Official command |
| MCP | CLI | `mcp list` | — | palette | Palette | yes | yes | high | CLI | Official |
| Hooks | Settings files | read `.commandcode/settings.json` | — | settings info | Settings | yes | yes | medium | filesystem | Official |
| Memory | Slash / files | `/memory`, `/init`, `AGENTS.md` | prompt | forwarded | Palette | yes | yes | high | mixed | Official |
| Taste | CLI | `taste` / `learn-taste` | — | palette | Palette | yes | yes | high | CLI | Official |
| Checkpoints / rewind | Filesystem + interactive | read sidecars; rewind UI is interactive | — | list + “run in CLI” | Chat toolbar | partial | yes | medium | mixed | Official interactive; we do not rewrite |
| Git state | git CLI | `git status --porcelain=v1` | cwd | indicators | Explorer/status | yes | yes | high | CLI | Official git |
| IDE context (VS Code protocol) | IDE integration | extension | — | — | — | no | — | high | IDE integration | Unsupported for this app |
| Active file context | `@file` mention | composer injects `@relpath` | path | prompt | chips | yes | yes | high | CLI | Official mention syntax |
| Selected-line context | prompt block | visible chip + quoted lines | range | prompt | chips | yes | yes | high | CLI | Official “don’t pretend”; honest injection |
| Editor diagnostics | `get_diagnostics` | IDE-only tool | — | Problems panel from local scan only, labeled as IDE diagnostics not Command Code | Problems | partial | yes | medium | unsupported CC path | We never claim CC produced them |
| Launch from another process | CLI | spawn hidden | env | child | Engine | yes | yes | high | CLI | Official |
| Concurrent sessions | CLI | multiple `-p` processes | ids | parallel | tabs | yes | yes | medium | CLI | Highly likely |
| Environment variables | CLI | inherit; optional `CMD_TOOLS_*` | env | — | Advanced | yes | yes | high | CLI | Official |
| Windows | Docs | `cmdc`, no-window spawn | — | — | — | yes | tests | high | CLI | Official |
| Missing CLI | Adapter | detectInstallation | — | setup UI | Welcome | yes | yes | high | CLI | Official |
| Incompatible version | Adapter | `--help` capability probe | version | warning | Setup | yes | yes | medium | CLI | Highly likely |
| Upgrades | CLI | `update --check-only` / `update` | — | settings | Settings | yes | yes | high | CLI | Official |
| `~/.commandcode` data | Settings | read-only except IDE’s own folder | — | sessions, models | — | yes | yes | high | filesystem | Official |
| Project `.commandcode` | Settings | read settings, commands, AGENTS.md | — | slash discovery | Composer | yes | yes | high | filesystem | Official |
| Safe to read | Settings | jsonl, meta, config, plans, commands | — | UI | — | yes | yes | high | filesystem | Official |
| Never modify | Settings | `auth.json`, transcripts, checkpoints | — | — | — | yes | yes | high | filesystem | Official |
| Machine-readable output | Headless | `--output-format json` | — | NDJSON | parser | yes | yes | high | CLI | Official |
| Programmatic integration | Headless | `-p` | — | — | engine | yes | yes | high | CLI | Official |
| Official desktop reuse | Desktop | none | — | — | — | no | — | high | desktop | Not a library |
| Slash `/init` `/memory` `/compact` `/model` as query | Slash | `-p "/init"` etc. | text | CC handles | Composer | yes | yes | medium | CLI | Highly likely agent-invokable |
| Custom slash commands | Filesystem | `.commandcode/commands/*.md` | files | autocomplete | Composer | yes | yes | high | filesystem | Official |
| File mention autocomplete | Interactive | `@` | tree | insert `@path` | Composer | yes | yes | high | CLI | Official |
| Add dir | CLI | `--add-dir` / `/add-dir` | path | workspace | Palette | yes | yes | high | CLI | Official |
| `/goal` | Slash / `--max-turns` | send `/goal …` as prompt | text | if CC honors | Goal UI | partial | yes | medium | mixed | Interactive loop not in headless |
| Login UI | CLI | spawn visible `login` | — | auth.json by CC | Setup | yes | yes | high | CLI | Official |

## Intentionally not reimplemented

- Command Code’s model router, tools, MCP client, taste learner, permission engine, checkpoint writer, plan-review TUI.
- VS Code extension host / `get_diagnostics` from CC.
- Any second LLM API.
