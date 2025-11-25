import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { Plugin } from 'vite';

const removeConsolePlugin = (): Plugin => ({
  name: 'remove-console',
  transform(code, id) {
    if (id.endsWith('.ts') || id.endsWith('.tsx')) {
      return {
        code: code.replace(/console\.(log|debug|info|warn)\s*\([^)]*\)\s*;?/g, ''),
        map: null
      };
    }
  }
});

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(), 
    tailwindcss(),
    // ...(mode === 'production' ? [removeConsolePlugin()] : [])
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === 'UNUSED_EXTERNAL_IMPORT') return;
        warn(warning);
      },
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom', 'react-router-dom'],
          'charts': ['recharts'],
          'pdf': ['pdfmake', 'jspdf', 'jspdf-autotable'],
          'excel': ['xlsx'],
          'ui': ['@radix-ui/react-select', '@radix-ui/react-popover', '@radix-ui/react-dialog'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  server: {
    proxy: {
      '/api': {
        target: 'https://api.neodairysales.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
}));
