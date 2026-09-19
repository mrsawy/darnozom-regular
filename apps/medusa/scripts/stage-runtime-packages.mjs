// Rewrites the Medusa server build so the VPS can `npm install` it.
//
// `medusa build` copies apps/medusa/package.json into .medusa/server, including
// `@workspace/*` dependencies pinned to `workspace:*`. The deploy host runs
// npm, which rejects that pnpm-only protocol. This script bundles those
// packages (they are TypeScript, so Node cannot load the source as published)
// and points the built package.json at `file:` copies npm can install.

import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const serverDir = path.join(repoRoot, "apps/medusa/.medusa/server");
const require = createRequire(path.join(repoRoot, "apps/api/package.json"));
const esbuild = require("esbuild");

const packages = [
  {
    name: "@workspace/db",
    dir: "db",
    entry: "packages/db/src/index.ts",
    dependencies: {
      "drizzle-orm": "^0.45.1",
      "drizzle-zod": "^0.8.3",
      pg: "^8.20.0",
      zod: "^3.25.76",
    },
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
        private: true,
        type: "module",
        main: "./index.js",
        exports: { ".": "./index.js" },
        dependencies: pkg.dependencies,
      },
      null,
      2,
    ) + "\n",
  );
}

const pkgPath = path.join(serverDir, "package.json");
const built = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
for (const pkg of packages) {
  if (!built.dependencies?.[pkg.name]) {
    console.error(`Built package.json is missing ${pkg.name}`);
    process.exit(1);
  }
  built.dependencies[pkg.name] = `file:./vendor/${pkg.dir}`;
}
delete built.packageManager;
fs.writeFileSync(pkgPath, JSON.stringify(built, null, 2) + "\n");
console.log("Staged Medusa workspace packages for npm install.");
