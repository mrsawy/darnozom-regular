// Rewrites the Medusa server build so the VPS can `npm install` it.
//
// `medusa build` copies apps/medusa/package.json into .medusa/server, including
// `@workspace/*` dependencies pinned to `workspace:*`. The deploy host runs
// npm, which rejects that pnpm-only protocol. Using `file:./vendor/...` instead
// triggers an npm arborist crash (`Cannot read properties of null (reading
// 'edgesOut')`) on the VPS. So this script:
//   1. Bundles each workspace package into vendor/<name>/index.js
//   2. Rewrites package.json from the source app package (no workspace:/file:)
//   3. Hoists only the real npm deps those vendor bundles need at runtime
//   4. Leaves vendor/ for deploy.sh to copy into node_modules/@workspace

import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const serverDir = path.join(repoRoot, "apps/medusa/.medusa/server");
const sourcePkgPath = path.join(repoRoot, "apps/medusa/package.json");
const require = createRequire(path.join(repoRoot, "apps/api/package.json"));
const esbuild = require("esbuild");

const packages = [
  {
    name: "@workspace/db",
    dir: "db",
    entry: "packages/db/src/index.ts",
    // Only used by one-off migrate-books/shipping scripts, not medusa start.
    // Do not hoist drizzle-orm: its optional react-native peers break npm's
    // peer resolution against Medusa's react@18.
    dependencies: {},
  },
  {
    name: "@workspace/object-store",
    dir: "object-store",
    entry: "packages/object-store/src/index.ts",
    dependencies: {
      "@google-cloud/storage": "^7.19.0",
    },
  },
  {
    name: "@workspace/payment-gateways",
    dir: "payment-gateways",
    entry: "packages/payment-gateways/src/index.ts",
    dependencies: {},
  },
];

if (!fs.existsSync(path.join(serverDir, "package.json"))) {
  console.error(`Medusa server build is missing at ${serverDir}. Run medusa build first.`);
  process.exit(1);
}

const vendorRoot = path.join(serverDir, "vendor");
fs.rmSync(vendorRoot, { recursive: true, force: true });
fs.mkdirSync(vendorRoot, { recursive: true });

for (const pkg of packages) {
  const outDir = path.join(vendorRoot, pkg.dir);
  fs.mkdirSync(outDir, { recursive: true });
  await esbuild.build({
    absWorkingDir: repoRoot,
    entryPoints: [pkg.entry],
    outfile: path.join(outDir, "index.js"),
    bundle: true,
    platform: "node",
    format: "esm",
    packages: "external",
    logLevel: "warning",
  });
  fs.writeFileSync(
    path.join(outDir, "package.json"),
    JSON.stringify(
      {
        name: pkg.name,
        version: "0.0.0",
        type: "module",
        main: "./index.js",
        exports: { ".": "./index.js" },
      },
      null,
      2,
    ) + "\n",
  );
}

const source = JSON.parse(fs.readFileSync(sourcePkgPath, "utf8"));
const workspaceNames = new Set(packages.map((p) => p.name));
const dependencies = {};

for (const [name, version] of Object.entries(source.dependencies ?? {})) {
  if (workspaceNames.has(name) || String(version).startsWith("workspace:")) continue;
  dependencies[name] = version;
}
for (const pkg of packages) {
  Object.assign(dependencies, pkg.dependencies);
}

const runtime = {
  name: source.name,
  version: source.version,
  private: true,
  scripts: { start: "medusa start" },
  dependencies,
  engines: source.engines,
};

fs.writeFileSync(path.join(serverDir, "package.json"), JSON.stringify(runtime, null, 2) + "\n");
console.log("Staged Medusa vendor packages (no workspace:/file: deps).");
