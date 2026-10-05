// One-off: node scripts/crop-reference-images.mjs "C:/Users/UTD/Downloads/DarNozom_Final_Developer_Package"
import sharp from "sharp";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";

const pkgDir = process.argv[2];
if (!pkgDir) {
  console.error("usage: node scripts/crop-reference-images.mjs <path-to-DarNozom_Final_Developer_Package>");
  process.exit(1);
}
const { regions } = JSON.parse(await readFile(path.join(pkgDir, "assets/reference-regions.json"), "utf8"));
const src = path.join(pkgDir, "assets/DarNozom_Homepage_Reference.png");
const outDir = path.resolve("apps/client/public/seed");
await mkdir(outDir, { recursive: true });

// Some regions include prototype UI (carousel arrows/dots, text panels, card text);
// trim to the photo only. [dLeft, dTop, dWidth, dHeight] in source pixels.
const TRIM = {
  hero: [40, 0, -80, -24],
  observatory: [0, 0, -217, 0],
  news: [28, 0, -28, 0],
  seminar: [26, 0, -26, 0],
};

for (const [name, region] of Object.entries(regions)) {
  const [dl, dt, dw, dh] = TRIM[name] ?? [0, 0, 0, 0];
  const [left, top, width, height] = [region[0] + dl, region[1] + dt, region[2] + dw, region[3] + dh];
  if (name === "logo" || name === "envelope" || name.startsWith("icon")) continue; // replaced by lucide icons / recoloured logo
  await sharp(src).extract({ left, top, width, height }).webp({ quality: 92 }).toFile(path.join(outDir, `${name}.webp`));
  console.log(`wrote seed/${name}.webp (${width}x${height})`);
}

// Navy logo: the source (darnozom-n-logo-green.png) has no alpha channel and a
// grey/white checkerboard baked in, so derive alpha from colour saturation: the
// green mark is saturated or dark, the background is light and neutral. Fill the mark with #244B70.
const logo = path.resolve("apps/client/public/darnozom-n-logo-green.png");
const { data, info } = await sharp(logo).resize({ width: 512 }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const out = Buffer.alloc(info.width * info.height * 4);
for (let i = 0, o = 0; i < data.length; i += 3, o += 4) {
  const r = data[i], g = data[i + 1], b = data[i + 2];
  const sat = Math.max(r, g, b) - Math.min(r, g, b);
  out[o] = 0x24; out[o + 1] = 0x4b; out[o + 2] = 0x70;
  const lum = 0.299 * r + 0.587 * g + 0.114 * b; // background is light; the mark is dark or saturated
  out[o + 3] = Math.max(0, Math.min(255, Math.max((sat - 18) * 8, (205 - lum) * 6)));
}
await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
  .trim()
  .png()
  .toFile(path.resolve("apps/client/public/darnozom-n-logo-navy.png"));
console.log("wrote darnozom-n-logo-navy.png");
