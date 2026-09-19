// apps/medusa has no "type": "module" (CJS, per create-medusa-app's scaffold),
// but @workspace/object-store is ESM ("type": "module", matching the rest of
// the workspace's convention). A static `export { x } from "@workspace/object-store"`
// fails at Medusa's CJS-based route-registration time with
// "Must use import to load ES Module". Dynamic import() works in CJS and defers
// resolution to runtime, so this file lazily loads the real module on first use
// and caches it.

import type { openPrivateObjectStream as OpenPrivateObjectStream, privateObjectExists as PrivateObjectExists } from "@workspace/object-store" with { "resolution-mode": "import" };

type ObjectStoreModule = typeof import("@workspace/object-store", { with: { "resolution-mode": "import" } });

let cached: ObjectStoreModule | null = null;

async function loadObjectStore(): Promise<ObjectStoreModule> {
  if (!cached) {
    cached = await import("@workspace/object-store");
  }
  return cached;
}

export async function openPrivateObjectStream(
  ...args: Parameters<typeof OpenPrivateObjectStream>
): Promise<ReturnType<typeof OpenPrivateObjectStream>> {
  const mod = await loadObjectStore();
  return mod.openPrivateObjectStream(...args);
}

export async function privateObjectExists(
  ...args: Parameters<typeof PrivateObjectExists>
): Promise<ReturnType<typeof PrivateObjectExists>> {
  const mod = await loadObjectStore();
  return mod.privateObjectExists(...args);
}
