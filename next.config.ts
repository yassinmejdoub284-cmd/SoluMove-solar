import type { NextConfig } from "next";
import path from "node:path";

const vercelBuild = process.env.SOLAR_VERCEL_BUILD === "1" || process.env.VERCEL === "1";
const nextConfig: NextConfig = {
  env: { SOLAR_VERCEL_BUILD: vercelBuild ? "1" : "0" },
  webpack(config, { webpack }) {
    if (vercelBuild) {
      // Cloudflare's built-in module does not exist in Vercel's Node runtime.
      // Keep Worker bindings intact and use Turso/Blob in the Node runtime.
      config.plugins.push(new webpack.NormalModuleReplacementPlugin(
        /^cloudflare:workers$/,
        path.resolve("build/vercel-bindings.ts"),
      ));
    }
    return config;
  },
};

export default nextConfig;
