# BrandIt Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build BrandIt as a Claude Code plugin — an AI brand consultant that generates MVP-ready brand identity and design system foundations.

**Architecture:** Claude Code plugin following the same pattern as ProveIt (`~/proveit/`). Agent definition in `agents/brandit.md`, skill entry point in `commands/brandit.md`, logo generation script in `scripts/generate-logo.mjs`. Plugin registration via `.claude-plugin/` manifests and `setup.sh`. All output files written to the PM's project directory (not the plugin directory).

**Tech Stack:** Node.js (ESM), OpenAI SDK (DALL-E image generation), sharp (image compositing/processing), Google Fonts (typography), Claude Code plugin system.

**Spec:** `~/brandit/docs/design.md`

---

## File Structure

```
brandit/
├── .claude-plugin/
│   ├── plugin.json            # Plugin manifest — name, description, paths to commands/agents
│   └── marketplace.json       # Local marketplace config for setup.sh registration
├── agents/
│   └── brandit.md             # Core agent definition — brief, generation, refinement, output phases
├── commands/
│   └── brandit.md             # /brandit skill entry point — bootstraps the agent
├── scripts/
│   └── generate-logo.mjs      # DALL-E symbol generation + Google Font wordmark rendering + compositing
├── docs/
│   ├── design.md              # Design document (already exists)
│   └── plans/
│       └── 2026-03-15-brandit-implementation.md  # This plan
├── .claude/
│   └── settings.json          # Permissions config — Bash not auto-allowed (same security as ProveIt)
├── package.json               # Dependencies: openai, sharp
├── .gitignore                 # node_modules, .env, test output — NOT brand deliverables
├── setup.sh                   # Install/uninstall script — registers plugin in ~/.claude/settings.json
├── CLAUDE.md                  # Agent instructions for working in this repo
└── README.md                  # User-facing docs
```

---

## Chunk 1: Plugin Scaffold & Registration

### Task 1: Initialize project and package.json

**Files:**
- Create: `~/brandit/package.json`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "brandit",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "dependencies": {
    "openai": "^4",
    "sharp": "^0.33"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run: `cd ~/brandit && npm install`
Expected: `node_modules/` created, `package-lock.json` generated.

- [ ] **Step 3: Commit**

```bash
cd ~/brandit && git init && git add package.json package-lock.json
git commit -m "chore: init project with openai and sharp dependencies"
```

---

### Task 2: Create .gitignore

**Files:**
- Create: `~/brandit/.gitignore`

- [ ] **Step 1: Write .gitignore**

```
# Dependencies
node_modules/

# Claude Code local settings
.claude/settings.local.json
.claude/agent-memory-local/
.claude/agent-memory/

# OS
.DS_Store
Thumbs.db

# Environment
.env
.env.local
.env.*.local

# Test output
test-output/
```

Note: Generated brand files (`brand.md`, `brand-tokens.*`, `brand-logo*.png`) are NOT gitignored — they are deliverables written to the PM's project directory.

- [ ] **Step 2: Commit**

```bash
cd ~/brandit && git add .gitignore
git commit -m "chore: add .gitignore"
```

---

### Task 3: Create plugin manifests

**Files:**
- Create: `~/brandit/.claude-plugin/plugin.json`
- Create: `~/brandit/.claude-plugin/marketplace.json`

- [ ] **Step 1: Create plugin.json**

```json
{
  "name": "brandit",
  "description": "AI brand consultant for MVPs. Generates brand identity and design system foundations — name, logo, colours, fonts, tone of voice, and guidelines.",
  "version": "0.1.0",
  "author": { "name": "Claire Donald" },
  "homepage": "https://github.com/cla1redonald/brandit",
  "license": "MIT",
  "keywords": ["brand", "identity", "design-system", "mvp", "logo", "tokens"],
  "commands": "./commands/",
  "agents": "./agents/"
}
```

- [ ] **Step 2: Create marketplace.json**

```json
{
  "name": "brandit",
  "owner": { "name": "Claire Donald" },
  "plugins": [
    {
      "name": "brandit",
      "source": ".",
      "description": "AI brand consultant for MVPs. Generates brand identity and design system foundations."
    }
  ]
}
```

- [ ] **Step 3: Commit**

```bash
cd ~/brandit && git add .claude-plugin/
git commit -m "chore: add plugin manifests"
```

---

### Task 4: Create .claude/settings.json

**Files:**
- Create: `~/brandit/.claude/settings.json`

- [ ] **Step 1: Write settings.json**

Same security model as ProveIt — no Bash auto-allows. WebSearch and WebFetch are allowed for domain checking.

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  },
  "permissions": {
    "allow": [
      "WebSearch",
      "WebFetch"
    ]
  }
}
```

- [ ] **Step 2: Commit**

```bash
cd ~/brandit && git add .claude/settings.json
git commit -m "chore: add permissions config — Bash requires approval"
```

---

### Task 5: Create setup.sh

**Files:**
- Create: `~/brandit/setup.sh`

- [ ] **Step 1: Write setup.sh**

Modelled on ProveIt's `setup.sh`. Registers BrandIt as a plugin in `~/.claude/settings.json`.

```bash
#!/usr/bin/env bash
set -euo pipefail

# BrandIt — Automated Setup
# Registers BrandIt as a Claude Code plugin by merging config into ~/.claude/settings.json

SETTINGS_DIR="$HOME/.claude"
SETTINGS_FILE="$SETTINGS_DIR/settings.json"
BRANDIT_PATH="$(cd "$(dirname "$0")" && pwd)"

# --- Colors (fall back to plain text if no tty) ---
if [[ -t 1 ]]; then
  GREEN='\033[0;32m'
  RED='\033[0;31m'
  YELLOW='\033[0;33m'
  BOLD='\033[1m'
  RESET='\033[0m'
else
  GREEN='' RED='' YELLOW='' BOLD='' RESET=''
fi

info()    { echo -e "${BOLD}$1${RESET}"; }
success() { echo -e "${GREEN}OK${RESET} $1"; }
error()   { echo -e "${RED}ERROR${RESET} $1" >&2; }
warn()    { echo -e "${YELLOW}NOTE${RESET} $1"; }

# --- Prerequisites ---
check_prereqs() {
  local missing=0

  if ! command -v claude &>/dev/null; then
    error "'claude' not found. Install Claude Code: https://claude.ai/download"
    missing=1
  fi

  if ! command -v node &>/dev/null; then
    error "'node' not found. Install Node.js: https://nodejs.org"
    missing=1
  fi

  if ! command -v jq &>/dev/null; then
    error "'jq' not found. Install it: brew install jq"
    missing=1
  fi

  if [[ $missing -ne 0 ]]; then
    echo ""
    echo "Install missing tools, then run this script again."
    exit 1
  fi

  success "Prerequisites (claude, node, jq)"
}

# --- Install ---
install_brandit() {
  mkdir -p "$SETTINGS_DIR"

  if [[ ! -f "$SETTINGS_FILE" ]]; then
    echo '{}' > "$SETTINGS_FILE"
    warn "Created $SETTINGS_FILE"
  fi

  if ! jq empty "$SETTINGS_FILE" 2>/dev/null; then
    error "$SETTINGS_FILE contains invalid JSON."
    error "Fix it manually or delete it, then run this script again."
    exit 1
  fi

  cp "$SETTINGS_FILE" "$SETTINGS_FILE.bak"
  success "Backed up settings to settings.json.bak"

  jq --arg path "$BRANDIT_PATH" '
    .extraKnownMarketplaces.brandit.source = {
      "source": "directory",
      "path": $path
    } |
    .enabledPlugins["brandit@brandit"] = true
  ' "$SETTINGS_FILE" > "$SETTINGS_FILE.tmp"

  mv "$SETTINGS_FILE.tmp" "$SETTINGS_FILE"
  success "Registered BrandIt plugin at $BRANDIT_PATH"

  local ok=1
  jq -e '.extraKnownMarketplaces.brandit.source.path' "$SETTINGS_FILE" >/dev/null 2>&1 || ok=0
  jq -e '.enabledPlugins["brandit@brandit"] == true' "$SETTINGS_FILE" >/dev/null 2>&1 || ok=0

  if [[ $ok -eq 1 ]]; then
    success "Verified installation"
  else
    error "Verification failed. Check $SETTINGS_FILE manually."
    error "A backup is at $SETTINGS_FILE.bak"
    exit 1
  fi

  # Install npm dependencies if not already present
  if [[ ! -d "$BRANDIT_PATH/node_modules" ]]; then
    info "Installing dependencies..."
    (cd "$BRANDIT_PATH" && npm install --silent)
    success "Dependencies installed"
  else
    success "Dependencies already installed"
  fi

  print_quickstart
}

# --- Uninstall ---
uninstall_brandit() {
  if [[ ! -f "$SETTINGS_FILE" ]]; then
    warn "No settings file found at $SETTINGS_FILE. Nothing to uninstall."
    exit 0
  fi

  cp "$SETTINGS_FILE" "$SETTINGS_FILE.bak"
  success "Backed up settings to settings.json.bak"

  jq '
    del(.extraKnownMarketplaces.brandit) |
    del(.enabledPlugins["brandit@brandit"]) |
    if .extraKnownMarketplaces == {} then del(.extraKnownMarketplaces) else . end |
    if .enabledPlugins == {} then del(.enabledPlugins) else . end
  ' "$SETTINGS_FILE" > "$SETTINGS_FILE.tmp"

  mv "$SETTINGS_FILE.tmp" "$SETTINGS_FILE"
  success "BrandIt removed from settings"
  echo ""
  echo "To reinstall: ./setup.sh"
}

# --- Quick Start Guide ---
print_quickstart() {
  echo ""
  info "==========================================="
  info " BrandIt installed!"
  info "==========================================="
  echo ""
  echo "Start a new Claude Code session, then:"
  echo ""
  info "  Generate brand identity for a new idea:"
  echo "  /brandit A habit tracker for remote teams"
  echo ""
  info "  Or after running ProveIt:"
  echo "  /brandit"
  echo "  (reads discovery.md from the current directory)"
  echo ""
  info "  What you'll get:"
  echo "  - 3 complete brand directions to choose from"
  echo "  - AI-generated logo with your brand fonts"
  echo "  - Design system tokens (CSS + JSON)"
  echo "  - Brand guidelines document (brand.md)"
  echo ""
  info "  Tip: Run ProveIt first for smarter brand suggestions:"
  echo "  /proveit → validate → /brandit → brand it"
  echo ""
}

# --- Main ---
case "${1:-}" in
  --uninstall)
    info "Uninstalling BrandIt..."
    check_prereqs
    uninstall_brandit
    ;;
  --help|-h)
    echo "Usage: ./setup.sh [--uninstall]"
    echo ""
    echo "  ./setup.sh             Install BrandIt as a Claude Code plugin"
    echo "  ./setup.sh --uninstall Remove BrandIt from Claude Code settings"
    ;;
  "")
    info "Installing BrandIt..."
    check_prereqs
    install_brandit
    ;;
  *)
    error "Unknown option: $1"
    echo "Usage: ./setup.sh [--uninstall]"
    exit 1
    ;;
esac
```

- [ ] **Step 2: Make executable**

Run: `chmod +x ~/brandit/setup.sh`

- [ ] **Step 3: Commit**

```bash
cd ~/brandit && git add setup.sh
git commit -m "feat: add setup.sh — plugin install/uninstall"
```

---

### Task 6: Create CLAUDE.md

**Files:**
- Create: `~/brandit/CLAUDE.md`

- [ ] **Step 1: Write CLAUDE.md**

```markdown
# BrandIt — Agent Instructions

BrandIt is an AI brand consultant for MVPs. One agent, one skill, one output.

## The Problem It Solves

After validating a product idea, there's a gap before building can start. The MVP needs a name, colours, a logo, fonts — all the brand assets a website requires. BrandIt fills that gap in about 20 minutes.

## What It Does

Takes a product idea (or reads ProveIt's discovery.md) through a brand brief, generates 3 complete brand directions, helps the PM pick and refine, then outputs brand guidelines + design system tokens + AI-generated logo.

## How to Use

```
/brandit [your idea]
```

Or just `/brandit` to read context from `discovery.md` (if ProveIt has been run).

**Where to run it:** In the PM's own project directory (not inside `~/brandit/`). BrandIt creates `brand.md` and related files in the current working directory.

## Directory Structure

```
brandit/
├── agents/brandit.md       # Core agent definition — brief, generation, refinement, outputs
├── commands/brandit.md     # Skill entry point for /brandit
├── scripts/
│   └── generate-logo.mjs  # DALL-E symbol + Google Font wordmark compositing
├── docs/design.md          # Design decisions and brand framework
└── .claude/settings.json   # Permissions config (Bash disabled by default)
```

## Agent

| Agent | Model | Purpose |
|-------|-------|---------|
| `@brandit` | Opus | Brief, direction generation, refinement, outputs |

Direction generation is delegated to Sonnet subagents for parallel execution.

## MCP Tools Used

- **WebSearch/WebFetch** — Domain availability checks
- **Firecrawl** — Competitor brand research (standalone mode)
- **DALL-E** (via script) — Logo symbol generation

## Core Principles

- **Opinionated** — shows up with a draft, not a blank page
- **One question at a time** — warm and conversational
- **Honest** — flags clashing choices, doesn't just agree
- **MVP-minded** — good enough to ship, not precious
- **PM decides** — presents options, never makes the choice

## Security

This project commits NO Bash permission allows in `.claude/settings.json`. All Bash commands require explicit user approval. This is intentional — anyone who clones this repo should review and approve commands individually.
```

- [ ] **Step 2: Commit**

```bash
cd ~/brandit && git add CLAUDE.md
git commit -m "docs: add CLAUDE.md — agent instructions"
```

---

## Chunk 2: Logo Generation Script

### Task 7: Build generate-logo.mjs

**Files:**
- Create: `~/brandit/scripts/generate-logo.mjs`

This is the most technically complex piece. It handles:
1. DALL-E API call to generate a symbol/icon
2. Downloading the generated image
3. Downloading the Google Font
4. Rendering the wordmark text using the Google Font
5. Compositing symbol + wordmark into the final logo
6. Creating dark and favicon variants via post-processing

- [ ] **Step 1: Write the script**

```javascript
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

// --- Step 3: Create wordmark using the brand name ---
// Download the actual Google Font TTF and embed as base64 @font-face in SVG.
// Sharp uses librsvg which cannot fetch external URLs, so we must embed the font.
const fontFamily = args.font;
const fontSize = 120;
const fontWeight = args["font-weight"];
const primaryColor = args["primary-color"];

// Google Fonts CSS import URL for reference (written to output)
const googleFontsUrl = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/ /g, "+")}:wght@${fontWeight}&display=swap`;

// Fetch the font CSS to extract the TTF/WOFF2 URL
console.error(`Downloading Google Font: ${fontFamily} (weight ${fontWeight})...`);
let fontBase64 = "";
let fontFormat = "woff2";
try {
  // Request with user-agent that triggers TTF response (more compatible with SVG)
  const cssRes = await fetch(googleFontsUrl, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
  });
  const cssText = await cssRes.text();
  // Extract the font URL from the CSS
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

// Build SVG with embedded font (or fallback to system font)
const fontFaceRule = fontBase64
  ? `@font-face { font-family: '${fontFamily}'; font-weight: ${fontWeight}; src: url(data:font/${fontFormat};base64,${fontBase64}) format('${fontFormat}'); }`
  : "";

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
// Layout: symbol on left, wordmark on right, 1024x512 canvas
const bgColor = args["bg-color"];
const bgR = parseInt(bgColor.slice(1, 3), 16);
const bgG = parseInt(bgColor.slice(3, 5), 16);
const bgB = parseInt(bgColor.slice(5, 7), 16);

const composited = await sharp({
  create: {
    width: 1024,
    height: 400,
    channels: 4,
    background: { r: bgR, g: bgG, b: bgB, alpha: 255 },
  },
})
  .composite([
    { input: await sharp(symbolProcessed).resize(300, 300, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer(), left: 40, top: 50 },
    { input: await sharp(wordmarkBuffer).resize(600, 180, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer(), left: 380, top: 110 },
  ])
  .png()
  .toBuffer();

// --- Step 5: Write primary logo ---
const primaryPath = join(outputDir, "brand-logo.png");
writeFileSync(primaryPath, composited);
console.error(`Written: ${primaryPath}`);

// --- Step 6: Create dark variant (dark background, preserve brand colours) ---
// Re-composite symbol + wordmark onto a dark background instead of negating.
// Negating would invert brand colours (blue → orange), which is wrong.
const darkComposited = await sharp({
  create: {
    width: 1024,
    height: 400,
    channels: 4,
    background: { r: 26, g: 26, b: 26, alpha: 255 }, // #1A1A1A dark bg
  },
})
  .composite([
    { input: await sharp(symbolProcessed).resize(300, 300, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer(), left: 40, top: 50 },
    // Re-render wordmark in white for dark backgrounds
    { input: await sharp(Buffer.from(textSvg.replace(`fill="${primaryColor}"`, 'fill="#FFFFFF"')))
        .resize(600, 180, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer(), left: 380, top: 110 },
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
```

- [ ] **Step 2: Make executable**

Run: `chmod +x ~/brandit/scripts/generate-logo.mjs`

- [ ] **Step 3: Test the script (requires OPENAI_API_KEY)**

Run: `cd ~/brandit && mkdir -p test-output && node scripts/generate-logo.mjs --prompt "Clean geometric hexagon symbol, blue and white, minimal" --name "TestBrand" --font "Inter" --primary-color "#2563EB" --bg-color "#FFFFFF" --output-dir ./test-output/`

Expected: Exit code 0, three PNG files in `test-output/`, JSON output on stdout.

If `OPENAI_API_KEY` is not set, expected: Exit code 2, error message on stderr.

- [ ] **Step 4: Clean up test output**

Run: `rm -rf ~/brandit/test-output/`

- [ ] **Step 5: Commit**

```bash
cd ~/brandit && git add scripts/generate-logo.mjs
git commit -m "feat: add logo generation script — DALL-E symbol + Google Font wordmark compositing"
```

---

## Chunk 3: Command & Agent Definition

### Task 8: Create the /brandit command entry point

**Files:**
- Create: `~/brandit/commands/brandit.md`

- [ ] **Step 1: Write commands/brandit.md**

```markdown
---
description: Generate MVP-ready brand identity — name, logo, colours, fonts, tone of voice, and design system tokens.
argument-hint: Your product idea (optional — reads discovery.md if available)
---

# /brandit

You are now running as the **BrandIt** agent. Load and follow all instructions from the `agents/brandit.md` agent definition.

## Quick Start

1. Check if `brand.md` exists in the current directory
   - **If yes:** Read it, summarise the current brand, ask what the PM wants to refine
   - **If no:** Check if `discovery.md` exists for context, then start Phase 1 (Brief)

2. Follow the core flow: Brief → Generate 3 Directions → Present → Pick/Mix/Refine → Output

3. Write all output files to the current working directory

## If the user provided an idea with this command

Start the brief with what they gave you. Don't ask "what's the product?" if they already told you. Instead, acknowledge it and ask the first brand-specific question: "What personality should this brand have? More playful or more serious?"

## If discovery.md exists

Read it first. You already know the product, the target user, the market. Open with: "I've read your ProveIt research. Based on that, I'm thinking [personality direction]. Let me check a few things before I generate options."
```

- [ ] **Step 2: Commit**

```bash
cd ~/brandit && git add commands/brandit.md
git commit -m "feat: add /brandit command entry point"
```

---

### Task 9: Create the agent definition

**Files:**
- Create: `~/brandit/agents/brandit.md`

This is the core of BrandIt — the full agent prompt with all phases, templates, and instructions. This is a large file, modelled on ProveIt's `agents/proveit.md`.

- [ ] **Step 1: Write agents/brandit.md**

```markdown
---
name: brandit
description: AI brand consultant for MVPs. Generates brand identity and design system foundations — name, logo, colours, fonts, tone of voice, guidelines.
tools: Read, Write, Glob, Grep, WebSearch, WebFetch, Task, Bash
model: opus
permissionMode: default
memory: user
---

# Agent: BrandIt

## Identity

You are **BrandIt**, a brand consultant for MVPs. You help PMs and founders create a complete brand identity — name, logo, colours, fonts, tone of voice, and design system foundations — in about 20 minutes.

You are opinionated. You show up with a draft, not a clipboard. You push for coherent brand directions, flag clashing choices, and keep things moving. You are not precious — this is an MVP brand, not a forever brand.

**Tagline:** "Brand it, then build it."

## When to Use This Agent

- PM has a validated idea and needs brand identity before building
- PM wants a name, logo, colours, and design tokens for their MVP
- PM ran ProveIt and wants to brand their idea before the technical handoff
- PM needs a quick brand package for a landing page or prototype

---

## File Structure

BrandIt creates files in the current working directory.

```
[project-dir]/
├── brand.md                # Brand guidelines — the main document
├── brand-tokens.css        # CSS custom properties — directly importable
├── brand-tokens.json       # Design tokens — framework-agnostic, portable
├── brand-logo.png          # Primary logo (symbol + wordmark)
├── brand-logo-dark.png     # Dark background variant
└── brand-logo-favicon.png  # 512x512 square (symbol only)
```

---

## Core Flow

```
Brief → Generate 3 Directions → Present → Pick/Mix/Refine → Output
```

### Session Start

**Always check first:** Does `brand.md` exist in the current directory?

**If yes:**
- Read `brand.md`
- Summarise the current brand: "You've already got a brand set up — [name], [personality]. Want to refine something, or start fresh?"
- Ask what the PM wants to change

**If no:** Check if `discovery.md` exists (ProveIt context). Then start Phase 1 (Brief).

---

## Phase 1: The Brief (5 minutes max)

Gather enough context to generate opinionated brand directions. Warm, conversational — like a creative partner.

### If `discovery.md` exists

Read it. You know the product, the user, the market. Open with context:

> "I've read your ProveIt research. You're building [idea] for [target user] to solve [problem]. Based on that, I'm already thinking [personality direction]. Let me check a few things before I generate options."

Ask only brand-specific gaps — 3-4 questions:

1. "What personality should this brand have? More playful or more serious? More premium or more accessible?"
2. "Any names you've been kicking around, or should I start fresh?"
3. "Any brands you admire the look and feel of? Doesn't have to be in the same space."
4. "Anything you definitely don't want? (e.g. 'no blue — every competitor is blue')"

### If no `discovery.md`

Build context from scratch. 6-8 questions:

1. "What's the product? One or two sentences."
2. "Who's it for?"
3. "What problem does it solve?"
4. "What personality should this brand have? More playful or serious? Premium or accessible?"
5. "Any names you've been kicking around, or should I start fresh?"
6. "Any brands you admire the look and feel of?"
7. "Anything you definitely don't want?"

### Flow Rules

- **One question at a time.** Don't fire a list.
- After 2-3 answers, reflect back: "So I'm hearing [X personality] for [Y audience]. Sound right?"
- Move to generation when you have enough. Don't over-interrogate.

---

## Phase 2: Generate Three Directions

Tell the PM: "Give me a couple of minutes — I'm putting together three brand directions for you."

### Step 1: Spawn 3 parallel Sonnet subagents

Use the Task tool. Spawn all 3 in a **single message** with 3 Task calls. All use `model: "sonnet"` and `subagent_type: "general-purpose"`.

Each agent receives:
1. The brief context (product, audience, personality preferences, constraints)
2. Contents of `discovery.md` (if it exists)
3. Their specific mandate and file path

**Agent prompts:**

**Direction A** (writes to `direction-a.json` in `.brandit-temp/`):
> "You are generating the **BOLD, CONFIDENT** brand direction. Context: [BRIEF]. Your mandate: Create a brand that feels strong, assertive, and direct. Choose a punchy name, bold colours (strong primary, high contrast), a confident tagline, and a direct tone of voice. Use Google Fonts only. Write your output as JSON to `.brandit-temp/direction-a.json` using this exact structure:
> ```json
> {
>   "name": "BrandName",
>   "tagline": "One line tagline",
>   "personality": { "adjectives": ["bold", "confident", "direct"], "description": "One paragraph" },
>   "colors": {
>     "primary": "#hex", "secondary": "#hex", "accent": "#hex",
>     "neutral": { "50": "#hex", "100": "#hex", "200": "#hex", "300": "#hex", "400": "#hex", "500": "#hex", "600": "#hex", "700": "#hex", "800": "#hex", "900": "#hex" },
>     "success": "#hex", "warning": "#hex", "error": "#hex", "info": "#hex"
>   },
>   "typography": {
>     "heading": { "family": "Font Name", "weights": [600, 700] },
>     "body": { "family": "Font Name", "weights": [400, 500] },
>     "mono": { "family": "Font Name", "weights": [400] }
>   },
>   "toneOfVoice": {
>     "guidelines": "How we write",
>     "weSay": "Example phrase",
>     "weDontSay": "Example phrase",
>     "errorExample": "Example error message",
>     "welcomeExample": "Example welcome message"
>   },
>   "logoPrompt": "A DALL-E prompt for the symbol/icon. Describe the visual style, shape, mood. No text."
> }
> ```"

**Direction B** (writes to `direction-b.json`):
> Same structure, but mandate is: "**FRIENDLY, APPROACHABLE** brand direction. Warm colours, inviting name, conversational tone."

**Direction C** (writes to `direction-c.json`):
> Same structure, but mandate is: "**MINIMAL, PREMIUM** brand direction. Restrained palette, elegant name, refined tone."

Adapt the mandates based on the PM's brief. If they said "nothing corporate," Direction C becomes "minimal, creative" instead.

### Step 2: Check domain availability

While waiting for subagents, or after they return, use WebSearch to check domain availability for each name. Check `.com`, `.co`, `.io`, and `.app` variants. Results are indicative ("likely available" / "likely taken"), not guaranteed.

### Step 3: Generate logos

After all 3 direction JSON files are written, read each one and invoke the logo script for each direction:

```bash
node ~/brandit/scripts/generate-logo.mjs \
  --prompt "[logoPrompt from direction JSON]" \
  --name "[name from direction JSON]" \
  --font "[heading font from direction JSON]" \
  --font-weight 700 \
  --primary-color "[primary color from direction JSON]" \
  --bg-color "#FFFFFF" \
  --output-dir ./.brandit-temp/direction-a-logos/
```

Repeat for directions B and C (output to `.brandit-temp/direction-b-logos/` and `.brandit-temp/direction-c-logos/`).

**If the script fails** (exit code 1 or 2): note the failure and continue without a logo for that direction. Tell the PM which direction couldn't generate a logo and why.

### Step 4: Track DALL-E budget

Maintain a mental count:
- Round 1 uses 3 DALL-E calls (one per direction)
- Maximum 3 more for refinement rounds
- Total budget: 6 calls

---

## Phase 3: Present

Show all three directions using the **superpowers brainstorming visual companion**.

Write an HTML file to the visual companion's screen directory showing all three directions side by side: name, tagline, colour swatches, font samples, logo, and tone of voice examples. Use the CSS classes from the visual companion (`.cards`, `.card`, `data-choice`, `onclick="toggleSelect(this)"`).

If the visual companion is not available (user declined or not set up), present in the terminal as a structured text comparison.

Tell the PM: "Take a look at the three directions in your browser. Click to select your favourite, or tell me what you like from each."

---

## Phase 4: Refinement

The PM responds in one of three ways:

### Pick one
"I like B." Confirm the choice. Ask: "Anything you'd tweak before I finalise?"

### Mix and match
"I like the name from A, the colours from C, and the logo from B." Merge into a single direction. Check coherence — if a playful name is paired with premium colours, flag it: "That name feels more casual than those colours suggest — want me to adjust one or the other?"

Show the merged result in the visual companion.

### None quite right
"I like B but it's too corporate." Generate a revised version. Only spend a DALL-E call if the logo concept needs to change. If only colours/fonts/name changed, re-render the wordmark with the script (no DALL-E call needed — reuse the existing symbol).

### Refinement Limits

- **Maximum 3 refinement rounds.** After the third: "Remember — this is your MVP brand, not your forever brand. Let's ship this and you can evolve it later."
- **Maximum 3 additional DALL-E calls** for refinement (6 total session budget). If exhausted: "That's the last logo round — pick the closest one and a designer can tweak it later."
- **Be cost-efficient.** Don't regenerate the logo if only colours, fonts, or name changed.

### Clean up direction files

After the PM finalises their choice, delete the temporary direction files:
- `.brandit-temp/` directory (contains direction JSONs and logo subdirectories)

---

## Phase 5: Output

When the PM confirms "that's the one," generate the final output files.

### Step 1: Generate final logo

Run the logo script one final time with the confirmed brand values, outputting directly to the current directory:

```bash
node ~/brandit/scripts/generate-logo.mjs \
  --prompt "[final logo prompt]" \
  --name "[final name]" \
  --font "[final heading font]" \
  --font-weight 700 \
  --primary-color "[final primary color]" \
  --bg-color "#FFFFFF" \
  --output-dir ./
```

If the PM kept an existing logo from the direction phase, copy the files instead of regenerating (saves a DALL-E call).

### Step 2: Write brand.md

Write the brand guidelines document to `brand.md` using the template below.

### Step 3: Write brand-tokens.css

Generate CSS custom properties from the finalised brand values.

### Step 4: Write brand-tokens.json

Generate the same tokens in JSON format.

### Step 5: Confirm to PM

> "Your brand package is ready:
> - `brand.md` — full brand guidelines
> - `brand-tokens.css` — CSS custom properties, ready to import
> - `brand-tokens.json` — design tokens for Tailwind/Figma/etc.
> - `brand-logo.png` — primary logo
> - `brand-logo-dark.png` — dark background variant
> - `brand-logo-favicon.png` — favicon/app icon
>
> Everything's in the current directory. Hand these to your developer (or ShipIt) and start building."

If ProveIt is the next step, remind them: "If you're heading back to ProveIt for the Gamma deck, it'll automatically use your brand."

---

## brand.md Template

```markdown
# Brand Guidelines: [Name]
Generated: [date]
Last updated: [date]

## Identity
- Name: [name]
- Tagline: [tagline]
- Domain: [domain] ([status])

## Personality
- Adjectives: [3-4 words]
- Description: [one paragraph]

## Tone of Voice
- How we write: [guidelines]
- We say: [example] / We don't say: [example]
- Error message example: "..."
- Welcome message example: "..."
- Notification example: "..."

## Logo
- Primary: brand-logo.png
- Dark variant: brand-logo-dark.png
- Favicon: brand-logo-favicon.png
- Usage notes: [min size, clear space, what not to do]

## Colours
| Role | Hex | Usage |
|------|-----|-------|
| Primary | [hex] | Buttons, links, key actions |
| Secondary | [hex] | Supporting elements |
| Accent | [hex] | Highlights, badges |
| Neutral-50 | [hex] | Lightest background |
| Neutral-100 | [hex] | Subtle background |
| Neutral-200 | [hex] | Borders, dividers |
| Neutral-300 | [hex] | Disabled state |
| Neutral-400 | [hex] | Placeholder text |
| Neutral-500 | [hex] | Secondary text |
| Neutral-600 | [hex] | Body text |
| Neutral-700 | [hex] | Headings |
| Neutral-800 | [hex] | High emphasis |
| Neutral-900 | [hex] | Darkest text |
| Success | [hex] | Positive states |
| Warning | [hex] | Caution states |
| Error | [hex] | Error states |
| Info | [hex] | Informational states |

## Typography
- Headings: [Font] — [weights]
- Body: [Font] — [weights]
- Mono: [Font] — [weights]
- Import: [Google Fonts URL]
- Scale: 12 / 14 / 16 / 18 / 20 / 24 / 30 / 36 / 48 / 60

## Spacing
- Base unit: [4px or 8px]
- Scale: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96

## Border Radius
- Small: [value] — inputs, chips
- Medium: [value] — cards, buttons
- Large: [value] — modals, panels
- Full: 9999px — pills, avatars

## Shadows
- sm: [value] — subtle elevation
- md: [value] — cards, dropdowns
- lg: [value] — modals, popovers
- xl: [value] — sticky headers
```

---

## brand-tokens.css Template

```css
/* Brand Tokens: [Name]
 * Generated by BrandIt — [date]
 * Import: @import url('[Google Fonts URL]');
 */

@import url('[Google Fonts URL]');

:root {
  /* Colours */
  --color-primary: [hex];
  --color-secondary: [hex];
  --color-accent: [hex];
  --color-neutral-50: [hex];
  --color-neutral-100: [hex];
  --color-neutral-200: [hex];
  --color-neutral-300: [hex];
  --color-neutral-400: [hex];
  --color-neutral-500: [hex];
  --color-neutral-600: [hex];
  --color-neutral-700: [hex];
  --color-neutral-800: [hex];
  --color-neutral-900: [hex];
  --color-success: [hex];
  --color-warning: [hex];
  --color-error: [hex];
  --color-info: [hex];

  /* Typography */
  --font-heading: '[Heading Font]', sans-serif;
  --font-body: '[Body Font]', sans-serif;
  --font-mono: '[Mono Font]', monospace;
  --font-size-xs: 12px;
  --font-size-sm: 14px;
  --font-size-base: 16px;
  --font-size-lg: 18px;
  --font-size-xl: 20px;
  --font-size-2xl: 24px;
  --font-size-3xl: 30px;
  --font-size-4xl: 36px;
  --font-size-5xl: 48px;
  --font-size-6xl: 60px;

  /* Spacing */
  --space-1: [base]px;
  --space-2: [base*2]px;
  --space-3: [base*3]px;
  --space-4: [base*4]px;
  --space-6: [base*6]px;
  --space-8: [base*8]px;
  --space-12: [base*12]px;
  --space-16: [base*16]px;
  --space-24: [base*24]px;

  /* Border Radius */
  --radius-sm: [value];
  --radius-md: [value];
  --radius-lg: [value];
  --radius-full: 9999px;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --shadow-md: 0 4px 6px rgba(0,0,0,0.07);
  --shadow-lg: 0 10px 15px rgba(0,0,0,0.1);
  --shadow-xl: 0 20px 25px rgba(0,0,0,0.15);
}
```

---

## brand-tokens.json Template

```json
{
  "brand": "[Name]",
  "generated": "[date]",
  "colors": {
    "primary": "[hex]",
    "secondary": "[hex]",
    "accent": "[hex]",
    "neutral": {
      "50": "[hex]", "100": "[hex]", "200": "[hex]", "300": "[hex]",
      "400": "[hex]", "500": "[hex]", "600": "[hex]", "700": "[hex]",
      "800": "[hex]", "900": "[hex]"
    },
    "success": "[hex]",
    "warning": "[hex]",
    "error": "[hex]",
    "info": "[hex]"
  },
  "typography": {
    "heading": { "family": "[Font]", "weights": [600, 700], "fallback": "sans-serif" },
    "body": { "family": "[Font]", "weights": [400, 500], "fallback": "sans-serif" },
    "mono": { "family": "[Font]", "weights": [400], "fallback": "monospace" },
    "googleFontsUrl": "[URL]",
    "scale": [12, 14, 16, 18, 20, 24, 30, 36, 48, 60]
  },
  "spacing": {
    "base": [value],
    "scale": [4, 8, 12, 16, 24, 32, 48, 64, 96]
  },
  "borderRadius": {
    "sm": "[value]",
    "md": "[value]",
    "lg": "[value]",
    "full": "9999px"
  },
  "shadows": {
    "sm": "0 1px 2px rgba(0,0,0,0.05)",
    "md": "0 4px 6px rgba(0,0,0,0.07)",
    "lg": "0 10px 15px rgba(0,0,0,0.1)",
    "xl": "0 20px 25px rgba(0,0,0,0.15)"
  }
}
```

---

## Conversation Style

- One question at a time (voice-friendly)
- Warm but direct — like a creative partner, not a corporate agency
- Opinionated — show up with a point of view, not blank options
- Honest — if a name is terrible or colours clash, say so
- MVP-minded — "good enough to ship" not "award-winning identity"
- Use plain language. No branding jargon unless the PM uses it first.
- Celebrate strong choices: "That name is great — short, memorable, and the .com is available."

---

## Things You Do NOT Do

- You do not make the final brand decision — you present options, the PM picks
- You do not generate Figma files or print-ready assets
- You do not write code beyond the token files
- You do not promise the AI logo is production-ready — it's a starting point
- You do not hardcode paths — all files write to the current working directory
- You do not spend DALL-E calls unnecessarily — reuse symbols when only text/colours change
```

- [ ] **Step 2: Commit**

```bash
cd ~/brandit && git add agents/brandit.md
git commit -m "feat: add core BrandIt agent definition — full brief-to-output flow"
```

---

## Chunk 4: README & ProveIt Integration

### Task 10: Create README.md

**Files:**
- Create: `~/brandit/README.md`

- [ ] **Step 1: Write README.md**

```markdown
# BrandIt

AI brand consultant for MVPs. Generates complete brand identity and design system foundations in about 20 minutes.

## What You Get

- **Brand name** with domain availability check
- **AI-generated logo** (symbol + wordmark using your brand font)
- **Colour palette** — primary, secondary, accent, neutrals, semantic colours
- **Typography** — heading, body, and mono fonts (Google Fonts)
- **Tone of voice** — guidelines with examples
- **Design tokens** — CSS custom properties + JSON (ready for Tailwind, Figma, etc.)
- **Brand guidelines** — `brand.md` with everything documented

## Install

```bash
git clone https://github.com/cla1redonald/brandit.git ~/brandit
cd ~/brandit
npm install
./setup.sh
```

## Usage

Start a new Claude Code session in your project directory, then:

```
/brandit A habit tracker for remote teams
```

Or after running ProveIt:

```
/brandit
```

BrandIt reads `discovery.md` if available for smarter suggestions.

## How It Works

1. **Brief** — BrandIt asks a few questions about brand personality and preferences
2. **Generate** — Creates 3 complete brand directions (bold, friendly, minimal)
3. **Present** — Shows all three side by side in a visual companion
4. **Refine** — Pick one, mix and match, or adjust until you're happy
5. **Output** — Writes brand guidelines, design tokens, and logo files

## Works With ProveIt

ProveIt validates the idea. BrandIt brands it. Run ProveIt first, then BrandIt reads your research for smarter brand suggestions. The Gamma deck will use your actual brand.

```
/proveit → validate → /brandit → brand it → /proveit → branded Gamma deck
```

## Requirements

- [Claude Code](https://claude.ai/download)
- Node.js 18+
- `OPENAI_API_KEY` environment variable (for logo generation — optional, degrades gracefully)
```

- [ ] **Step 2: Commit**

```bash
cd ~/brandit && git add README.md
git commit -m "docs: add README"
```

---

### Task 11: Update ProveIt agent to offer BrandIt

**Files:**
- Modify: `~/proveit/agents/proveit.md` (add BrandIt offer before Phase 5)

- [ ] **Step 1: Read the current Phase 5 section of ProveIt's agent**

Read `~/proveit/agents/proveit.md` and locate the Phase 5: Outputs section.

- [ ] **Step 2: Add BrandIt offer before Phase 5**

Insert a new section before Phase 4.9 (pre-output cross-model review) in `~/proveit/agents/proveit.md`:

```markdown
## Phase 4.85: Brand Identity (optional — offered before pre-output review)

Before generating the Gamma deck, offer BrandIt:

> "Before I generate the deck — want to create a brand identity first? It'll take about 20 minutes. You'll get a name, logo, colours, fonts, and design tokens. Then the Gamma deck will use your actual brand instead of placeholders.
>
> Run `/brandit` to start. Come back to me when you're done."

This is a suggestion, not a gate. The PM can skip it.

### If brand.md exists when generating outputs

Read `brand.md` from the current directory. Use the brand name, tagline, colours, and logo references when generating the Gamma deck. The deck should feel like it's presenting a real product, not a generic concept.
```

- [ ] **Step 3: Commit (in the ProveIt repo)**

```bash
cd ~/proveit && git add agents/proveit.md
git commit -m "feat: offer BrandIt before Gamma deck generation"
```

---

### Task 12: Add docs/design.md to git and final commit

**Files:**
- Stage: `~/brandit/docs/design.md`
- Stage: `~/brandit/docs/plans/2026-03-15-brandit-implementation.md`

- [ ] **Step 1: Commit design doc and plan**

```bash
cd ~/brandit && git add docs/
git commit -m "docs: add design document and implementation plan"
```

- [ ] **Step 2: Verify final state**

Run: `cd ~/brandit && find . -not -path './node_modules/*' -not -path './.git/*' -type f | sort`

Expected file listing:
```
./.claude/settings.json
./.claude-plugin/marketplace.json
./.claude-plugin/plugin.json
./.gitignore
./CLAUDE.md
./README.md
./agents/brandit.md
./commands/brandit.md
./docs/design.md
./docs/plans/2026-03-15-brandit-implementation.md
./package-lock.json
./package.json
./scripts/generate-logo.mjs
./setup.sh
```

- [ ] **Step 3: Run setup.sh to register the plugin**

Run: `cd ~/brandit && ./setup.sh`

Expected: "BrandIt installed!" with quickstart guide.
