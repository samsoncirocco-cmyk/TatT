import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
        http2: false,
        dns: false,
        "node:http": false,
        "node:https": false,
        "node:util": false,
        "node:stream": false,
        "node:zlib": false,
        "node:url": false,
        "node:assert": false,
        "node:querystring": false,
        "node:buffer": false,
        "node:events": false,
        "node:fs": false,
        "node:net": false,
        "node:tls": false,
        "node:path": false,
        "node:process": false,
        "node:os": false,
        "node:crypto": false,
      };

      // Also ignore these modules if imported directly
      config.resolve.alias = {
        ...config.resolve.alias,
        'google-auth-library': false,
        '@google-cloud/aiplatform': false,
        '@google-cloud/vertexai': false,
        '@google-cloud/storage': false,
        '@google-cloud/vision': false,
        'firebase-admin': false,
        'neo4j-driver': false,
      };
    }
    return config;
  },
};

export default nextConfig;
