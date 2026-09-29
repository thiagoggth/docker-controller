import { describe, expect, it } from 'vitest';
import { appendLogChunk } from './logBuffer';

describe('appendLogChunk', () => {
  it('preserves the first complete chunk', () => {
    expect(appendLogChunk('', 'one\n')).toBe('one\n');
  });

  it('concatenates chunks that split a line without losing text', () => {
    expect(appendLogChunk('first par', 't\nsecond')).toBe('first part\nsecond');
  });

  it('retains exactly the newest 10,000 lines', () => {
    const lines = Array.from({ length: 10_001 }, (_, index) => `line-${index + 1}`).join('\n');

    const result = appendLogChunk('', `${lines}\n`);

    expect(result.split('\n').filter(Boolean)).toHaveLength(10_000);
    expect(result.startsWith('line-2\n')).toBe(true);
    expect(result.endsWith('line-10001\n')).toBe(true);
  });
});
