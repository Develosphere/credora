import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    PYTHON_API_URL: process.env.PYTHON_API_URL,
    JAVA_ENGINE_URL: process.env.JAVA_ENGINE_URL,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
