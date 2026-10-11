import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const size = 1024;
const source = resolve("public/brantone-veyor-logo.webp");
const output = resolve("build/icon.png");
await mkdir(resolve("build"), { recursive: true });
const logo = await sharp(source)
  .resize({ width: 850, height: 370, fit: "inside", withoutEnlargement: true })
  .png()
  .toBuffer();
const { width = 0, height = 0 } = await sharp(logo).metadata();
const background = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">' +
  '<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#FDFEFE"/><stop offset=".58" stop-color="#F0F3F7"/><stop offset="1" stop-color="#DDE3EA"/></linearGradient>' +
  '<linearGradient id="line" x1="0" x2="1"><stop stop-color="#B78732"/><stop offset="1" stop-color="#E0C380"/></linearGradient></defs>' +
  '<rect width="1024" height="1024" rx="185" fill="url(#bg)"/>' +
  '<rect x="47" y="47" width="930" height="930" rx="145" fill="none" stroke="url(#line)" stroke-width="18"/>' +
  '<path d="M140 760H884" stroke="#B78732" stroke-width="11" opacity=".7"/>' +
  '</svg>'
);
await sharp(background)
  .composite([{ input: logo, left: Math.round((size - width) / 2), top: Math.round((size - height) / 2) - 30 }])
  .png()
  .toFile(output);
console.log("P004 Windows brand icon generated:", output);
