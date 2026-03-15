import { execSync } from "child_process";
import path from "path";

export interface LumaEvent {
  title: string;
  date: string;
  time: string;
  location: string;
  url: string;
}

// Try Unbrowse first (prize track), fall back to direct fetch
export async function fetchFrontierTowerEvents(): Promise<LumaEvent[]> {
  const unbrowseResult = await tryUnbrowse();
  if (unbrowseResult.length > 0) return unbrowseResult;
  return await directFetch();
}

async function tryUnbrowse(): Promise<LumaEvent[]> {
  try {
    const bin = path.join(process.cwd(), "node_modules", ".bin", "unbrowse");
    const result = execSync(
      `${bin} resolve --intent "list all upcoming events with title time and location" --url "https://lu.ma/frontiertower"`,
      { timeout: 12000, encoding: "utf8" }
    );
    // Unbrowse returns JSON or text — parse what we can
    const lines = result.split("\n").filter(Boolean);
    const events: LumaEvent[] = [];
    for (const line of lines) {
      try {
        const obj = JSON.parse(line);
        if (obj.title || obj.name) {
          events.push({
            title: obj.title || obj.name || "",
            date: obj.date || obj.startAt || "Upcoming",
            time: obj.time || obj.startTime || "",
            location: obj.location || obj.venue || "Frontier Tower",
            url: obj.url || obj.registrationUrl || "https://lu.ma/frontiertower",
          });
        }
      } catch {
        // not JSON, skip
      }
    }
    return events;
  } catch {
    return [];
  }
}

async function directFetch(): Promise<LumaEvent[]> {
  try {
    const res = await fetch("https://lu.ma/frontiertower", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        Accept: "text/html",
      },
      next: { revalidate: 300 },
    });
    if (!res.ok) return getFallback();
    const html = await res.text();
    const events: LumaEvent[] = [];
    const blocks = html.split('href="https://luma.com/');
    let date = "Upcoming";

    for (let i = 1; i < blocks.length && events.length < 12; i++) {
      const b = blocks[i];
      const slug = (b.match(/^([^"]+)"/) || [])[1];
      const title = (b.match(/<h3[^>]*>\s*([^<]{3,100})\s*<\/h3>/) || [])[1]?.trim();
      if (!title || !slug) continue;
      if (/placeholder|hold -/i.test(title)) continue;
      const time = (b.match(/(\d{1,2}:\d{2}\s*(?:AM|PM))/i) || [])[1] || "";
      const loc = (b.match(/Frontier Tower @\s*([^<\n,]+?)(?:\s*995|\s*Market|\s*San)/i) || [])[1];
      events.push({
        title,
        date,
        time,
        location: loc ? `Frontier Tower @ ${loc.trim()}` : "Frontier Tower",
        url: `https://luma.com/${slug}`,
      });
    }
    return events.length > 0 ? events : getFallback();
  } catch {
    return getFallback();
  }
}

function getFallback(): LumaEvent[] {
  return [
    { title: "Intelligence at the Frontier Hackathon", date: "Today Mar 14–15", time: "All Day", location: "Frontier Tower — All Floors", url: "https://lu.ma/frontiertower" },
    { title: "GDC Esports Games — STAKENSLAY", date: "Today", time: "7:00 PM", location: "Frontier Tower @ Makerspace", url: "https://luma.com/gdc-esports-games-stakenslay" },
    { title: "AI and Contemporary Nihilism Salon", date: "Tomorrow Mar 15", time: "6:00 PM", location: "Frontier Tower @ Human Flourishing Floor", url: "https://luma.com/why-not-brain-rot-ai-and-contemporary-ni" },
    { title: "Town Hall 3 — Members Only", date: "Tomorrow Mar 15", time: "5:30 PM", location: "Frontier Tower @ Spaceship", url: "https://luma.com/town-hall-3-placeholder" },
    { title: "Half Ripe — Live Music", date: "Tomorrow Mar 15", time: "6:00 PM", location: "Frontier Tower @ Arts and Music Floor", url: "https://luma.com/half-ripe-8828" },
  ];
}

export function formatEventsForPrompt(events: LumaEvent[]): string {
  if (!events.length) return "No upcoming events found.";
  return events.map((e) => `• ${e.date}${e.time ? " at " + e.time : ""} — ${e.title} (${e.location})`).join("\n");
}
