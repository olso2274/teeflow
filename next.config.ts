import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: false,
  },
  // Vercel compatibility for Playwright
  serverExternalPackages: ["playwright"],
};

export default nextConfig;
