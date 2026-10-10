import sharp from "sharp";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";

const input = fileURLToPath(new URL("../public/brantone-veyor-logo.webp", import.meta.url));
const output = fileURLToPath(new URL("../public/brantone-veyor-logo-clean.webp", import.meta.url));

const { data, info } = await sharp(input)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

for (let i = 0; i < data.length; i += 4) {
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];
  if (r <= 8 && g <= 8 && b <= 8) data[i + 3] = 0;
}

await sharp(data, {
  raw: {
    width: info.width,
    height: info.height,
    channels: 4,
  },
})
  .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 2 })
  .webp({ quality: 95, alphaQuality: 100 })
  .toFile(output);

const meta = await sharp(output).metadata();
console.log(`Clean logo generated: ${meta.width}x${meta.height}`);
