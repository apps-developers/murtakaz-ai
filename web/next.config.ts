import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverActions: {
      allowedOrigins: [
        "localhost:3000",
        "localhost:3001",
        "localhost:3002",
        "localhost:3003",
        "127.0.0.1:54273",
      ],
    },
  },
};

export default nextConfig;
