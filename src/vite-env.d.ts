/// <reference types="vite/client" />

// This build's id (vite.config.ts); /version.json holds the id of the live build
declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_MAINTENANCE_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
