import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT } from "@/lib/frontier-data";
import { fetchFrontierTowerEvents, formatEventsForPrompt } from "@/lib/luma";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function sendTelegram(chatId: number, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) { console.error("TELEGRAM_BOT_TOKEN missing"); return; }
  const plain = text.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\*([^*]+)\*/g, "$1");
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: plain }),
  });
  const data = await res.json();
  if (!data.ok) console.error("Telegram sendMessage failed:", JSON.stringify(data));
}

async function processMessage(chatId: number, userText: string) {
  let eventsContext = "";
  try {
    const events = await fetchFrontierTowerEvents();
    if (events.length > 0) eventsContext = `\n\n## LIVE EVENTS\n${formatEventsForPrompt(events)}`;
  } catch {}

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 300,
    system: SYSTEM_PROMPT + eventsContext,
    messages: [{ role: "user", content: userText }],
  });

  const reply = response.content[0].type === "text" ? response.content[0].text : "Something went wrong.";
  await sendTelegram(chatId, reply);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message = body?.message;
    if (!message?.text || !message?.chat?.id) return NextResponse.json({ ok: true });

    const chatId = message.chat.id;
    const userText = message.text;

    // Respond to Telegram immediately (required within 10s)
    // Process Claude in background using waitUntil if available, else fire-and-forget
    const ctx = (req as NextRequest & { waitUntil?: (p: Promise<unknown>) => void });
    if (ctx.waitUntil) {
      ctx.waitUntil(processMessage(chatId, userText));
    } else {
      processMessage(chatId, userText).catch(console.error);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Telegram webhook error:", e);
    return NextResponse.json({ ok: true });
  }
}
