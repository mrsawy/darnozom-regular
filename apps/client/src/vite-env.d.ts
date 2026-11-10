/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_PROXY_TARGET?: string;
  readonly VITE_MEDUSA_BACKEND_URL?: string;
  readonly VITE_MEDUSA_ADMIN_URL?: string;
  readonly VITE_SOCKET_URL?: string;
  readonly VITE_MEDUSA_PUBLISHABLE_KEY?: string;
  readonly VITE_MEDUSA_BOOK_PRODUCT_TYPE_ID?: string;
  readonly VITE_GTM_ID?: string;
  readonly VITE_GA_MEASUREMENT_ID?: string;
  readonly VITE_GA_DASHBOARD_URL?: string;
  readonly VITE_UMAMI_SRC?: string;
  readonly VITE_UMAMI_WEBSITE_ID?: string;
  readonly VITE_UMAMI_SHARE_URL?: string;
  readonly BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
