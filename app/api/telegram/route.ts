import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT } from "@/lib/frontier-data";
import { fetchFrontierTowerEvents, formatEventsForPrompt } from "@/lib/luma";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function sendTelegram(chatId: number, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message = body?.message;
    if (!message?.text || !message?.chat?.id) return NextResponse.json({ ok: true });

    const chatId = message.chat.id;
    const userText = message.text;

    // Fetch live events for context
    let eventsContext = "";
    try {
      const events = await fetchFrontierTowerEvents();
      eventsContext = events.length > 0
        ? `\n\n## LIVE EVENTS RIGHT NOW\n${formatEventsForPrompt(events)}`
        : "";
    } catch {}

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 400,
      system: SYSTEM_PROMPT + eventsContext,
      messages: [{ role: "user", content: userText }],
    });

    const reply = response.content[0].type === "text" ? response.content[0].text : "Something went wrong.";
    await sendTelegram(chatId, reply);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Telegram webhook error:", e);
    return NextResponse.json({ ok: true });
  }
}
