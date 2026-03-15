# Pulse — Frontier Tower Agent

The AI agent for Frontier Tower's 700+ residents. Ask it anything about the building.

**Live at:** [pulse-frontier.vercel.app](https://pulse-frontier.vercel.app)

## What it solves

1. **Onboarding** — New members get a full building orientation instantly
2. **Cross-floor matching** — Find collaborators, skills, and resources across all 16 floors
3. **Live events** — Pulls real-time events from lu.ma/frontiertower
4. **Resources** — Laser cutters, labs, studios, GPU compute — knows where everything is
5. **Governance** — How to propose ideas to floor treasuries, step by step
6. **Building pulse** — Real-time picture of what's happening across the tower

## Stack

- **Next.js 15** — App Router, streaming responses
- **Claude claude-sonnet-4-5** — Conversational AI via Anthropic SDK
- **Luma scraper** — Live event data from lu.ma/frontiertower (no API key needed)
- **Tailwind CSS** — Dark, minimal 2026 design
- **Vercel** — Zero-config deployment

## Run locally

```bash
cp .env.local.example .env.local
# Add your ANTHROPIC_API_KEY
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deploy

```bash
npx vercel --prod
```

Set `ANTHROPIC_API_KEY` in Vercel environment variables.

## Built for

Intelligence at the Frontier Hackathon · March 2026 · Frontier Tower, SF
