'use strict';

const args = process.argv.slice(2);

if (args.includes('--version')) {
  process.stdout.write('1.28.4\n');
  process.exit(0);
}
if (args.includes('--help')) {
  process.stdout.write('Usage: mock-cmdc -p --output-format json --resume --fork-session --list-models --permission-mode --auto-accept --plan --yolo --trust --skip-onboarding --model --add-dir --verbose --continue\n');
  process.exit(0);
}
if (args.includes('--list-models')) {
  process.stdout.write('google/gemini-3.7-flash\nclaude-sonnet-4-6\n');
  process.exit(0);
}
if (args.includes('status')) {
  process.stdout.write(JSON.stringify({ authenticated: true, user: 'mock' }) + '\n');
  process.exit(0);
}

if (args.includes('-p')) {
  const ev = { type: 'event', event: { type: 'tool_running', toolCallId: 't1', toolName: 'read_file', description: 'README.md' } };
  process.stdout.write(JSON.stringify(ev) + '\n');
  const result = {
    type: 'result',
    subtype: 'success',
    sessionId: '11111111-2222-3333-4444-555555555555',
    stopReason: 'end_turn',
    usage: { inputTokens: 10, outputTokens: 20 },
    durationMs: 42,
    finalText: 'Project has a README.'
  };
  process.stdout.write(JSON.stringify(result) + '\n');
  process.exit(0);
}

process.stderr.write('unknown\n');
process.exit(1);
