import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig(({ mode }) => {
  // Vite does not put .env into process.env for this file unless we loadEnv.
  // Without this, the proxy always fell back to :8080 and Google sign-in failed
  // with ECONNREFUSED whenever the API ran on another port (e.g. 8085).
  const env = loadEnv(mode, __dirname, "");
  const apiTarget = env.VITE_API_PROXY_TARGET || "http://127.0.0.1:8085";

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
    server: {
      port: 5173,
      host: true,
      proxy: {
        "/api": {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
    preview: {
      port: 4173,
      host: true,
      proxy: {
        "/api": {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
