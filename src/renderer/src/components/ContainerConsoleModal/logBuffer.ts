export function appendLogChunk(current: string, chunk: string, maxLines = 10_000): string {
  const combined = current + chunk;
  const lines = combined.split('\n');
  const lineCount = lines.length - (combined.endsWith('\n') ? 1 : 0);

  return lines.slice(Math.max(0, lineCount - maxLines)).join('\n');
}
