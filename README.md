# Frontier Tower Agent

> **The building that talks back.** An AI concierge for [Frontier Tower](https://frontiertower.io) — 16 floors, 700+ members, one address: 995 Market St, San Francisco.

**[Try the Live Demo](https://frontier-agent.vercel.app)**

---

## Why This Exists

Frontier Tower is a vertical village: AI researchers on Floor 9, the Ethereum Foundation on Floor 12, a BSL-2 wet lab on Floor 8, laser cutters on Floor 7, a gym with cold plunge on Floor 5, and a music studio on Floor 6.

The problem? **Nobody knows what's happening across the building.** New members are lost. Resources go unused. Collaborators who should meet never do. Floor treasuries sit unspent because nobody knows how to propose.

**This agent fixes all of that in one conversation.**

## How It Works

You open the app. You pick your role (builder, investor, creative, researcher) or type a question. The agent responds in seconds — short, direct, with a follow-up to keep you going. Tap any response to hear it spoken aloud via ElevenLabs voice synthesis.

**What you can ask:**

| Question | What Happens |
|----------|-------------|
| *"What's happening tonight?"* | Pulls **live events** from [lu.ma/frontiertower](https://lu.ma/frontiertower) via Unbrowse |
| *"I just joined — where do I start?"* | Personalized onboarding based on your interests |
| *"Where's the laser cutter?"* | Floor 7, book through Tony Loehr, free for members |
| *"How do I get treasury funding?"* | Step-by-step proposal walkthrough |
| *"Who's working on multi-agent AI?"* | Points you to Floor 9 and the right people |

Every response is conversational — not a wiki dump. Every response ends with a follow-up question to keep the conversation moving.

## Features

- **Guided onboarding** — Pick your role, explore floors, browse example questions before typing anything
- **Live events** — Real-time event data from Luma via [Unbrowse](https://unbrowse.ai)
- **Voice synthesis** — Every response can be spoken aloud via [ElevenLabs](https://elevenlabs.io) TTS
- **All 16 floors** — Deep knowledge of every community, resource, and contact person
- **Governance guide** — How to propose, vote, and fund through floor treasuries
- **Cross-floor matching** — Find collaborators across AI, biotech, crypto, robotics, and arts
- **Mobile-first** — Works on your phone while you're in the elevator

## Architecture

```
User
 │
 ├── Onboarding Screen ──► Role selection, floor explorer, example questions
 │
 ├── Text Chat ──► Claude Sonnet 4 (streaming) ──► Short, conversational responses
 │
 ├── Voice Output ──► ElevenLabs TTS ──► Hear any response spoken aloud
 │
 └── Live Data ──► Unbrowse ──► lu.ma/frontiertower (real-time events)
                ──► Building KB ──► 16 floors, resources, governance, contacts
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| AI | [Claude Sonnet 4](https://anthropic.com) — streaming conversational intelligence |
| Voice | [ElevenLabs](https://elevenlabs.io) — text-to-speech synthesis |
| Data | [Unbrowse](https://unbrowse.ai) — live event extraction from Luma |
| Frontend | [Next.js 16](https://nextjs.org) + Tailwind CSS |
| Deploy | [Vercel](https://vercel.com) |

## Prize Tracks

| Track | Integration |
|-------|-------------|
| **Frontier Tower Agent** | Core conversational agent for 700+ residents |
| **ElevenLabs** | Voice synthesis on every response |
| **Unbrowse** | Live event data layer from lu.ma/frontiertower |
| **human.tech** | Human-first community coordination |

## Quick Start

```bash
git clone https://github.com/terencela/frontier-agent.git
cd frontier-agent
npm install
cp .env.local.example .env.local   # add API keys
npm run dev                         # http://localhost:3000
```

## Environment Variables

```
ANTHROPIC_API_KEY=sk-ant-...          # Required: Claude Sonnet 4
ELEVENLABS_API_KEY=sk_...             # Required: ElevenLabs TTS
UNBROWSE_URL=https://api.unbrowse.ai  # Optional: Unbrowse endpoint
```

## What Makes This Different

Other hackathon submissions build infrastructure nobody uses. **We built something residents open today.**

- **Guided UX** — Role selection, floor explorer, and example questions so nobody stares at an empty chatbot
- **Short responses** — 3-5 sentences, not walls of text
- **Follow-up questions** — The agent drives the conversation, not just the user
- **Live data** — Real events, not static JSON
- **Voice** — Hear responses while walking between floors

## The Floor Directory

| Floor | Community | Resources |
|-------|-----------|-----------|
| 16 | d/acc Lounge | Networking, panoramic views |
| 15 | Library | Deep work, coworking |
| 14 | Human Flourishing | Workshops, community kitchen |
| 12 | Ethereum House | DeFi, validator node, ETH Foundation |
| 11 | Health & Longevity | Biomarkers, aging research |
| 10 | Frontier Accelerator | VCs, investor meetings |
| 9 | AI & Autonomous | LLMs, GPU compute, multi-agent |
| 8 | Neuro & Biotech | BSL-2 wet lab, gene editing |
| 7 | Maker Space | Laser cutters, CNC, 3D printers |
| 6 | Arts & Music | Recording studio, installations |
| 5 | Fitness | Gym, yoga, sauna, cold plunge |
| 4 | Robotics | Hardware prototyping |
| 3 | Private Offices | Teams up to 20 |
| 2 | The Spaceship | 200+ capacity events |

## Deploy

```bash
vercel --prod
```

Add `ANTHROPIC_API_KEY` and `ELEVENLABS_API_KEY` to Vercel environment variables.

---

Built for [Intelligence at the Frontier](https://intelligence-at-the-frontier-hackathon.devspot.app) · March 2026 · San Francisco
