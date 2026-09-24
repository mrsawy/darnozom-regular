/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_PROXY_TARGET?: string;
  readonly VITE_MEDUSA_BACKEND_URL?: string;
  readonly VITE_MEDUSA_ADMIN_URL?: string;
  readonly VITE_SOCKET_URL?: string;
  readonly VITE_MEDUSA_PUBLISHABLE_KEY?: string;
  readonly VITE_MEDUSA_BOOK_PRODUCT_TYPE_ID?: string;
  readonly BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
