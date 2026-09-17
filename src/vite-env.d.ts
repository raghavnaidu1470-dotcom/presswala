/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_APARTMENT_NAME: string;
  readonly VITE_VENDOR_NAME: string;
  readonly VITE_VENDOR_PHONE: string;
  readonly VITE_VENDOR_UPI_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
