import { describe, expect, it, vi } from 'vitest';
import { closeWindowAfterStreamCleanup } from './closeWindowAfterStreamCleanup';

describe('closeWindowAfterStreamCleanup', () => {
  it('destroys the window only after stream cleanup settles', async () => {
    const events: string[] = [];
    let resolveCleanup!: () => void;
    const cleanup = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveCleanup = () => {
            events.push('cleanup settled');
            resolve();
          };
        }),
    );
    const destroy = vi.fn(() => events.push('window destroyed'));

    const closing = closeWindowAfterStreamCleanup(cleanup, destroy);
    expect(destroy).not.toHaveBeenCalled();
    resolveCleanup();
    await closing;
    expect(events).toEqual(['cleanup settled', 'window destroyed']);
  });

  it('still destroys the window if stream cleanup rejects', async () => {
    const destroy = vi.fn();
    await closeWindowAfterStreamCleanup(() => Promise.reject(new Error('cleanup failed')), destroy);
    expect(destroy).toHaveBeenCalledOnce();
  });
});
