import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // output: 'export', // Enable this for static build: npm run build
  distDir: "dist",
  images: {
    unoptimized: true,
  },
  pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
};

export default nextConfig;
