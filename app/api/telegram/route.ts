import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT } from "@/lib/frontier-data";
import { fetchFrontierTowerEvents, formatEventsForPrompt } from "@/lib/luma";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const TG = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message = body?.message;
    if (!message?.text || !message?.chat?.id) return NextResponse.json({ ok: true });

    const chatId = message.chat.id;
    const userText = message.text;

    // Send "typing" indicator immediately
    fetch(`${TG}/sendChatAction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, action: "typing" }),
    }).catch(() => {});

    let eventsContext = "";
    try {
      const events = await fetchFrontierTowerEvents();
      if (events.length > 0) eventsContext = `\n\n## LIVE EVENTS\n${formatEventsForPrompt(events)}`;
    } catch {}

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
