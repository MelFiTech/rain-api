import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  plugins: [react(), tailwindcss()],
  base: "/admin/",
  build: {
    outDir: "../public/admin",
    emptyOutDir: true,
  },
  server: {
    port: 5174,
    proxy: {
      "/platform": {
        target: "http://localhost:9090",
        changeOrigin: true,
      },
    },
  },
});
