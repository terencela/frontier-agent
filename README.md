# Frontier Tower Agent

> **The building that talks back.** A conversational AI agent for [Frontier Tower](https://frontiertower.io) — a 16-floor vertical village in San Francisco where 700+ builders across AI, biotech, Ethereum, robotics, and the arts share one address: 995 Market Street.

**[Live Demo](https://frontier-agent.vercel.app)** · **[Frontier Tower](https://frontiertower.io)**

---

## The Problem

700 people. 16 floors. 8 self-governing treasuries. Events every night. A BSL-2 wet lab on Floor 8, laser cutters on Floor 7, GPU compute on Floor 9, a recording studio on Floor 6. Cold plunge on Floor 5. The Ethereum Foundation on Floor 12.

Nobody knows what's happening across the building. New members are lost. Resources go unused. Collaborators who should meet never do. Floor treasuries sit unspent because residents don't know how to propose.

**Frontier Tower Agent fixes this in one conversation.**

## What It Does

Open it. Ask anything. Get a real answer — not a wiki dump.

- **"What's happening tonight?"** — Pulls live events from [lu.ma/frontiertower](https://lu.ma/frontiertower) via Unbrowse, gives you the top picks
- **"I just joined, where should I go?"** — Asks what you're into, recommends 2-3 floors that matter to you
- **"Where's the laser cutter?"** — Floor 7, book through Tony Loehr, free for members
- **"How do I get funding for my project?"** — Walks you through the treasury proposal process step by step
- **"Who's working on multi-agent systems?"** — Points you to Floor 9 and the right people
- **Every answer ends with a follow-up question** — it keeps the conversation going, like a good concierge

Listen to any response out loud via **ElevenLabs voice synthesis** — one tap.

## Architecture

```
User (text or voice)
        │
        ▼
┌───────────────────────┐
│   Next.js Frontend    │   Mobile-first chat interface
│   (Streaming UI)      │   ElevenLabs TTS playback
└───────┬───────────────┘
        │
        ▼
┌───────────────────────┐
│   Claude Sonnet 4     │   Conversational AI brain
│   (Anthropic API)     │   Short, direct, follow-up questions
└───────┬───────────────┘
        │
        ▼
┌───────────────────────┐
│   Data Layer          │
│                       │
│   Unbrowse ──► Luma   │   Live events from lu.ma/frontiertower
│   Building KB         │   16 floors, resources, governance, people
└───────────────────────┘
```

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| AI | [Claude Sonnet 4](https://anthropic.com) | Conversational intelligence with streaming |
| Voice | [ElevenLabs](https://elevenlabs.io) | Text-to-speech for voice responses |
| Data | [Unbrowse](https://unbrowse.ai) | Live event extraction from Luma |
| Frontend | [Next.js 16](https://nextjs.org) + Tailwind | Mobile-first dark UI |
| Deploy | [Vercel](https://vercel.com) | Production hosting |

## Quick Start

```bash
git clone https://github.com/terencela/frontier-agent.git
cd frontier-agent
npm install
cp .env.local.example .env.local   # add your keys
npm run dev                         # → http://localhost:3000
```

## Environment Variables

```
ANTHROPIC_API_KEY=sk-ant-...       # Claude Sonnet 4
ELEVENLABS_API_KEY=sk_...          # Voice synthesis
UNBROWSE_URL=https://api.unbrowse.ai  # Optional: custom Unbrowse endpoint
```

## Prize Tracks

| Track | How We Use It |
|-------|---------------|
| **Frontier Tower Agent** | The core product — conversational agent residents actually talk to |
| **ElevenLabs** | Voice TTS on every response — listen instead of read |
| **Unbrowse** | Live event data layer from lu.ma/frontiertower |
| **human.tech** | Human-first coordination for community governance |

## What Makes This Different

Other submissions build infrastructure. We built something **residents open and use today**.

- **Short, conversational responses** — not walls of text
- **Always asks a follow-up** — keeps the conversation going
- **Live events** — not static data
- **Voice output** — listen while walking between floors
- **Mobile-first** — because residents are on their phones in the elevator

## Deploy

```bash
vercel --prod
```

Set `ANTHROPIC_API_KEY` and `ELEVENLABS_API_KEY` in Vercel environment variables.

---

Built for [Intelligence at the Frontier](https://intelligence-at-the-frontier-hackathon.devspot.app) · March 2026 · Frontier Tower, San Francisco
