import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

const appProxyTarget =
  process.env.DASHBOARD_API_PROXY_TARGET ?? `http://localhost:${process.env.PORT ?? "8080"}`;

export default defineConfig({
  base: "/",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/v1": {
        target: appProxyTarget,
        changeOrigin: true,
      },
    },
  },
});
