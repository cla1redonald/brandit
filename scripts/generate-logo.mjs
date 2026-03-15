#!/usr/bin/env node

import OpenAI from "openai";
import sharp from "sharp";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { parseArgs } from "util";

// --- CLI args ---
const { values: args } = parseArgs({
  options: {
    prompt: { type: "string" },
    name: { type: "string" },
    font: { type: "string", default: "Inter" },
    "font-weight": { type: "string", default: "700" },
    "primary-color": { type: "string", default: "#2563EB" },
    "bg-color": { type: "string", default: "#FFFFFF" },
    "output-dir": { type: "string", default: "./" },
  },
});

if (!args.prompt) {
  console.error("Error: --prompt is required");
  process.exit(1);
}

if (!args.name) {
  console.error("Error: --name is required");
  process.exit(1);
}

if (!process.env.OPENAI_API_KEY) {
  console.error("Error: OPENAI_API_KEY environment variable is not set.");
  process.exit(2);
}

const outputDir = args["output-dir"];
if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true });
}

// --- Step 1: Generate symbol via DALL-E ---
console.error("Generating symbol via DALL-E...");
const client = new OpenAI();

let symbolBuffer;
try {
  const response = await client.images.generate({
    model: "dall-e-3",
    prompt: `${args.prompt}. Simple, clean icon/symbol on a solid white background. No text, no letters, no words. Minimal, professional, works at 64x64px. Vector-style flat design.`,
    n: 1,
    size: "1024x1024",
    response_format: "b64_json",
  });

  symbolBuffer = Buffer.from(response.data[0].b64_json, "base64");
  console.error("Symbol generated successfully.");
} catch (err) {
  if (err.code === "content_policy_violation") {
    console.error(`Content policy rejection: ${err.message}`);
    process.exit(1);
  }
  console.error(`DALL-E API error: ${err.message}`);
  process.exit(1);
}

// --- Step 2: Process symbol (trim whitespace, resize) ---
const symbolProcessed = await sharp(symbolBuffer)
  .trim()
  .resize(400, 400, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer();

// --- Step 3: Download Google Font and create wordmark ---
const fontFamily = args.font;
const fontSize = 120;
const fontWeight = args["font-weight"];
const primaryColor = args["primary-color"];

const googleFontsUrl = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/ /g, "+")}:wght@${fontWeight}&display=swap`;

// Download the font file and embed as base64 (librsvg can't fetch external URLs)
console.error(`Downloading Google Font: ${fontFamily} (weight ${fontWeight})...`);
let fontBase64 = "";
let fontFormat = "woff2";
try {
  const cssRes = await fetch(googleFontsUrl, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
  });
  const cssText = await cssRes.text();
  const urlMatch = cssText.match(/src:\s*url\(([^)]+)\)\s*format\(['"]?([\w]+)['"]?\)/);
  if (urlMatch) {
    const fontUrl = urlMatch[1];
    fontFormat = urlMatch[2] || "woff2";
    const fontRes = await fetch(fontUrl);
    const fontArrayBuffer = await fontRes.arrayBuffer();
    fontBase64 = Buffer.from(fontArrayBuffer).toString("base64");
    console.error("Font downloaded and embedded.");
  } else {
    console.error("Warning: could not parse font URL from Google Fonts CSS. Using system fallback.");
  }
} catch (err) {
  console.error(`Warning: failed to download font: ${err.message}. Using system fallback.`);
}

const fontFaceRule = fontBase64
  ? `@font-face { font-family: '${fontFamily}'; font-weight: ${fontWeight}; src: url(data:font/${fontFormat};base64,${fontBase64}) format('${fontFormat}'); }`
  : "";

// Render wordmark as SVG with embedded font
const textSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="200">
  <style>${fontFaceRule}</style>
  <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle"
        font-family="'${fontFamily}', sans-serif" font-size="${fontSize}" font-weight="${fontWeight}"
        fill="${primaryColor}">${args.name}</text>
</svg>`;

const wordmarkBuffer = await sharp(Buffer.from(textSvg))
  .resize(600, 200, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer();

// --- Step 4: Composite symbol + wordmark ---
const bgColor = args["bg-color"];
const bgR = parseInt(bgColor.slice(1, 3), 16);
const bgG = parseInt(bgColor.slice(3, 5), 16);
const bgB = parseInt(bgColor.slice(5, 7), 16);

const symbolResized = await sharp(symbolProcessed)
  .resize(300, 300, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer();

const wordmarkResized = await sharp(wordmarkBuffer)
  .resize(600, 180, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer();

const composited = await sharp({
  create: {
    width: 1024,
    height: 400,
    channels: 4,
    background: { r: bgR, g: bgG, b: bgB, alpha: 255 },
  },
})
  .composite([
    { input: symbolResized, left: 40, top: 50 },
    { input: wordmarkResized, left: 380, top: 110 },
  ])
  .png()
  .toBuffer();

// --- Step 5: Write primary logo ---
const primaryPath = join(outputDir, "brand-logo.png");
writeFileSync(primaryPath, composited);
console.error(`Written: ${primaryPath}`);

// --- Step 6: Create dark variant ---
// Re-composite on dark background with white wordmark (NOT negate — that inverts brand colours)
const darkTextSvg = textSvg.replace(`fill="${primaryColor}"`, 'fill="#FFFFFF"');
const darkWordmarkResized = await sharp(Buffer.from(darkTextSvg))
  .resize(600, 180, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toBuffer();

const darkComposited = await sharp({
  create: {
    width: 1024,
    height: 400,
    channels: 4,
    background: { r: 26, g: 26, b: 26, alpha: 255 }, // #1A1A1A
  },
})
  .composite([
    { input: symbolResized, left: 40, top: 50 },
    { input: darkWordmarkResized, left: 380, top: 110 },
  ])
  .png()
  .toBuffer();

const darkPath = join(outputDir, "brand-logo-dark.png");
writeFileSync(darkPath, darkComposited);
console.error(`Written: ${darkPath}`);

// --- Step 7: Create favicon variant (symbol only, 512x512) ---
const faviconVariant = await sharp(symbolProcessed)
  .resize(512, 512, { fit: "contain", background: { r: bgR, g: bgG, b: bgB, alpha: 255 } })
  .png()
  .toBuffer();
const faviconPath = join(outputDir, "brand-logo-favicon.png");
writeFileSync(faviconPath, faviconVariant);
console.error(`Written: ${faviconPath}`);

// Print success to stdout (agent reads this)
console.log(JSON.stringify({
  success: true,
  files: {
    primary: primaryPath,
    dark: darkPath,
    favicon: faviconPath,
  },
  googleFontsUrl,
}));
