import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile()],
  // The build emits a single index.html, so there is nothing to empty. Vite's
  // default emptyOutDir calls a recursive delete on dist/, which this sandbox
  // refuses (SAFE_DELETE_BULK_CONFIRM_REQUIRED) and the build dies before it
  // writes anything. Overwriting in place is equivalent here.
  build: { emptyOutDir: false },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
