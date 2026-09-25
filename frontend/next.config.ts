import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  typedRoutes: false,
  agentRules: false,
  devIndicators: false,
  images: { formats: ["image/avif", "image/webp"] },
};

export default nextConfig;
