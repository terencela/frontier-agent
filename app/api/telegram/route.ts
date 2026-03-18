import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT } from "@/lib/frontier-data";
import { formatEventsForPrompt } from "@/lib/luma";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const TG = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

// Hardcoded events — skip Unbrowse/Luma fetch to avoid 12s timeout killing the function
const EVENTS_CONTEXT = formatEventsForPrompt([
  { title: "AI Paper Reading Club - Week 7", date: "Mar 17", time: "5:00 PM", location: "Floor 9 Annex", url: "https://lu.ma/frontiertower" },
  { title: "Why Not Brain Rot: AI and Contemporary Nihilism Salon", date: "Mar 17", time: "6:00 PM", location: "Floor 14", url: "https://lu.ma/frontiertower" },
  { title: "Half Ripe — Live Music", date: "Mar 17", time: "6:00 PM", location: "Floor 6", url: "https://lu.ma/frontiertower" },
  { title: "Town Hall #3 — Members Only", date: "Mar 18", time: "5:30 PM", location: "Floor 2", url: "https://lu.ma/frontiertower" },
  { title: "14th Floor New Member Happy Hour", date: "Mar 19", time: "6:00 PM", location: "Floor 14", url: "https://lu.ma/frontiertower" },
  { title: "Frontier Tower Open Day", date: "Mar 20", time: "1:00 PM", location: "Floor 2", url: "https://lu.ma/frontiertower" },
]);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message = body?.message;
    if (!message?.text || !message?.chat?.id) return NextResponse.json({ ok: true });

    const chatId = message.chat.id;
    const userText = message.text;

    fetch(`${TG}/sendChatAction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, action: "typing" }),
    }).catch(() => {});

    const eventsContext = `\n\n## LIVE EVENTS\n${EVENTS_CONTEXT}`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 250,
      system: SYSTEM_PROMPT + eventsContext,
      messages: [{ role: "user", content: userText }],
    });

    const reply = response.content[0].type === "text"
      ? response.content[0].text.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\*([^*]+)\*/g, "$1")
      : "Something went wrong.";

    await fetch(`${TG}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: reply }),
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Telegram webhook error:", e);
    return NextResponse.json({ ok: true });
  }
}
