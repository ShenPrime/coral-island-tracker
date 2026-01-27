import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import fs from "fs";

// Read CHANGELOG.md at build time for "What's new" feature
const changelogPath = path.resolve(__dirname, "../../CHANGELOG.md");
const changelogContent = fs.existsSync(changelogPath)
  ? fs.readFileSync(changelogPath, "utf-8")
  : "";

export default defineConfig({
  plugins: [react()],
  define: {
    // Inject build ID at build time - used to invalidate cache on redeploys
    "import.meta.env.VITE_BUILD_ID": JSON.stringify(Date.now().toString()),
    // Inject changelog content for "What's new" banner after updates
    "import.meta.env.VITE_CHANGELOG": JSON.stringify(changelogContent),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});
