/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_PARLANT_SERVER?: string;
  readonly VITE_PARLANT_AGENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
