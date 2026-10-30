import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootEnvPath = path.resolve(__dirname, "../../.env");
if (fs.existsSync(rootEnvPath) && typeof process.loadEnvFile === "function") {
  process.loadEnvFile(rootEnvPath);
}

const nextConfig: NextConfig = {
  transpilePackages: ["@centris/shared"]
};

export default nextConfig;
