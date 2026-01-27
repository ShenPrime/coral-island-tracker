/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BUILD_ID: string;
  readonly VITE_CHANGELOG: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
