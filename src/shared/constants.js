'use strict';

const PERMISSION_MODES = ['default', 'auto-accept', 'plan', 'dont-ask'];

const EXIT_CODES = {
  0: { id: 'ok', message: 'Completed' },
  1: { id: 'error', message: 'Command Code reported an error' },
  3: { id: 'auth', message: 'Sign in required. Open Setup to log in with Command Code.' },
  4: { id: 'permission', message: 'Command Code denied a tool call (permission rules).' },
  5: { id: 'rate', message: 'Rate limited. Wait and retry.' },
  6: { id: 'network', message: 'Network failure talking to Command Code.' },
  7: { id: 'server', message: 'Command Code API server error.' },
  8: { id: 'max_turns', message: 'Turn limit reached before a final answer.' },
  9: { id: 'no_response', message: 'The model produced no response.' },
  10: { id: 'credits', message: 'Insufficient Command Code credits.' },
  130: { id: 'cancelled', message: 'Stopped.' }
};

const DEFAULT_IGNORES = new Set([
  'node_modules', '.git', 'dist', 'out', 'build', 'coverage',
  '.next', '.nuxt', '.turbo', '.cache', '__pycache__', '.venv', 'venv',
  'target', '.idea', '.vscode'
]);

const BUILTIN_SLASH = [
  { name: 'clear', alias: ['new'], group: 'Sessions', desc: 'Start a new session (IDE creates a real new Command Code session)' },
  { name: 'resume', alias: ['sessions'], group: 'Sessions', desc: 'Resume a past conversation' },
  { name: 'rename', alias: ['name'], group: 'Sessions', desc: 'Rename the current session' },
  { name: 'fork', alias: [], group: 'Sessions', desc: 'Fork into a new session' },
  { name: 'clone', alias: [], group: 'Sessions', desc: 'Clone the active branch into a new session' },
  { name: 'tree', alias: [], group: 'Sessions', desc: 'Browse the session tree' },
  { name: 'rewind', alias: [], group: 'Sessions', desc: 'Restore to a previous checkpoint' },
  { name: 'session-file', alias: [], group: 'Sessions', desc: 'Show session id and transcript path' },
  { name: 'export', alias: [], group: 'Sessions', desc: 'Export the session' },
  { name: 'share', alias: [], group: 'Sessions', desc: 'Share the conversation' },
  { name: 'unshare', alias: [], group: 'Sessions', desc: 'Stop sharing' },
  { name: 'compact', alias: [], group: 'Context', desc: 'Compact conversation history' },
  { name: 'compact-mode', alias: [], group: 'Context', desc: 'Select compact mode' },
  { name: 'context', alias: [], group: 'Context', desc: 'Show context window usage' },
  { name: 'memory', alias: [], group: 'Context', desc: 'Manage memory' },
  { name: 'init', alias: [], group: 'Context', desc: 'Initialize AGENTS.md' },
  { name: 'mode', alias: [], group: 'Modes', desc: 'Show or switch permission mode' },
  { name: 'mode:default', alias: [], group: 'Modes', desc: 'Default permission mode' },
  { name: 'mode:auto-accept', alias: [], group: 'Modes', desc: 'Auto-accept edits' },
  { name: 'mode:plan', alias: [], group: 'Modes', desc: 'Plan mode (read-only)' },
  { name: 'plan', alias: [], group: 'Modes', desc: 'Enter plan mode' },
  { name: 'plans', alias: [], group: 'Modes', desc: 'Browse saved plans' },
  { name: 'plan-review', alias: [], group: 'Modes', desc: 'Open latest plan' },
  { name: 'goal', alias: [], group: 'Modes', desc: 'Set or inspect an autonomous goal' },
  { name: 'todos', alias: [], group: 'Modes', desc: 'Manage session todos' },
  { name: 'review', alias: [], group: 'Modes', desc: 'Review a pull request' },
  { name: 'pr-comments', alias: [], group: 'Modes', desc: 'Fetch PR comments' },
  { name: 'model', alias: [], group: 'Models', desc: 'Switch model' },
  { name: 'effort', alias: [], group: 'Models', desc: 'Set reasoning effort' },
  { name: 'provider', alias: [], group: 'Models', desc: 'Select provider' },
  { name: 'login', alias: [], group: 'Models', desc: 'Log in' },
  { name: 'logout', alias: [], group: 'Models', desc: 'Log out' },
  { name: 'skills', alias: [], group: 'Extensibility', desc: 'Browse skills' },
  { name: 'agents', alias: [], group: 'Extensibility', desc: 'Manage agents' },
  { name: 'mcp', alias: [], group: 'Extensibility', desc: 'Manage MCP servers' },
  { name: 'design', alias: [], group: 'Extensibility', desc: 'Design partner' },
  { name: 'import', alias: [], group: 'Extensibility', desc: 'Import from another agent' },
  { name: 'taste', alias: [], group: 'Extensibility', desc: 'Taste learning' },
  { name: 'learn-taste', alias: [], group: 'Extensibility', desc: 'Learn taste from other agents' },
  { name: 'add-dir', alias: [], group: 'Workspace', desc: 'Add directory to workspace context' },
  { name: 'worktree', alias: [], group: 'Workspace', desc: 'Git worktrees' },
  { name: 'usage', alias: [], group: 'Account', desc: 'Credits and usage' },
  { name: 'upgrade', alias: [], group: 'Account', desc: 'Upgrade plan' },
  { name: 'help', alias: [], group: 'Utilities', desc: 'Help' },
  { name: 'hotkeys', alias: [], group: 'Utilities', desc: 'Keyboard shortcuts' },
  { name: 'config', alias: [], group: 'Utilities', desc: 'Settings' },
  { name: 'theme', alias: [], group: 'Utilities', desc: 'CLI theme (terminal)' },
  { name: 'status', alias: [], group: 'Utilities', desc: 'Environment status' },
  { name: 'changelog', alias: [], group: 'Utilities', desc: 'Command Code changelog' },
  { name: 'update', alias: [], group: 'Utilities', desc: 'Update Command Code' },
  { name: 'feedback', alias: ['issue'], group: 'Utilities', desc: 'Send feedback' },
  { name: 'trace', alias: [], group: 'Utilities', desc: 'Copy trace id' },
  { name: 'copy', alias: [], group: 'Utilities', desc: 'Copy last response' }
];

const THEMES = ['midnight', 'futuristic', 'retro', 'graphite', 'light'];

module.exports = {
  PERMISSION_MODES,
  EXIT_CODES,
  DEFAULT_IGNORES,
  BUILTIN_SLASH,
  THEMES
};
