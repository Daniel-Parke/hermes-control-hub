import type { NextConfig } from "next";

// Comma-separated origins, e.g. MC_ALLOWED_DEV_ORIGINS=http://192.168.1.42:3000,http://phone.local:3000
const extraOrigins = (process.env.MC_ALLOWED_DEV_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  transpilePackages: [
    "@agent-control-hub/schema",
    "@agent-control-hub/config",

  ],
  // Allow devices on local network to access dev server (explicit list; no CIDR).
  allowedDevOrigins: ["*.local", ...extraOrigins],
};

export default nextConfig;
