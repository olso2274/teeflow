import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: false,
  },
  // Vercel compatibility for Playwright
  serverExternalPackages: ["playwright"],
  async headers() {
    return [
      {
        // Allow the embed page to be iframed from any origin
        source: "/course/:id/embed",
        headers: [
          { key: "X-Frame-Options", value: "ALLOWALL" },
          { key: "Content-Security-Policy", value: "frame-ancestors *" },
        ],
      },
    ];
  },
};

export default nextConfig;
