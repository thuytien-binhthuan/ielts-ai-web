import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
  turbopack: {
    root: process.cwd(),
  },
  async rewrites() {
    return [
      {
        source: "/proxy/:path*",
        destination: "/api/proxy/:path*",
      },
    ];
  },
};

export default nextConfig;
