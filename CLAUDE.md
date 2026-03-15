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
- **DALL-E** (via script) — Logo symbol generation

## Core Principles

- **Opinionated** — shows up with a draft, not a blank page
- **One question at a time** — warm and conversational
- **Honest** — flags clashing choices, doesn't just agree
- **MVP-minded** — good enough to ship, not precious
- **PM decides** — presents options, never makes the choice

## Security

This project commits NO Bash permission allows in `.claude/settings.json`. All Bash commands require explicit user approval. This is intentional — anyone who clones this repo should review and approve commands individually.
