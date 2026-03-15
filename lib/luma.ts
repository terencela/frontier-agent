export interface LumaEvent {
  title: string;
  date: string;
  time: string;
  location: string;
  url: string;
}

export async function fetchFrontierTowerEvents(): Promise<LumaEvent[]> {
  try {
    const res = await fetch("https://lu.ma/frontiertower", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
      next: { revalidate: 300 },
    });

    if (!res.ok) return getFallbackEvents();
    const html = await res.text();

    const events: LumaEvent[] = [];

    // Extract event data from Luma's HTML
    // Pattern: find event containers with title and time
    const eventBlocks = html.split('href="https://luma.com/');

    let currentDate = "Upcoming";
    // Find date headers in the page
    const dateMatches = html.match(/(Today|Tomorrow|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d*,?\s*\d{4}?/gi) || [];

    for (let i = 1; i < eventBlocks.length && events.length < 15; i++) {
      const block = eventBlocks[i];

      // Extract URL slug
      const slugMatch = block.match(/^([^"]+)"/);
      if (!slugMatch) continue;
      const slug = slugMatch[1];

      // Extract title from h3
      const titleMatch = block.match(/<h3[^>]*>\s*([^<]{3,100})\s*<\/h3>/);
      if (!titleMatch) continue;
      const title = titleMatch[1].trim();

      // Skip placeholder/private events
      if (title.toLowerCase().includes("placeholder") || title.toLowerCase().includes("hold -")) continue;

      // Extract time
      const timeMatch = block.match(/(\d{1,2}:\d{2}\s*(?:AM|PM))/i);
      const time = timeMatch ? timeMatch[1] : "";

      // Extract location
      const locMatch = block.match(/Frontier Tower @\s*([^<\n,]+?)(?:\s*995|\s*Market|\s*San)/i);
      const location = locMatch ? `Frontier Tower @ ${locMatch[1].trim()}` : "Frontier Tower";

      events.push({
        title,
        date: currentDate,
        time,
        location,
        url: `https://luma.com/${slug}`,
      });
    }

    return events.length > 0 ? events : getFallbackEvents();
  } catch {
    return getFallbackEvents();
  }
}

function getFallbackEvents(): LumaEvent[] {
  return [
    {
      title: "Intelligence at the Frontier — Hackathon",
      date: "Today (Mar 14-15)",
      time: "All Day",
      location: "Frontier Tower — All Floors",
      url: "https://lu.ma/frontiertower",
    },
    {
      title: "GDC Esports Games — STAKENSLAY",
      date: "Today",
      time: "7:00 PM",
      location: "Frontier Tower @ Makerspace",
      url: "https://luma.com/gdc-esports-games-stakenslay",
    },
    {
      title: "Why Not Brain Rot: AI and Contemporary Nihilism Salon",
      date: "Tomorrow (Mar 15)",
      time: "6:00 PM",
      location: "Frontier Tower @ Human Flourishing Floor",
      url: "https://luma.com/why-not-brain-rot-ai-and-contemporary-ni",
    },
    {
      title: "Town Hall 3 — Members Only",
      date: "Tomorrow (Mar 15)",
      time: "5:30 PM",
      location: "Frontier Tower @ Spaceship",
      url: "https://luma.com/town-hall-3-placeholder",
    },
    {
      title: "Half Ripe — Live Music",
      date: "Tomorrow (Mar 15)",
      time: "6:00 PM",
      location: "Frontier Tower @ Arts and Music Floor",
      url: "https://luma.com/half-ripe-8828",
    },
  ];
}

export function formatEventsForPrompt(events: LumaEvent[]): string {
  if (!events.length) return "No upcoming events found on lu.ma/frontiertower.";
  return events.map((e) => `• ${e.date}${e.time ? " at " + e.time : ""} — ${e.title} (${e.location})`).join("\n");
}
