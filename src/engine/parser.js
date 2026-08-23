'use strict';

const { EXIT_CODES } = require('../shared/constants');

function mapExit(code) {
  const n = Number(code);
  return EXIT_CODES[n] || { id: 'error', message: `Command Code exited with code ${code}` };
}

function parseLine(line) {
  const raw = String(line || '').replace(/\r$/, '');
  if (!raw.trim()) return null;
  let obj;
  try {
    obj = JSON.parse(raw);
  } catch {
    return { kind: 'text', text: raw, raw };
  }
  if (!obj || typeof obj !== 'object') {
    return { kind: 'text', text: raw, raw };
  }
  if (obj.type === 'event') {
    const ev = obj.event && typeof obj.event === 'object' ? obj.event : obj;
    return {
      kind: 'event',
      eventType: String(ev.type || 'unknown'),
      toolCallId: ev.toolCallId || ev.tool_call_id || null,
      toolName: ev.toolName || ev.tool_name || ev.name || null,
      description: ev.description || ev.detail || ev.summary || null,
      payload: ev,
      raw: obj
    };
  }
  if (obj.type === 'result') {
    return {
      kind: 'result',
      subtype: obj.subtype || (obj.error ? 'error' : 'success'),
      sessionId: obj.sessionId || obj.session_id || null,
      stopReason: obj.stopReason || obj.stop_reason || null,
      usage: obj.usage || null,
      durationMs: obj.durationMs || obj.duration_ms || null,
      finalText: typeof obj.finalText === 'string' ? obj.finalText : (obj.final_text || ''),
      error: obj.error || null,
      raw: obj
    };
  }
  // Forward-compatible: unknown JSON object
  return {
    kind: 'unknown',
    eventType: obj.type || 'unknown',
    payload: obj,
    raw: obj
  };
}

function normalizeEvent(parsed) {
  if (!parsed) return null;
  if (parsed.kind === 'event') {
    const t = parsed.eventType;
    if (t === 'tool_running' || t === 'tool_start' || t === 'tool_execution_start') {
      return {
        type: 'ToolStarted',
        toolCallId: parsed.toolCallId,
        toolName: parsed.toolName,
        description: parsed.description,
        raw: parsed
      };
    }
    if (t === 'tool_output' || t === 'tool_execution_update') {
      return {
        type: 'ToolOutput',
        toolCallId: parsed.toolCallId,
        toolName: parsed.toolName,
        description: parsed.description,
        payload: parsed.payload,
        raw: parsed
      };
    }
    if (t === 'tool_completed' || t === 'tool_end' || t === 'tool_execution_end') {
      return {
        type: 'ToolCompleted',
        toolCallId: parsed.toolCallId,
        toolName: parsed.toolName,
        description: parsed.description,
        payload: parsed.payload,
        raw: parsed
      };
    }
    if (t === 'text_delta' || t === 'message_delta' || t === 'assistant_delta') {
      const delta = parsed.payload && (parsed.payload.delta || parsed.payload.text || parsed.description);
      return { type: 'MessageChunk', text: delta || '', raw: parsed };
    }
    if (t === 'permission_request' || t === 'permission_requested') {
      return { type: 'PermissionRequested', payload: parsed.payload, raw: parsed };
    }
    if (t === 'model_changed') {
      return { type: 'ModelChanged', payload: parsed.payload, raw: parsed };
    }
    if (t === 'plan_updated' || t === 'plan') {
      return { type: 'PlanUpdated', payload: parsed.payload, raw: parsed };
    }
    return { type: 'UnknownEvent', eventType: t, payload: parsed.payload, raw: parsed };
  }
  if (parsed.kind === 'result') {
    if (parsed.subtype === 'error') {
      const error = typeof parsed.error === 'string'
        ? parsed.error
        : (parsed.error && (parsed.error.message || parsed.error.detail)) || JSON.stringify(parsed.error || 'Command Code failed');
      return { type: 'EngineError', error, sessionId: parsed.sessionId, raw: parsed };
    }
    return {
      type: parsed.subtype === 'max_turns' ? 'TaskFailed' : 'TaskCompleted',
      subtype: parsed.subtype,
      sessionId: parsed.sessionId,
      stopReason: parsed.stopReason,
      usage: parsed.usage,
      durationMs: parsed.durationMs,
      finalText: parsed.finalText,
      raw: parsed
    };
  }
  if (parsed.kind === 'text') {
    return { type: 'LogText', text: parsed.text, raw: parsed };
  }
  return { type: 'UnknownEvent', payload: parsed.payload, raw: parsed };
}

function parseStderrSessionId(text) {
  const m = String(text || '').match(/session[:\s]+([0-9a-fA-F-]{8,})/);
  return m ? m[1] : null;
}

module.exports = { parseLine, normalizeEvent, mapExit, parseStderrSessionId };
