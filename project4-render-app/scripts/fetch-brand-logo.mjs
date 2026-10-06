import { mkdir, writeFile } from "node:fs/promises";

const source =
  "https://jiaoyipingtai-app.floot.app/_cdn/static/770adad5-ac2a-4117-a772-19f701ebdbd2-brantone-veyor-logo-v3.png";

const response = await fetch(source);
if (!response.ok) {
  throw new Error(`Failed to fetch brand logo: ${response.status} ${response.statusText}`);
}

const bytes = new Uint8Array(await response.arrayBuffer());
if (bytes.byteLength < 1000) {
  throw new Error("Downloaded brand logo is unexpectedly small");
}

await mkdir(new URL("../public/", import.meta.url), { recursive: true });
await writeFile(new URL("../public/brantone-veyor-logo-v3.png", import.meta.url), bytes);
console.log(`Brand logo prepared: ${bytes.byteLength} bytes`);
