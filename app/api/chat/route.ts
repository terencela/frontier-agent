import Anthropic from "@anthropic-ai/sdk";
import { fetchFrontierTowerEvents, formatEventsForPrompt } from "@/lib/luma";
import { SYSTEM_PROMPT } from "@/lib/frontier-data";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response("ANTHROPIC_API_KEY not set. Add it to .env.local", { status: 500 });
  }

  const { messages } = await req.json();
  const client = new Anthropic({ apiKey });

  // Fetch live events and inject into context
  const events = await fetchFrontierTowerEvents();
  const eventsBlock = `\n\n## LIVE EVENTS (scraped now from lu.ma/frontiertower)\n${formatEventsForPrompt(events)}`;
  const systemWithEvents = SYSTEM_PROMPT + eventsBlock;

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        const stream = await client.messages.stream({
          model: "claude-sonnet-4-5",
          max_tokens: 1024,
          system: systemWithEvents,
          messages: messages.map((m: { role: string; content: string }) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
        });

        for await (const chunk of stream) {
          if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(chunk.delta.text));
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        controller.enqueue(encoder.encode(`Error: ${msg}`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
