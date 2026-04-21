import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'electron-vite';
import { resolve } from 'path';

export default defineConfig({
  main: {
    resolve: {
      alias: {
        '@core': resolve(__dirname, 'src/main'),
        '@gui': resolve(__dirname, 'src/renderer/src'),
        '@preload': resolve(__dirname, 'src/preload'),
      },
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
  },
});
