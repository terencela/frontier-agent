import Anthropic from "@anthropic-ai/sdk";
import { fetchFrontierTowerEvents, formatEventsForPrompt } from "@/lib/luma";
import { SYSTEM_PROMPT } from "@/lib/frontier-data";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return new Response("Missing ANTHROPIC_API_KEY", { status: 500 });

  const { messages } = await req.json();
  const events = await fetchFrontierTowerEvents();
  const system = SYSTEM_PROMPT + `\n\nLIVE EVENTS:\n${formatEventsForPrompt(events)}`;

  try {
    const client = new Anthropic({ apiKey });
    // Non-streaming first to debug
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system,
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    });
    const text = response.content[0].type === "text" ? response.content[0].text : "";
    return new Response(text, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
  } catch (err) {
    const error = err as Error & { status?: number; error?: unknown };
    const detail = JSON.stringify({ msg: error.message, status: error.status, error: error.error });
    return new Response(`Debug: ${detail}`, { status: 500 });
  }
}
