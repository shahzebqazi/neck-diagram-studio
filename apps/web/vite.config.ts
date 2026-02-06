import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

const ciPagesUrl = process.env.CI_PAGES_URL;
const base = ciPagesUrl ? new URL(ciPagesUrl).pathname.replace(/\/?$/, "/") : "/";

export default defineConfig({
  base,
  plugins: [react()],
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "../../packages/shared/src")
    }
  },
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:3001"
    },
    fs: {
      allow: [path.resolve(__dirname, "../../"), path.resolve(__dirname, "../../..")]
    }
  }
});
