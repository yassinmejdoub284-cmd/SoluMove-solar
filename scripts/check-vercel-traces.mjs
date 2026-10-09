import { readdir, readFile, lstat, stat, realpath } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

async function traceFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await traceFiles(filename));
    else if (entry.name.endsWith(".nft.json")) files.push(filename);
  }
  return files;
}

// Vercel must not receive both a directory symlink and files below that alias.
// Keep pnpm's runtime links; trace the actual files in its physical package store.
export async function checkVercelTraces(root = process.cwd()) {
  const traces = await traceFiles(path.join(root, ".next"));
  if (!traces.length) throw new Error("No Next.js output file traces found");
  const enterpriseTrace = path.join(root, ".next/server/app/api/enterprise/route.js.nft.json");
  let enterpriseFiles;
  for (const trace of traces) {
    const { files } = JSON.parse(await readFile(trace, "utf8"));
    const resolved = files.map(file => path.resolve(path.dirname(trace), file));
    const links = [];
    for (const filename of resolved) {
      const info = await lstat(filename);
      if (info.isSymbolicLink() && (await stat(filename)).isDirectory()) links.push(filename);
    }
    for (const link of links) {
      const child = resolved.find(filename => filename.startsWith(link + path.sep));
      if (child) throw new Error(`Invalid Vercel trace ${path.relative(root, trace)}: ${path.relative(root, child)} is inside traced directory symlink ${path.relative(root, link)}`);
    }
    if (trace === enterpriseTrace) enterpriseFiles = new Set(resolved);
  }
  const validatorDirectory = await realpath(path.join(root, "node_modules/xmllint-wasm"));
  for (const name of ["xmllint-node.js", "xmllint.wasm"]) {
    const filename = path.join(validatorDirectory, name);
    if (!enterpriseFiles?.has(filename) || !(await stat(filename)).isFile()) {
      throw new Error(`Missing physical XML validator asset in enterprise trace: ${name}`);
    }
  }
  console.log(`PASS: ${traces.length} Next.js traces have no directory symlink/file collisions; XML worker and WASM are included at their physical paths.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await checkVercelTraces();
}
