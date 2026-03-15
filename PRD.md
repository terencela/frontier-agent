# Pulse — Frontier Tower Agent PRD

**What:** Conversational AI agent for Frontier Tower's 700+ residents.
**Prize tracks:** Frontier Tower (primary) · Unbrowse · Human.tech

## The Problem
700 people, 16 floors, zero shared visibility. Residents can't find events, resources, collaborators, or governance info. Existing solution (miro-ku) requires Orchestra platform setup. Ours opens instantly in a browser.

## The Agent Solves All 6 Pain Points
1. **Onboarding** — "I just joined, what is this place?" → full building tour
2. **Cross-floor matching** — "Who works on computer vision here?" → relevant people + floors
3. **Events** — "What's happening tonight?" → live Luma events (scraped in real-time)
4. **Resources** — "Where's the laser cutter?" → Floor 7 Maker Space, booking info
5. **Governance** — "How do I propose something to the treasury?" → step-by-step guide
6. **Building pulse** — "What's the vibe right now?" → active floors + top events

## Stack
- Next.js 15 (App Router)
- Claude claude-sonnet-4-5 via Anthropic SDK (streaming)
- Luma scraper (public calendar, no auth)
- Tailwind CSS — factory.ai dark aesthetic
- Vercel deployment

## Design
Dark, minimal, 2026. Inspired by factory.ai: #0A0A0A background, clean white type,
no gradients, subtle borders. Feels like a real tool not a toy.

## Credentials Required
- `ANTHROPIC_API_KEY` from console.anthropic.com — the only one needed
