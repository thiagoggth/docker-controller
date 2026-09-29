import { describe, expect, it } from 'vitest';
import { createContainerLogsEventGate } from './containerLogsEventGate';

describe('createContainerLogsEventGate', () => {
  it('replays matching events received before the stream session resolves in arrival order', () => {
    const received: string[] = [];
    const gate = createContainerLogsEventGate((event) => {
      if (event.type === 'data') {
        received.push(`data:${event.payload.data}`);
      } else if (event.type === 'ended') {
        received.push('ended');
      } else {
        received.push(`error:${event.payload.message}`);
      }
    });

    gate.receive({ type: 'data', payload: { sessionId: 'other', data: 'ignored' } });
    gate.receive({ type: 'data', payload: { sessionId: 'logs-1', data: 'first' } });
    gate.receive({ type: 'ended', payload: { sessionId: 'logs-1' } });
    gate.receive({ type: 'error', payload: { sessionId: 'logs-1', message: 'late error' } });

    gate.setSessionId('logs-1');

    expect(received).toEqual(['data:first', 'ended', 'error:late error']);
  });

  it('discards buffered events after cleanup', () => {
    const received: string[] = [];
    const gate = createContainerLogsEventGate((event) => received.push(event.type));

    gate.receive({ type: 'data', payload: { sessionId: 'logs-1', data: 'first' } });
    gate.dispose();
    gate.setSessionId('logs-1');

    expect(received).toEqual([]);
  });
});
