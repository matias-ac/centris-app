import fs from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";

for (const candidate of [
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "../../.env")
]) {
  if (fs.existsSync(candidate) && typeof process.loadEnvFile === "function") {
    process.loadEnvFile(candidate);
    break;
  }
}

const nextConfig: NextConfig = {
  transpilePackages: ["@centris/shared"]
};

export default nextConfig;
