import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'electron-vite';
import { resolve } from 'path';

export default defineConfig({
  main: {
    resolve: {
      external: ['dockerode', 'better-sqlite3'],
      alias: {
        '@core': resolve(__dirname, 'src/main'),
        '@gui': resolve(__dirname, 'src/renderer/src'),
        '@preload': resolve(__dirname, 'src/preload'),
      },
    },
    build: {
      rollupOptions: {
        external: ['better-sqlite3'],
      },
    },
    optimizeDeps: {
      include: ['dockerode'],
    },
  },
  preload: {
    resolve: {
      alias: {
        '@core': resolve(__dirname, 'src/main'),
        '@gui': resolve(__dirname, 'src/renderer/src'),
        '@preload': resolve(__dirname, 'src/preload'),
      },
    },
  },
  renderer: {
    resolve: {
      alias: {
        '@core': resolve(__dirname, 'src/main'),
        '@gui': resolve(__dirname, 'src/renderer/src'),
        '@preload': resolve(__dirname, 'src/preload'),
      },
    },
    plugins: [tailwindcss(), react()],
    server: {
      watch: {
        usePolling: true,
        interval: 500,
        ignored: [
          '**/.git/**',
          '**/.vscode/**',
          '**/node_modules/**',
          '**/dist/**',
          '**/out/**',
          '**/build/**',
          '**/build-electron/**',
          '**/plugins/**',
          '**/coverage/**',
          '**/docs/**',
          '**/enviroments.db',
          '**/tsconfig.electron.tsbuildinfo',
        ],
      },
    },
  },
});
