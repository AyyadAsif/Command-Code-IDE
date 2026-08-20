# Command Coverage

Goal: no important Command Code capability is lost only because the user is in the IDE. Interactive-only surfaces are reachable via palette (“Run in Command Code CLI”) rather than faked.

Legend: GUI = dedicated control. Palette = command palette. Composer = typed in chat (sent as the real `-p` query or mapped to a flag). Auto = engine does it.

| Command / feature | Invocation | GUI | Palette | Composer | Auto | Status | Test | Limitations |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| New session | `-p` without resume | New Chat | yes | — | — | done | adapter | — |
| Resume | `--resume id` | sidebar click | yes | `/resume` forwarded | restore last | done | adapter | No TUI picker |
| Continue | `--continue` | — | yes | — | — | done | adapter | Headless continue catalog |
| Fork | `--fork-session` | Fork Chat | yes | `/fork` forwarded | — | done | adapter | Fork applies on next prompt |
| Name | `-n` | rename overlay (local + next `-n`) | yes | `/rename` forwarded | — | done | adapter | Local alias never writes jsonl |
| Clear / new | new `-p` | New Chat | yes | `/clear` → new session | — | done | adapter | Does not send `/clear` into old session |
| Models list | `--list-models` | dropdown | yes | `/model` | startup | done | adapter | Parse text layout defensively |
| Model set | `-m` | dropdown | yes | `/model id` | — | done | adapter | Per-session override; does not write config unless user runs `/model` |
| Effort | `--effort` | settings | yes | `/effort` | — | done | adapter | Model-dependent |
| Plan mode | `--plan` | mode cycle | yes | `/plan` `/mode:plan` | — | done | adapter | Plan review TUI not replicated; plans folder shown |
| Auto-accept | `--auto-accept` | mode cycle | yes | `/mode:auto-accept` | — | done | adapter | — |
| Default mode | `--permission-mode default` | mode cycle | yes | `/mode:default` | — | done | adapter | Headless blocks writes |
| Don't-ask | `--permission-mode dont-ask` | settings | yes | — | — | done | adapter | — |
| Bypass | `--yolo` | security toggle | yes | blocked | never auto | done | adapter | Confirmation required |
| Trust | `--trust` | — | — | — | on workspace start | done | adapter | — |
| Skip onboarding | `--skip-onboarding` | — | — | — | always for IDE runs | done | adapter | — |
| Verbose | `--verbose` | Output log | yes | — | optional | done | adapter | stderr only |
| Login | `login` | Setup | yes | `/login` | — | done | adapter | Visible console |
| Logout | `logout` | Settings | yes | `/logout` | — | done | adapter | — |
| Status / whoami | `status --json` | Settings | yes | `/status` | startup | done | adapter | — |
| Version | `--version` | Settings | yes | — | startup | done | adapter | — |
| Update | `update` | Settings | yes | `/update` | check-only optional | done | adapter | — |
| Help | `--help` | — | yes | `/help` | capability probe | done | adapter | — |
| Skills | `skills *` | — | yes | `/skills` | — | done | adapter | — |
| MCP | `mcp list` | — | yes | `/mcp` | — | done | adapter | — |
| Taste | `taste` | — | yes | `/taste` | — | done | adapter | — |
| Learn taste | `learn-taste` | — | yes | `/learn-taste` | — | done | adapter | — |
| Mods | `mods list` | — | yes | — | — | done | adapter | — |
| Memory | `/memory` as prompt | — | yes | yes | — | done | composer | Interactive UI not replicated |
| Init | `/init` as prompt | — | yes | yes | — | done | composer | — |
| Compact | `/compact` as prompt | — | yes | yes | — | done | composer | — |
| Context | `/context` as prompt | — | yes | yes | — | done | composer | — |
| Goal | `/goal` as prompt | Goal dialog | yes | yes | — | partial | composer | Autonomous loop is CC’s; headless is one turn unless user continues |
| Review / PR | `/review` `/pr-comments` | — | yes | yes | — | done | composer | — |
| Add dir | `--add-dir` | Open extra folder | yes | `/add-dir` | — | done | adapter | — |
| Worktree | `-w` / `/worktree` | — | yes | yes | — | done | composer | No first-class worktree GUI |
| Export / share | `/export` `/share` | — | yes | yes | — | done | composer | — |
| Rewind | interactive | list checkpoints | yes | `/rewind` forwarded | — | partial | sessions | Does not rewrite history; offers “Resume in CLI” |
| Session file | filesystem | — | yes | `/session-file` | — | done | sessions | — |
| Custom commands | commands/*.md | autocomplete | yes | yes | discover | done | composer | — |
| `@` files | mention | chips / drag-drop | — | yes | — | done | composer | — |
| `!` bash | prompt prefix | — | — | yes | — | done | composer | Sent as prompt; CC bash mode is interactive — we send `Run this shell command and show output: …` only if user uses Terminal panel. Composer `!cmd` is forwarded verbatim. |
| IDE connect `/ide` | extension | — | no (would lie) | — | — | not exposed | — | We are not a supported editor |
| Terminal-setup | VS Code | — | no | — | — | not exposed | — | N/A |
| Desktop-only browser preview | desktop app | — | no | — | — | not exposed | — | Out of scope |

Palette also includes IDE actions: Open Folder, Quick Open, Save, Toggle panels, Theme, Settings, Restart Engine, Open Logs.
