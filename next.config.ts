import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const appDir = path.dirname(fileURLToPath(import.meta.url));
const monorepoRoot = path.join(appDir, "..", "..");

// Comma-separated origins, e.g. CH_ALLOWED_DEV_ORIGINS=http://192.168.1.42:3000,http://phone.local:3000
const extraOrigins = (process.env.CH_ALLOWED_DEV_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  turbopack: {
    root: monorepoRoot,
  },
  transpilePackages: [
    "@agent-control-hub/schema",
    "@agent-control-hub/config",

  ],
  // Allow devices on local network to access dev server (explicit list; no CIDR).
  allowedDevOrigins: ["*.local", ...extraOrigins],
};

export default nextConfig;
