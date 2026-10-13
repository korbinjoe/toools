import type { NextConfig } from "next";
import path from "path";
import { HTML_METADATA_BOTS } from "./src/lib/crawlers";

const nextConfig: NextConfig = {
  htmlLimitedBots: HTML_METADATA_BOTS,
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
