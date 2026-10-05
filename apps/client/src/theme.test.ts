import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname);
const LEGACY =
  /#(0F3D2E|F4ECD7|134A38|082219|0A2A1F|F8F4E8|F6E7BD|DDD4BD|CFA63D|1D5E48|14302A)\b|darnozom-n-logo-green|--emerald-|--gold-warm|--gold-soft|--ink-deep|--sand-line|hsl\(1[4-6][0-9]_|rgba\(15, ?61, ?46/i;

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return walk(full);
    return /\.(tsx?|css)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [full] : [];
  });
}

describe("brand theme", () => {
  it("has no legacy green palette left in source", () => {
    const offenders = walk(ROOT)
      .filter((f) => LEGACY.test(readFileSync(f, "utf8")))
      .map((f) => path.relative(ROOT, f));
    expect(offenders).toEqual([]);
  });

  it("defines the approved brand colours", () => {
    const css = readFileSync(path.join(ROOT, "index.css"), "utf8");
    for (const hsl of ["209 51% 29%", "208 54% 20%", "43 33% 96%", "210 40% 94%", "39 33% 56%", "35 43% 69%", "210 38% 18%", "211 18% 39%", "208 27% 88%"]) {
      expect(css).toContain(hsl);
    }
  });
});
