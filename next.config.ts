import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.20"],
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;

