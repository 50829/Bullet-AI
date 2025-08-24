import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  base: process.env.VITE_BASE_PATH || "/react-test1",
};

export default nextConfig;
