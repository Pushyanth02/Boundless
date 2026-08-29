import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // pdf-parse v1 bundles its own pdf.js and uses a dynamic runtime require
  // that bundlers cannot statically analyze — keep it external on the server.
  serverExternalPackages: ["pdf-parse"],
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
