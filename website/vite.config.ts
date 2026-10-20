import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

// GitHub Pages serves the site at /<repo-name>/; the deploy workflow passes that in as BASE_PATH.
export default defineConfig({
  base: process.env.BASE_PATH ?? "/",
  plugins: [vue()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  css: { preprocessorOptions: { scss: { quietDeps: true, silenceDeprecations: ["import", "global-builtin"] } } },
  build: { assetsInlineLimit: 0, chunkSizeWarningLimit: 900 },
});
