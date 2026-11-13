import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  esbuild: {
    jsx: "automatic"
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  },
  test: {
    include: ["src/**/*.spec.{ts,tsx}"],
    exclude: ["node_modules/**", ".next/**", ".features-gen/**", "e2e/**"],
    environment: "node"
  }
});
