import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    preloadEntriesOnStart: process.env.LOW_RESOURCE_MODE !== "true",
    turbopackMemoryEviction: process.env.LOW_RESOURCE_MODE === "true" ? "full" : "auto",
  },
  allowedDevOrigins: ['*.local', '192.168.*.*', '10.*.*.*', '172.*.*.*', '*:*'],
};

export default nextConfig;
