import type { NextConfig } from "next";
import path from "node:path";
import { realpathSync } from "node:fs";

const vercelBuild = process.env.SOLAR_VERCEL_BUILD === "1" || process.env.VERCEL === "1";
// pnpm exposes this package through a directory symlink. Include its physical
// assets so Vercel never packages child files underneath the symlink itself.
const xmlValidatorDirectory = path.relative(
  process.cwd(), realpathSync(path.resolve("node_modules/xmllint-wasm")),
).split(path.sep).join("/");
const nextConfig: NextConfig = {
  serverExternalPackages: ['xmllint-wasm'],
  outputFileTracingIncludes: {
    '/api/enterprise': ['xmllint.wasm', 'xmllint-node.js'].map(name => `./${xmlValidatorDirectory}/${name}`),
  },
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
