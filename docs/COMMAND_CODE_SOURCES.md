# Command Code Sources

Reviewed on 2026-08-20 against the live public documentation at [commandcode.ai/docs](https://commandcode.ai/docs). npm package `command-code` latest at review time: **1.28.4**.

| URL/path | Purpose | Date reviewed | Relevant findings |
| --- | --- | --- | --- |
| https://commandcode.ai/docs | Product overview, install (`npm i -g command-code`), run (`cd project && cmd`) | 2026-08-20 | CLI is the product surface. Alias `cmd` on POSIX. |
| https://commandcode.ai/docs/quickstart | First-run flow | 2026-08-20 | Native Windows alias is `cmdc`. Verify with `--version`, then `login`. |
| https://commandcode.ai/docs/headless | Official programmatic integration | 2026-08-20 | `-p/--print` one-shot. `--output-format json` emits NDJSON `event` frames + a final `result` line. Exit codes 0,1,3–10,130. Headless sessions hidden from interactive picker. No slash commands as argv. Settings via flags (`--model`, `--permission-mode`, `--config`). Default headless **blocks writes/shell** unless `--yolo` / auto-accept. |
| https://commandcode.ai/docs/reference/cli | Flags, subcommands | 2026-08-20 | `--resume`, `--continue`, `--session`, `--fork-session`, `--no-session`, `-n/--name`, `--trust`, `--plan`, `--auto-accept`, `--permission-mode`, `--list-models`, `--yolo`, `--add-dir`, `--effort`, `--verbose`, `--skip-onboarding`, `--ide-setup`. Subcommands: `info`, `status`, `whoami`, `update`, `login`, `logout`, `taste`, `mcp`, `skills`, `mods`, `feedback`. `status --json` is official. |
| https://commandcode.ai/docs/sessions | Session storage, resume, fork, rewind | 2026-08-20 | Transcripts at `~/.commandcode/projects/<project-slug>/<id>.jsonl`. Sidecars: `.meta.json`, `.share.json`, `.checkpoints.jsonl`, `.prompts.jsonl`. Tree of entries. Do not rewrite transcripts. `/fork` vs `--fork-session`. Checkpoints in `~/.commandcode/file-history/<session-id>/`. |
| https://commandcode.ai/docs/ide-integration | Official IDE protocol | 2026-08-20 | Supported editors: VS Code, Cursor, Windsurf. Not a public protocol for third-party IDEs. Context via extension. `/ide`, `--ide-setup`. This IDE must not pretend to be those editors. File mentions (`@path`) are the supported user-facing context mechanism. |
| https://commandcode.ai/docs/desktop | Official desktop app audit | 2026-08-20 | Alpha. Bundles its own agent runtime (CLI not required). Chat + workbench (Files, Changes, Terminal, Plan, Browser). Not a reusable library. |
| https://commandcode.ai/docs/windows | Windows behavior | 2026-08-20 | WSL recommended (`cmd`). Native Windows uses `cmdc` / `command-code`. Fully supported. |
| https://commandcode.ai/docs/permissions | Permission engine | 2026-08-20 | Modes: `default`, `auto-accept`, `plan`, `dont-ask`, `bypass` (`--yolo` launch only). Never expose bypass via slash. Rules in `.commandcode/settings.json`. |
| https://commandcode.ai/docs/plan-mode | Plan mode | 2026-08-20 | Read-only. Plans at `~/.commandcode/plans/<name>.md`. Review verbs are interactive-only. |
| https://commandcode.ai/docs/interactive-mode | TUI, keys, @ / ! / | 2026-08-20 | `@` file mentions, `!` bash mode, `/` slash menu. `shift+tab` cycles modes. `esc` cancels. Model pick is session-scoped; `/model` also updates default for *new* sessions. |
| https://commandcode.ai/docs/reference/slash-commands | 60+ commands | 2026-08-20 | Full built-in map. Custom commands from `.commandcode/commands/` and `~/.commandcode/commands/`. Headless cannot type slash; use flags or send the slash string as the prompt (agent-invokable commands). |
| https://commandcode.ai/docs/settings | Files under `~/.commandcode` | 2026-08-20 | `config.json` preferences. `auth.json` credentials — **never edit**. `settings.json` hooks/permissions/MCP. Project `.commandcode/settings.json`. |
| https://commandcode.ai/docs/reference/tools | Tool wire names | 2026-08-20 | `read_file`, `edit_file`, `write_file`, shell, search, MCP, sub-agents, `get_diagnostics` (IDE-connected only). Event example: `tool_running` with `toolCallId`, `toolName`, `description`. |
| https://commandcode.ai/docs/goal | Autonomous goals | 2026-08-20 | `/goal` is interactive. Headless equivalent is `--max-turns` plus a prompt. States: active/achieved/paused/idle. |
| https://commandcode.ai/docs/memory | Memory | 2026-08-20 | `AGENTS.md` + `/memory`. `/init` writes project memory. |
| https://registry.npmjs.org/command-code/latest | Package identity | 2026-08-20 | Bins: `cmd`, `cmdc`, `commandcode`, `command-code` → `dist/index.mjs`. Version 1.28.4. |

Official contract vs observed:

- **Official contract:** CLI flags, headless NDJSON, exit codes, `status --json`, session file locations, permission mode names, slash command names, Windows `cmdc` alias.
- **Observed / undocumented:** exact project-slug algorithm, exact JSONL entry schemas, complete `AgentEvent.type` enumeration beyond `tool_running`, exact `--list-models` text layout.
- **Reverse-engineered:** none used as a hard dependency. Parsers are defensive and ignore unknown fields/events.
