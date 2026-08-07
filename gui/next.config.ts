import type { NextConfig } from "next";

const apiBaseUrl = process.env.MAI_API_BASE_URL ?? "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  experimental: {
    useTypeScriptCli: false,
  },
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
