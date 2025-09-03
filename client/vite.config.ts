import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@shared": path.resolve(__dirname, "..", "shared"),
      "@assets": path.resolve(__dirname, "..", "attached_assets"),
    },
  },
  server: {
    port: 3000,
    host: true,
    fs: {
      strict: false,
      allow: [".."],
    },
  },
  css: {
    postcss: {
      configFilePath: path.resolve(__dirname, "..", "postcss.config.js"),
    },
  },
});
