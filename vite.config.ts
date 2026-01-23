import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
  },
  optimizeDeps: {
    exclude: ['@ricky0123/vad-web']
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      external: ['onnxruntime-web']
    }
  }
});
