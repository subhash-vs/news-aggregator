import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // rss-parser requires Node builtins (http/https) via xml2js (`timers`).
  // Leaving both external stops webpack from bundling them into a runtime
  // where those builtins don't resolve.
  serverExternalPackages: ["rss-parser", "xml2js"],
};

export default nextConfig;
