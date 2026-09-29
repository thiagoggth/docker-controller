import { describe, expect, it, vi } from 'vitest';
import { resolveStartedSession } from './containerStreamLifecycle';

describe('resolveStartedSession', () => {
  it('returns the session ID when the owner is still active', async () => {
    const stop = vi.fn(async () => undefined);

    await expect(
      resolveStartedSession(Promise.resolve({ sessionId: 'logs-1' }), () => false, stop),
    ).resolves.toBe('logs-1');
    expect(stop).not.toHaveBeenCalled();
  });

  it('stops a session that resolves after its owner is disposed', async () => {
    const stop = vi.fn(async () => undefined);

    await expect(
      resolveStartedSession(Promise.resolve({ sessionId: 'logs-1' }), () => true, stop),
    ).resolves.toBe(null);
    expect(stop).toHaveBeenCalledOnce();
    expect(stop).toHaveBeenCalledWith('logs-1');
  });
});
