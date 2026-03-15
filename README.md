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
