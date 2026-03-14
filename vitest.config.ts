import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
  test: {
    environment: "node",
    env: {
      GROQ_API_KEY: "test",
      STT_PROVIDER: "groq",
    },
  },
});
