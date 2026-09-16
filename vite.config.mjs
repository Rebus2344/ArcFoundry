import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  root: 'web',
  plugins: [react()],
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        manualChunks: {
          wallet: ['ethers'],
          react: ['react', 'react-dom/client']
        }
      }
    }
  },
  server: {
    fs: {
      allow: ['..']
    }
  }
});
