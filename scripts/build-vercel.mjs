import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

// Vercel's Next.js adapter requires .next manifests, not a Vinext Worker bundle.
const cli = fileURLToPath(new URL("../node_modules/next/dist/bin/next", import.meta.url));
const result = spawnSync(process.execPath, [cli, "build", "--webpack"], {
  stdio: "inherit",
  env: { ...process.env, SOLAR_VERCEL_BUILD: "1" },
});
if (result.error) throw result.error;
process.exit(result.status ?? 1);
