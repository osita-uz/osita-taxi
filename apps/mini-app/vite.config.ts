import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 5173,
    host: "0.0.0.0",
    allowedHosts: [".jprq.live", ".ngrok-free.app"],
    proxy: {
      "/api": {
        target: "http://192.168.0.211:3000",
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
