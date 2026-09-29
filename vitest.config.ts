import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@core': resolve(__dirname, 'src/main'),
      '@gui': resolve(__dirname, 'src/renderer/src'),
      '@preload': resolve(__dirname, 'src/preload'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    passWithNoTests: true,
  },
});
