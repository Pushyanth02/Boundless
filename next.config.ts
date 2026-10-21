import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Native/Node-heavy parsers and the NLP toolkit must not be bundled.
  serverExternalPackages: ["natural", "unpdf", "mammoth"],
};

export default nextConfig;
