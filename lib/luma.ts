export interface LumaEvent {
  title: string;
  date: string;
  time: string;
  location: string;
  url: string;
}

const UNBROWSE_URL = process.env.UNBROWSE_URL || "https://api.unbrowse.ai";

export async function fetchFrontierTowerEvents(): Promise<LumaEvent[]> {
  const unbrowseResult = await tryUnbrowse();
  if (unbrowseResult.length > 0) return unbrowseResult;
  return await directFetch();
}

async function tryUnbrowse(): Promise<LumaEvent[]> {
  try {
    const res = await fetch(`${UNBROWSE_URL}/v1/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        intent: "list upcoming events with title, date, time, location",
        url: "https://lu.ma/frontiertower",
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const list =
      data?.results || data?.events || data?.data || (Array.isArray(data) ? data : []);
    return list.slice(0, 8).map((item: Record<string, string>) => ({
      title: item.title || item.name || "",
      date: item.date || item.startAt || "Upcoming",
      time: item.time || item.startTime || "",
      location: item.location || item.venue || "Frontier Tower",
      url: item.url || "https://lu.ma/frontiertower",
    }));
  } catch {
    return [];
  }
}

async function directFetch(): Promise<LumaEvent[]> {
  try {
    const res = await fetch("https://lu.ma/frontiertower", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        Accept: "text/html",
      },
      next: { revalidate: 300 },
    });
    if (!res.ok) return getFallback();
    const html = await res.text();
    const jsonLd = html.match(
      /<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g
    );
    if (jsonLd) {
      const events: LumaEvent[] = [];
      for (const block of jsonLd) {
        try {
          const inner = block.replace(/<script[^>]*>/, "").replace(/<\/script>/, "");
          const obj = JSON.parse(inner);
          const list = Array.isArray(obj)
            ? obj
            : obj["@type"] === "Event"
              ? [obj]
              : obj["@graph"] || [];
          for (const e of list) {
            if (e["@type"] !== "Event") continue;
            events.push({
              title: e.name || "",
              date: e.startDate
                ? new Date(e.startDate).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                : "Upcoming",
              time: e.startDate
                ? new Date(e.startDate).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  })
                : "",
              location:
                e.location?.name ||
                e.location?.address?.streetAddress ||
                "Frontier Tower",
              url: e.url || "https://lu.ma/frontiertower",
            });
          }
        } catch {
          /* skip */
        }
      }
      if (events.length > 0) return events.slice(0, 8);
    }
    return getFallback();
  } catch {
    return getFallback();
  }
}

function getFallback(): LumaEvent[] {
  return [
    { title: "Intelligence at the Frontier Hackathon", date: "Mar 14-15", time: "All Day", location: "All Floors", url: "https://lu.ma/frontiertower" },
    { title: "GDC Esports — STAKENSLAY", date: "Tonight", time: "7 PM", location: "Floor 7", url: "https://lu.ma/frontiertower" },
    { title: "AI & Nihilism Salon", date: "Mar 15", time: "6 PM", location: "Floor 14", url: "https://lu.ma/frontiertower" },
    { title: "Town Hall 3", date: "Mar 15", time: "5:30 PM", location: "Floor 2", url: "https://lu.ma/frontiertower" },
    { title: "Half Ripe — Live Music", date: "Mar 15", time: "6 PM", location: "Floor 6", url: "https://lu.ma/frontiertower" },
  ];
}

export function formatEventsForPrompt(events: LumaEvent[]): string {
  if (!events.length) return "No upcoming events found.";
  return events
    .map((e) => `• ${e.date} ${e.time} — ${e.title} @ ${e.location}`)
    .join("\n");
}
