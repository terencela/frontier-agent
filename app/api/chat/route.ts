import Anthropic from "@anthropic-ai/sdk";
import { fetchFrontierTowerEvents, formatEventsForPrompt } from "@/lib/luma";
import { SYSTEM_PROMPT } from "@/lib/frontier-data";

export const runtime = "nodejs";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: Request) {
  const { messages } = await req.json();

  // Always fetch live events to inject into system context
  const events = await fetchFrontierTowerEvents();
  const eventsContext = events.length
    ? `\n\n## LIVE EVENTS (fetched now from lu.ma/frontiertower)\n${formatEventsForPrompt(events)}`
    : "";

  const systemWithEvents = SYSTEM_PROMPT + eventsContext;

  const stream = await client.messages.stream({
    model: "claude-sonnet-4-5",
    max_tokens: 1024,
    system: systemWithEvents,
    messages: messages.map((m: { role: string; content: string }) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(chunk.delta.text));
          }
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
