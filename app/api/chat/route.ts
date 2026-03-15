import Anthropic from "@anthropic-ai/sdk";
import { fetchFrontierTowerEvents, formatEventsForPrompt } from "@/lib/luma";
import { SYSTEM_PROMPT } from "@/lib/frontier-data";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const { messages } = await req.json();

  const events = await fetchFrontierTowerEvents();
  const system = SYSTEM_PROMPT + `\n\nLIVE EVENTS from lu.ma/frontiertower:\n${formatEventsForPrompt(events)}`;

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        const stream = await client.messages.stream({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1024,
          system,
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
        controller.enqueue(encoder.encode(`Error: ${err instanceof Error ? err.message : String(err)}`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
