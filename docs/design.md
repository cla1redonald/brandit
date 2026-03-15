# BrandIt — Design Document

**Version:** 1.0
**Date:** 2026-03-15
**Author:** Claire Donald

## What is BrandIt?

BrandIt is a Claude Code plugin that acts as an AI brand consultant for MVPs. It generates a complete brand identity and design system foundations — name, domain, logo, colours, fonts, tone of voice, and brand guidelines — in about 20 minutes.

It gives PMs and founders everything they need to hand to a developer and say "build it looking like this." Good enough to ship, not precious.

**Tagline:** "Brand it, then build it."

## The Problem

After validating a product idea, there's a gap before building can start. The MVP needs a name, colours, a logo, a font — all the brand assets a website requires. Without them, developers either:

- Pick arbitrary colours and placeholder names that never get replaced
- Wait for the PM to come back with brand assets (days or weeks)
- Hire a brand consultant (expensive, slow, overkill for an MVP)

BrandIt fills that gap. It's a brand consultant that works in 20 minutes instead of 20 days.

## How It Works

BrandIt acts like a good brand consultant — shows up with opinions, not a clipboard. If it has context from ProveIt, it arrives with a draft perspective. If not, it asks a short brief. Then it generates three complete brand directions, presents them visually, and helps the PM pick, mix, and refine until they're happy.

### Entry Points

**Two ways in:**

1. **`/brandit [idea]`** — standalone skill. If `discovery.md` exists in the current directory, reads it for context. If not, starts from scratch with its own brief.

2. **ProveIt integration** — after Phase 4 (findings review) when scores are high enough, ProveIt offers:
   > "Before I generate the deck — want to create a brand identity first? It'll take about 20 minutes and the deck will use your actual brand. Run `/brandit` to start, then come back to me."

   When ProveIt later generates the Gamma deck, it checks for `brand.md` in the directory. If found, the deck uses the real name, colours, and logo instead of generic placeholders.

**The connector is the file system** — no skill-to-skill invocation, no tight coupling. BrandIt writes `brand.md`, ProveIt reads it if it's there. Either works without the other.

**Session resume:** BrandIt's first move is to check if `brand.md` exists. If yes, read it, summarise the current brand, and ask what the PM wants to refine.

---

## Core Flow

```
Brief → Generate 3 Directions → Present → Pick/Mix/Refine → Output
```

### Phase 1: The Brief (5 minutes max)

**Goal:** Understand enough to generate opinionated brand directions.

**If `discovery.md` exists**, BrandIt reads it and arrives with context already loaded — the product idea, target user, market positioning, and competitors. It opens with something like:

> "I've read your ProveIt research. You're building [idea] for [target user] to solve [problem]. Based on that, I'm already thinking [personality direction]. Let me check a few things before I generate options."

Then it asks only the brand-specific gaps — 3-4 questions:

- "What personality should this brand have? More playful or more serious? More premium or more accessible?"
- "Any names you've been kicking around, or should I start fresh?"
- "Any brands you admire the look and feel of? Doesn't have to be in the same space."
- "Anything you definitely don't want? (e.g. 'no blue — every competitor is blue')"

**If no `discovery.md`**, BrandIt builds context from scratch. A slightly longer brief — 6-8 questions covering:

- What's the product / who's it for (condensed from ProveIt's brain dump questions)
- The brand-specific questions above

**Key principle:** One question at a time, warm and conversational, not a form. The consultant shows up with opinions, not a clipboard.

### Phase 2: Generate Three Directions

BrandIt goes autonomous. "Give me a couple of minutes — I'm putting together three brand directions for you."

**Each direction is a complete, coherent package:**

- **Name** — with rationale (why it works for this product/audience)
- **Tagline** — one line that captures the value prop
- **Brand personality** — 3-4 adjectives + a one-sentence description of tone
- **Colour palette** — primary, secondary, accent, neutrals, semantic colours (success/error/warning/info), with hex codes
- **Typography** — heading font + body font + mono font (Google Fonts only — free, immediately usable)
- **Logo** — AI-generated via DALL-E, using the same Google Fonts as the brand typography
- **Tone of voice** — how the brand writes, with examples (error message, welcome message)

**The three directions must be meaningfully different**, not three shades of the same thing. Something like:

- **Direction A** — the bold/confident take
- **Direction B** — the friendly/approachable take
- **Direction C** — the minimal/premium take

The specific personalities come from the brief. If the PM said "definitely not corporate," none of the three should be corporate. But within their stated range, push the variety.

**Domain check:** For each name, check availability of `.com`, `.co`, `.io`, and `.app` variants using web search. Flag results as "likely available" or "likely taken" — web search cannot guarantee accuracy. Recommend the PM verify availability on a registrar before purchasing.

**Logo generation:** One DALL-E call per direction (3 total). Each logo is composed of two parts:

1. **Symbol/icon** — AI-generated via DALL-E. The prompt describes the brand personality, visual style, and colour palette. Aimed at clean, simple marks that work at small sizes (favicon-friendly).
2. **Wordmark** — rendered programmatically by `scripts/generate-logo.mjs` using the actual Google Font chosen for the direction. This guarantees typographic consistency with the rest of the brand system.

The script composites symbol + wordmark into the final logo PNG. Dark and favicon variants are generated by post-processing the primary logo (colour inversion for dark, square crop for favicon) — no additional DALL-E calls.

**DALL-E cannot render specific fonts**, so we never ask it to draw text. Text is always rendered by the script using the real font files.

### Phase 3: Present

Show all three directions using the **superpowers brainstorming visual companion** — a browser-based tool that renders HTML mockups and lets the PM click to select options. BrandIt writes HTML files showing colours, type samples, logos, and names rendered side by side. The PM reviews in the browser and responds in the terminal.

The visual companion is part of the superpowers plugin infrastructure (see `skills/brainstorming/visual-companion.md`). BrandIt uses it, not builds it.

### Phase 4: Refinement

The PM responds in one of three ways:

**Pick one:** "I like B." BrandIt confirms the choice and asks if anything needs tweaking before finalising.

**Mix and match:** "I like the name from A, the colours from C, and the logo from B." BrandIt merges them into a single direction, shows the combined result, and asks if it works as a whole. Sometimes cherry-picked elements clash — a playful name with premium colours feels off. BrandIt flags that honestly: "That name feels more casual than those colours suggest — want me to adjust one or the other?"

**None quite right:** "I like the direction of B but it's too corporate." BrandIt generates a revised version based on the feedback, keeping what worked.

**Refinement is iterative but bounded:**
1. PM gives feedback
2. BrandIt adjusts and re-presents (new visual companion screen)
3. PM confirms or gives more feedback

**Maximum 3 refinement rounds.** After the third, BrandIt nudges: "Remember — this is your MVP brand, not your forever brand. Let's ship this and you can evolve it later."

**DALL-E budget:**
- Round 1: 3 calls (one per direction — symbol only, wordmark rendered by script)
- Refinement: up to 3 more calls across all rounds (only when the logo concept changes)
- Dark and favicon variants: 0 calls (post-processed by script)
- Total: 6 DALL-E calls maximum per session

If the PM burns through all 3 refinement logo calls, BrandIt says: "That's the last logo round — pick the closest one and a designer can tweak it later."

**Cost-efficient:** Don't regenerate the logo if the PM only changed the colours, fonts, or name. The script re-renders the wordmark with the new font/name and recolours the symbol without a DALL-E call. Only spend a DALL-E call when the logo concept/symbol itself needs to change.

### Phase 5: Output

When the PM says "that's the one," BrandIt generates the final asset package.

---

## Output Files

```
[project-dir]/
├── brand.md                # Brand guidelines — the main document
├── brand-tokens.css        # CSS custom properties — directly importable
├── brand-tokens.json       # Design tokens — framework-agnostic, portable
├── brand-logo.png          # Primary logo
├── brand-logo-dark.png     # Dark background variant
└── brand-logo-favicon.png  # 512x512 square version for favicons
```

### brand.md

The brand guidelines doc. Structured so a developer (or ShipIt) can read it and build a consistent UI without asking questions.

```markdown
# Brand Guidelines: [Name]
Generated: [date]
Last updated: [date]

## Identity
- Name: [name]
- Tagline: [tagline]
- Domain: [domain] (available/taken)

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
| Primary | #xxx | Buttons, links, key actions |
| Secondary | #xxx | Supporting elements |
| Accent | #xxx | Highlights, badges |
| Neutral-50 | #xxx | Lightest background |
| Neutral-100 | #xxx | Subtle background |
| Neutral-200 | #xxx | Borders, dividers |
| Neutral-300 | #xxx | Disabled state |
| Neutral-400 | #xxx | Placeholder text |
| Neutral-500 | #xxx | Secondary text |
| Neutral-600 | #xxx | Body text |
| Neutral-700 | #xxx | Headings |
| Neutral-800 | #xxx | High emphasis |
| Neutral-900 | #xxx | Darkest text |
| Success | #xxx | Positive states |
| Warning | #xxx | Caution states |
| Error | #xxx | Error states |
| Info | #xxx | Informational states |

## Typography
- Headings: [Font] — [weights: 600, 700]
- Body: [Font] — [weights: 400, 500]
- Mono: [Font] — for code/data [weights: 400]
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

### brand-tokens.css

Directly importable CSS custom properties:

```css
:root {
  /* Colours */
  --color-primary: #xxx;
  --color-secondary: #xxx;
  --color-accent: #xxx;
  --color-neutral-50: #xxx;
  /* ... full neutral scale ... */
  --color-success: #xxx;
  --color-warning: #xxx;
  --color-error: #xxx;
  --color-info: #xxx;

  /* Typography */
  --font-heading: 'Inter', sans-serif;
  --font-body: 'Inter', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  /* ... */

  /* Border Radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 16px;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --shadow-md: 0 4px 6px rgba(0,0,0,0.07);
  --shadow-lg: 0 10px 15px rgba(0,0,0,0.1);
  --shadow-xl: 0 20px 25px rgba(0,0,0,0.15);
}
```

### brand-tokens.json

Same data in portable JSON format for Tailwind configs, Figma plugins, or design token pipelines.

### Logo files

- `brand-logo.png` — primary logo (DALL-E symbol + script-rendered Google Font wordmark, composited)
- `brand-logo-dark.png` — dark background variant (post-processed from primary — colour inversion, no extra DALL-E call)
- `brand-logo-favicon.png` — 512x512 square version (symbol only, cropped from primary, no extra DALL-E call)

The wordmark text is always rendered by `scripts/generate-logo.mjs` using the actual Google Font, guaranteeing consistency with the design system. DALL-E generates only the symbol/icon portion.

---

## Model Strategy

| Phase | Model | Why |
|-------|-------|-----|
| Brief | Opus | Reading between the lines, understanding brand intent |
| Direction generation | Sonnet (3 parallel subagents) | Structured output, speed, parallel execution |
| Domain checks | Sonnet (subagent) | Web search, structured results |
| Presentation/refinement | Opus | Creative judgement, coherence checks when mixing |
| Output generation | Sonnet (subagent) | Structured file writing |
| Logo generation | DALL-E (OpenAI API) | Image generation |

Single BrandIt agent runs on Opus. All subagents explicitly use `model: "sonnet"`.

---

## Technical Dependencies

| Service | Used For | Required? |
|---------|----------|-----------|
| DALL-E (OpenAI) | Logo generation | Optional — degrades to text logo description if no API key |
| WebSearch | Domain availability checks | Yes |
| Firecrawl | Competitor brand research (standalone mode) | Optional |
| Google Fonts | All typography | Yes — free, no licensing issues |

**OpenAI dependency:** Uses the `OPENAI_API_KEY` env var (same as ProveIt's cross-model review). If not set, BrandIt skips logo generation and produces a text description of the logo concept instead. The PM can generate it separately. Graceful degradation, not a hard blocker.

**DALL-E budget:** Maximum 6 calls per session (3 for initial directions + 3 for refinement). BrandIt is cost-efficient — doesn't regenerate the logo if the PM only changed colours or fonts.

---

## Plugin Structure

```
brandit/
├── agents/brandit.md       # Core agent definition
├── commands/brandit.md     # /brandit skill entry point
├── docs/design.md          # This file
├── scripts/
│   └── generate-logo.mjs   # DALL-E logo generation + compositing script
├── .claude/
│   └── settings.json       # Permissions config
├── package.json            # Dependencies (openai, sharp, @canvas/...)
├── .gitignore
├── setup.sh                # Installation
├── README.md
└── CLAUDE.md               # Agent instructions
```

### Agent Frontmatter (`agents/brandit.md`)

```yaml
---
name: brandit
description: AI brand consultant for MVPs. Generates brand identity and design system foundations — name, logo, colours, fonts, tone of voice, guidelines.
tools: Read, Write, Glob, Grep, WebSearch, WebFetch, Task, Bash
model: opus
permissionMode: default
memory: user
---
```

Tools rationale:
- `Read/Write/Glob/Grep` — file operations, reading discovery.md, writing brand.md and tokens
- `WebSearch/WebFetch` — domain availability checks, competitor brand research
- `Task` — spawning Sonnet subagents for direction generation
- `Bash` — invoking `scripts/generate-logo.mjs` for DALL-E + compositing

### Command Definition (`commands/brandit.md`)

```yaml
---
description: Generate MVP-ready brand identity — name, logo, colours, fonts, tone of voice, and design system tokens.
argument-hint: Your product idea (optional — reads discovery.md if available)
---
```

The command loads the `agents/brandit.md` agent definition. Same pattern as ProveIt's `/proveit` command.

### Logo Script Contract (`scripts/generate-logo.mjs`)

The script handles DALL-E API calls, Google Font rendering, and compositing. It is the only component that touches the OpenAI API or generates binary files.

**Interface:**

```bash
node ~/brandit/scripts/generate-logo.mjs \
  --prompt "Clean geometric symbol for a productivity app, minimal, blue and white" \
  --name "FlowState" \
  --font "Inter" \
  --font-weight 700 \
  --primary-color "#2563EB" \
  --bg-color "#FFFFFF" \
  --output-dir ./
```

**Outputs (written to `--output-dir`):**
- `brand-logo.png` — composited symbol + wordmark (1024x512)
- `brand-logo-dark.png` — inverted variant for dark backgrounds
- `brand-logo-favicon.png` — symbol only, cropped to 512x512 square

**Exit codes:**
- `0` — success, all three files written
- `1` — DALL-E API error (prints error message to stderr)
- `2` — missing OPENAI_API_KEY

**Dependencies:** `openai` (API client), `sharp` or `canvas` (image compositing, font rendering)

**What happens on failure:**
- Missing API key → script exits with code 2, agent falls back to text description of logo concept in brand.md
- DALL-E API error (rate limit, content policy, network) → script exits with code 1, agent tells PM: "Logo generation failed — [reason]. I've described the concept in brand.md so you can generate it separately." Does not retry. Does not count against the DALL-E budget.
- Content policy rejection → agent adjusts the prompt (less specific, more abstract) and tries once more. If rejected again, falls back to text description.

### Direction Generation — Subagent Mandates

Three parallel Sonnet subagents via Task tool, each with a distinct creative mandate (same pattern as ProveIt's swarm agents having different angles):

| Agent | Mandate | Personality Direction |
|-------|---------|----------------------|
| Direction A | "Generate the **bold, confident** brand direction" | Strong colours, assertive name, direct tone |
| Direction B | "Generate the **friendly, approachable** brand direction" | Warm colours, inviting name, conversational tone |
| Direction C | "Generate the **minimal, premium** brand direction" | Restrained palette, elegant name, refined tone |

Each agent receives the brief context and their specific mandate. The mandates are adapted based on the PM's brief — if they said "nothing too corporate," Direction C becomes "minimal, creative" instead of "minimal, premium."

Each agent writes their direction to a structured format that the Opus agent then uses to invoke the logo script and compose the visual companion presentation.

---

## ProveIt Integration

**File-based, loosely coupled.**

ProveIt's Phase 5 (outputs) is modified to:

1. Before generating the Gamma deck, check if `brand.md` exists in the project directory
2. If yes, read it and use the brand name, colours, logo, and tagline in the deck
3. If no, generate the deck as before (generic)

ProveIt also adds a new optional step between Phase 4 (findings review) and Phase 5 (outputs):

> "Before I generate the deck — want to create a brand identity first? It'll take about 20 minutes and the deck will use your actual brand. Run `/brandit` to start, then come back to me."

This is a suggestion, not a gate. The PM can skip it and get a generic deck.

**Scope of ProveIt changes:** The modifications to ProveIt's agent definition (`agents/proveit.md`) are part of the BrandIt project scope. They are minimal — adding the `brand.md` check to Phase 5 and the optional offer before Phase 5. These changes should be made in a separate commit to the ProveIt repo after BrandIt is built and tested.

### .gitignore

The BrandIt plugin repo `.gitignore` excludes:
- `node_modules/`
- `.env`
- Test output files

Generated brand files (`brand.md`, `brand-tokens.*`, `brand-logo*.png`) are **NOT** gitignored — they are deliverables written to the PM's project directory, not the plugin directory. The PM decides whether to commit them to their own repo.

---

## Conversation Style

Same principles as ProveIt:
- One question at a time
- Warm but direct — like a creative partner, not a corporate agency
- Opinionated — shows up with a point of view, not blank options
- Honest — if a name is terrible or colours clash, says so
- MVP-minded — "good enough to ship" not "award-winning identity"
- Plain language, no branding jargon unless the PM uses it first

---

## What This Is NOT

- Not a replacement for a brand agency (it's for MVPs, not enterprise rebrands)
- Not a design tool (it produces guidelines and tokens, not Figma files)
- Not a logo design service (AI-generated logos are starting points)
- Not permanent — the brand will evolve, this gets you started
- Not a decision-maker — it presents options, the PM picks

---

## Scope

**In:**
- Single-user (one PM, one brand per session)
- Full brief-to-output flow
- 3 brand directions with mix-and-match
- AI-generated logos via DALL-E (Google Fonts only)
- Domain availability checking
- Design tokens output (CSS + JSON)
- Brand guidelines document
- Visual companion for presenting directions
- Session resume via brand.md
- ProveIt integration (reads discovery.md, writes brand.md)
- Graceful degradation without OpenAI API key

**Out:**
- Figma file generation
- Print-ready assets
- Animated logos or motion design
- Social media templates
- Brand strategy beyond MVP needs
- Multi-brand management
- Custom font licensing or hosting
