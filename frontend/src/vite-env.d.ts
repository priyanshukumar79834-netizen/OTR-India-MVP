/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SSC_PORTAL_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
