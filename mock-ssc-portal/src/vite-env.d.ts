/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of OTR-India's backend API — this app calls it directly, cross-origin. */
  readonly VITE_OTR_API_URL?: string;
  /** Base URL of OTR-India's own citizen-facing frontend (for "Continue with OTR"). */
  readonly VITE_OTR_APP_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
