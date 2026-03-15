export interface LumaEvent {
  title: string;
  date: string;
  time: string;
  location: string;
  url: string;
}

// Try Unbrowse HTTP API first (localhost:6969), then direct fetch
export async function fetchFrontierTowerEvents(): Promise<LumaEvent[]> {
  const unbrowseResult = await tryUnbrowseHttp();
  if (unbrowseResult.length > 0) return unbrowseResult;
  return await directFetch();
}

async function tryUnbrowseHttp(): Promise<LumaEvent[]> {
  try {
    // Unbrowse runs local server on localhost:6969 — works for local demo
    const res = await fetch("http://localhost:6969/v1/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        intent: "list all upcoming events with title, date, time, location, and URL",
        url: "https://lu.ma/frontiertower",
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    // Parse whatever Unbrowse returns
    const items: LumaEvent[] = [];
    const list = data?.results || data?.events || data?.data || (Array.isArray(data) ? data : []);
    for (const item of list.slice(0, 12)) {
      if (!item?.title && !item?.name) continue;
      items.push({
        title: item.title || item.name || "",
        date: item.date || item.startAt || item.start_at || "Upcoming",
        time: item.time || item.startTime || item.start_time || "",
        location: item.location || item.venue || "Frontier Tower",
        url: item.url || item.registrationUrl || item.registration_url || "https://lu.ma/frontiertower",
      });
    }
    return items;
  } catch {
    return [];
  }
}

async function directFetch(): Promise<LumaEvent[]> {
  try {
    const res = await fetch("https://lu.ma/frontiertower", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
      next: { revalidate: 300 },
    });
    if (!res.ok) return getFallback();
    const html = await res.text();

    // Try JSON-LD first (most reliable)
    const jsonLdMatch = html.match(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g);
    if (jsonLdMatch) {
      const events: LumaEvent[] = [];
      for (const block of jsonLdMatch) {
        try {
          const inner = block.replace(/<script[^>]*>/, "").replace(/<\/script>/, "").trim();
          const obj = JSON.parse(inner);
          const list = Array.isArray(obj) ? obj : obj["@type"] === "Event" ? [obj] : obj["@graph"] || [];
          for (const e of list) {
            if (e["@type"] !== "Event") continue;
            events.push({
              title: e.name || "",
              date: e.startDate ? new Date(e.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Upcoming",
              time: e.startDate ? new Date(e.startDate).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "",
              location: e.location?.name || e.location?.address?.streetAddress || "Frontier Tower",
              url: e.url || "https://lu.ma/frontiertower",
            });
          }
        } catch { /* skip */ }
      }
      if (events.length > 0) return events.slice(0, 10);
    }

    // Fallback HTML parse
    const events: LumaEvent[] = [];
    const eventRegex = /href="(https:\/\/lu\.ma\/[^"]+)"[^>]*>[\s\S]{0,500}?<h[23][^>]*>([^<]{3,100})<\/h[23]>/g;
    let match;
    while ((match = eventRegex.exec(html)) !== null && events.length < 8) {
      const [, url, title] = match;
      if (!title || /placeholder|hold -/i.test(title)) continue;
      events.push({ title: title.trim(), date: "Upcoming", time: "", location: "Frontier Tower", url });
    }
    return events.length > 0 ? events : getFallback();
  } catch {
    return getFallback();
  }
}

function getFallback(): LumaEvent[] {
  return [
    { title: "Intelligence at the Frontier Hackathon", date: "Mar 14–15", time: "All Day", location: "All Floors", url: "https://lu.ma/frontiertower" },
    { title: "GDC Esports Games — STAKENSLAY", date: "Tonight", time: "7:00 PM", location: "Floor 7 — Maker Space", url: "https://luma.com/gdc-esports-games-stakenslay" },
    { title: "AI and Contemporary Nihilism Salon", date: "Mar 15", time: "6:00 PM", location: "Floor 14 — Human Flourishing", url: "https://lu.ma/frontiertower" },
    { title: "Town Hall 3 — Members Only", date: "Mar 15", time: "5:30 PM", location: "Floor 2 — The Spaceship", url: "https://lu.ma/frontiertower" },
    { title: "Half Ripe — Live Music", date: "Mar 15", time: "6:00 PM", location: "Floor 6 — Arts & Music", url: "https://luma.com/half-ripe-8828" },
  ];
}

export function formatEventsForPrompt(events: LumaEvent[]): string {
  if (!events.length) return "No upcoming events found.";
  return events
    .map((e) => `• ${e.date}${e.time ? " at " + e.time : ""} — ${e.title} @ ${e.location}`)
    .join("\n");
}
