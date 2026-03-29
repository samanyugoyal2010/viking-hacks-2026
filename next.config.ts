import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  async rewrites() {
    return [
      { source: "/project-explainer-image", destination: "/image" },
      { source: "/video-generation", destination: "/video" },
    ];
  },
};

export default nextConfig;
