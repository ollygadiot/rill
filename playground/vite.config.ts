import { defineConfig } from "vite";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "rill": path.resolve(__dirname, "../src/index.ts"),
    },
  },
  server: {
    open: true,
  },
});
