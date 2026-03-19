/**
 * Generates circular app icons from public/bankal-logo.png
 *   public/icon-512.png  – circular, transparent bg, 512×512 (Electron PNG icon)
 *   public/icon.ico      – 256×256 ICO for Windows shortcut / taskbar
 *   public/favicon.svg   – SVG favicon (circular, transparent bg)
 */
import sharp from "sharp";
import pngToIco from "png-to-ico";
import { writeFileSync, readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const src = path.join(root, "public", "bankal-logo.png");

// ── helpers ─────────────────────────────────────────────────────────────────

/** Return a circular SVG mask buffer for size×size */
function circleMask(size) {
  const r = size / 2;
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">` +
    `<circle cx="${r}" cy="${r}" r="${r}" fill="white"/>` +
    `</svg>`
  );
}

/** Produce a sharp pipeline: fit entire logo into size×size (no crop) then apply circle mask */
async function makeCircularPng(size) {
  // padding keeps the seal from touching the very edge (4 % on each side)
  const pad = Math.round(size * 0.04);
  const inner = size - pad * 2;
  const mask = circleMask(size);

  // Resize preserving aspect ratio so the full seal is visible
  const resized = await sharp(src)
    .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({ top: pad, bottom: pad, left: pad, right: pad,
               background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  return sharp(resized)
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer();
}

// ── 512 × 512 PNG ───────────────────────────────────────────────────────────
const png512 = await makeCircularPng(512);
writeFileSync(path.join(root, "public", "icon-512.png"), png512);
console.log("✓  public/icon-512.png");

// ── 256 × 256 PNG for ICO ───────────────────────────────────────────────────
const png256 = await makeCircularPng(256);
writeFileSync(path.join(root, "public", "icon-256.png"), png256);
console.log("✓  public/icon-256.png");

// ── .ico (256 px) ───────────────────────────────────────────────────────────
const icoBuffer = await pngToIco([path.join(root, "public", "icon-256.png")]);
writeFileSync(path.join(root, "public", "icon.ico"), icoBuffer);
console.log("✓  public/icon.ico");

// ── SVG favicon (circular clip of the original PNG via <image>) ─────────────
// Embed the 512-px PNG as base64 so it works in Electron's local file://
const pngB64 = png512.toString("base64");
const svgFavicon =
  `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 512 512">` +
  `<defs><clipPath id="c"><circle cx="256" cy="256" r="256"/></clipPath></defs>` +
  `<image href="data:image/png;base64,${pngB64}" width="512" height="512" clip-path="url(#c)"/>` +
  `</svg>`;
writeFileSync(path.join(root, "public", "favicon.svg"), svgFavicon);
console.log("✓  public/favicon.svg");

console.log("\nAll icons generated.");
