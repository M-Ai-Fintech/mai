import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";

const apiBaseUrl = process.env.MAI_API_BASE_URL ?? "http://127.0.0.1:8000";
const repositoryRoot = fileURLToPath(new URL("..", import.meta.url));

const nextConfig: NextConfig = {
  experimental: {
    externalDir: true,
    useTypeScriptCli: false,
  },
  turbopack: { root: repositoryRoot },
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/api/:path*",
          destination: `${apiBaseUrl}/api/:path*`,
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
