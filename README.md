# Frontier Tower Agent

A conversational AI agent for [Frontier Tower](https://frontiertower.io), a 16-floor innovation hub at 995 Market Street, San Francisco. The agent serves 700+ residents with real-time building intelligence, cross-floor coordination, and voice interaction.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Resident                           │
│            (text or voice)                          │
└──────────┬──────────────────────┬───────────────────┘
           │                      │
      Text Chat              Voice Query
           │                      │
           ▼                      ▼
┌──────────────────┐    ┌─────────────────────┐
│  Chat Interface  │    │  Voice Interface     │
│  (Next.js)       │    │  (ElevenLabs TTS)    │
│                  │    │                      │
│  Streaming       │    │  Text-to-Speech      │
│  Claude Sonnet 4 ◄────┤  Natural Voice       │
│  Live Context    │    │  Real-time Audio     │
└──────────────────┘    └─────────────────────┘
           │
           ▼
┌──────────────────┐
│  Data Layer      │
│                  │
│  Unbrowse        │──► lu.ma/frontiertower
│  (Live Events)   │    (real-time event data)
│                  │
│  Building KB     │──► 16 floors, resources,
│  (Static)        │    governance, community
└──────────────────┘
```

## What It Solves

Frontier Tower has 700+ members across 16 themed floors — AI, biotech, Ethereum, robotics, arts, longevity, and more. The building runs a live governance experiment with 8+ floor treasuries. This agent is the building's brain:

| Problem | How the Agent Solves It |
|---------|----------------------|
| **Onboarding** — new members have zero building context | Personalized floor-by-floor orientation with resource highlights |
| **Cross-floor matching** — skills and collaborators don't find each other | Searches across all 16 communities by interest, skill, or project |
| **Event coordination** — events scattered across Luma, Discord, Slack | Live event feed via Unbrowse integration with lu.ma/frontiertower |
| **Bounty routing** — infrastructure work goes unfunded | Guides members through treasury proposal process step by step |
| **Governance** — floor leads making decisions without visibility | Explains treasury mechanics, tracks proposals, surfaces priorities |
| **Building pulse** — no live view of what's happening | Real-time picture of activity, events, and community energy |

## Prize Tracks

| Track | Integration |
|-------|-------------|
| **Frontier Tower Agent** | Core conversational agent for building coordination |
| **ElevenLabs** | Voice TTS for natural spoken interaction |
| **Unbrowse** | Live event data retrieval from lu.ma/frontiertower |
| **human.tech** | Human coordination, governance, and community building |

## Tech Stack

- **Next.js 16** — App Router with streaming responses
- **Claude Sonnet 4** — Conversational AI via Anthropic SDK
- **ElevenLabs** — Text-to-speech for voice responses
- **Unbrowse** — Reverse-engineers Luma's internal API for live event data
- **Tailwind CSS** — Dark, minimal interface design
- **Vercel** — Edge deployment

## Project Structure

```
frontier-agent/
├── app/
│   ├── api/
│   │   ├── chat/route.ts      # Claude Sonnet 4 streaming chat
│   │   └── voice/route.ts     # ElevenLabs TTS endpoint
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   └── chat.tsx               # Chat interface with voice support
├── lib/
│   ├── frontier-data.ts       # Building knowledge base (16 floors)
│   └── luma.ts                # Unbrowse + direct Luma event scraper
├── PRD.md                     # Product requirements document
└── README.md
```

## Quick Start

```bash
git clone https://github.com/terencela/frontier-agent.git
cd frontier-agent
npm install
cp .env.local.example .env.local
# Add your API keys to .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

```
ANTHROPIC_API_KEY=sk-ant-...       # Claude Sonnet 4
ELEVENLABS_API_KEY=sk_...          # ElevenLabs TTS
```

## How It Works

### Text Interface
1. Resident opens the web interface
2. Types any question about the building
3. Claude Sonnet 4 responds with deep building knowledge
4. Live events are fetched from Luma via Unbrowse on every query

### Voice Interface
1. Agent generates text response via Claude
2. Response is sent to ElevenLabs TTS endpoint
3. Natural speech audio streams back to the resident
4. Supports any question — events, resources, governance, onboarding

### Live Event Data (Unbrowse)
1. On each query, Unbrowse reverse-engineers lu.ma/frontiertower
2. Extracts upcoming events with titles, times, locations, and RSVP counts
3. Injects live event context into Claude's system prompt
4. Falls back to direct HTTP scraping if Unbrowse is unavailable

## Key Features

- **Smart Onboarding** — Floor-specific orientation with resource highlights and community intros
- **Cross-Floor Matching** — Find collaborators by skill, interest, or project across all 16 floors
- **Live Events** — Real-time event calendar powered by Unbrowse + lu.ma integration
- **Resource Discovery** — Laser cutters, BSL-2 lab, GPU compute, recording studio — knows where everything is
- **Governance Guide** — Step-by-step treasury proposal process for all 8+ floor treasuries
- **Voice Interaction** — Natural speech responses via ElevenLabs TTS
- **Building Pulse** — Real-time picture of activity across the tower

## Floor Directory

| Floor | Theme | Key Resources |
|-------|-------|---------------|
| 16 | d/acc Lounge | Cross-pollination, panoramic views |
| 15 | Library & Coworking | Deep work, focus sessions |
| 14 | Human Flourishing | Sense-making, embodied workshops |
| 12 | Ethereum House | Blockchain, DeFi, validator node |
| 11 | Health & Longevity | Biomarker tracking, aging research |
| 10 | Frontier Accelerator | VCs, startups, investor meetings |
| 9 | AI & Autonomous Systems | LLMs, multi-agent, GPU compute |
| 8 | Neuro & Biotech | BSL-2 lab, gene editing |
| 7 | Maker Space | Laser cutters, CNC, 3D printers |
| 6 | Arts & Music | Recording studio, installations |
| 5 | Movement & Fitness | Gym, yoga, sauna, cold plunge |
| 4 | Robotics & Hard Tech | Hardware prototyping |
| 3 | Private Offices | Team spaces up to 20 people |
| 2 | Events (The Spaceship) | 200+ capacity, AV setup |

## Deploy

```bash
vercel --prod
```

Set `ANTHROPIC_API_KEY` and `ELEVENLABS_API_KEY` in Vercel environment variables.

## Built With

- [Anthropic Claude Sonnet 4](https://anthropic.com) — LLM with streaming
- [ElevenLabs](https://elevenlabs.io) — Text-to-speech
- [Unbrowse](https://unbrowse.ai) — API-native web data extraction
- [Next.js](https://nextjs.org) — React framework
- [Vercel](https://vercel.com) — Deployment platform

## Built For

Intelligence at the Frontier Hackathon — March 2026 — Frontier Tower, San Francisco
