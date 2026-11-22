import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// Each build's id, baked into the app as __APP_VERSION__ and written to /version.json.
// An open tab compares the two to notice a newer deploy (src/components/AppUpdateWatcher.tsx).
const BUILD_ID = Date.now().toString(36);

const versionFile = (): Plugin => ({
  name: "version-file",
  apply: "build",
  generateBundle() {
    this.emitFile({ type: "asset", fileName: "version.json", source: JSON.stringify({ version: BUILD_ID }) });
  },
});

// https://vite.dev/config/
export default defineConfig(() => ({
  plugins: [
    react(),
    tailwindcss(),
    versionFile(),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(BUILD_ID),
  },
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
