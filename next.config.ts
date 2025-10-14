import type { NextConfig } from "next";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || process.env.VITE_BASE_PATH;

const nextConfig: NextConfig = {
  /* config options here */
  // Only set basePath when provided via env; default to root '/'
  ...(basePath ? { basePath } : {}),
};

export default nextConfig;
