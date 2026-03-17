export interface LumaEvent {
  title: string;
  date: string;
  time: string;
  location: string;
  url: string;
}

export async function fetchFrontierTowerEvents(): Promise<LumaEvent[]> {
  const unbrowseResult = await tryUnbrowse();
  if (unbrowseResult.length > 0) return unbrowseResult;
  return await directFetch();
}

async function tryUnbrowse(): Promise<LumaEvent[]> {
  try {
    // Try local server first (dev), then remote API (prod)
    const base = process.env.UNBROWSE_URL || "http://localhost:6969";
    const apiKey = process.env.UNBROWSE_API_KEY;

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

    const res = await fetch(`${base}/v1/intent/resolve`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        intent: "list all upcoming events with title, date, time, location, and registration URL",
        params: { url: "https://lu.ma/frontiertower" },
        context: { url: "https://lu.ma/frontiertower" },
      }),
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) return [];
    const data = await res.json();

    // Unbrowse returns results in various shapes
    const raw = data?.result || data?.results || data?.data || data?.events || (Array.isArray(data) ? data : []);
    const list = Array.isArray(raw) ? raw : [];

    return list.slice(0, 10).filter((item: Record<string, string>) => item?.title || item?.name).map((item: Record<string, string>) => ({
      title: item.title || item.name || "",
      date: item.date || item.startAt || item.start_at || item.startDate || "Upcoming",
      time: item.time || item.startTime || item.start_time || "",
      location: item.location || item.venue || item.locationName || "Frontier Tower",
      url: item.url || item.registrationUrl || item.registration_url || "https://lu.ma/frontiertower",
    }));
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

    const jsonLd = html.match(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g);
    if (jsonLd) {
      const events: LumaEvent[] = [];
      for (const block of jsonLd) {
        try {
          const inner = block.replace(/<script[^>]*>/, "").replace(/<\/script>/, "");
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
    return getFallback();
  } catch {
    return getFallback();
  }
}

function getFallback(): LumaEvent[] {
  return [
    { title: "AI Paper Reading Club - Week 7", date: "Mar 17", time: "5:00 PM", location: "Floor 9 Annex", url: "https://luma.com/frontier-tower-ai-paper-reading-club-wee-9e37" },
    { title: "Why Not Brain Rot: AI and Contemporary Nihilism Salon", date: "Mar 17", time: "6:00 PM", location: "Floor 14 — Human Flourishing", url: "https://luma.com/why-not-brain-rot-ai-and-contemporary-ni" },
    { title: "Half Ripe — Live Music", date: "Mar 17", time: "6:00 PM", location: "Floor 6 — Arts & Music", url: "https://luma.com/half-ripe-8828" },
    { title: "Taser Knife Club Night #001", date: "Mar 17", time: "6:30 PM", location: "Frontier Tower", url: "https://luma.com/taser-knife-practice1" },
    { title: "Conversation Cafe — Playful Sincerity", date: "Mar 17", time: "7:00 PM", location: "Floor 2 — The Spaceship", url: "https://luma.com/conversation-cafe-6" },
    { title: "Town Hall #3 — Members Only", date: "Mar 18", time: "5:30 PM", location: "Floor 2 — The Spaceship", url: "https://luma.com/town-hall-3-placeholder" },
    { title: "Anatomy and Physiology for Biohackers", date: "Mar 18", time: "6:30 PM", location: "Floor 7 — Makerspace", url: "https://luma.com/anatomy-and-physiology-for-biohackers" },
    { title: "14th Floor New Member Happy Hour", date: "Mar 19", time: "6:00 PM", location: "Floor 14", url: "https://luma.com/14th-floor-new-member-happy-hour" },
    { title: "Live Feedback & Funding Q&A with Angel Investor", date: "Mar 19", time: "7:00 PM", location: "Floor 4 Annex", url: "https://luma.com/live-feedback-funding-qa-with-angel-inve-2983" },
    { title: "Frontier Tower Open Day", date: "Mar 20", time: "1:00 PM", location: "Floor 2 — The Spaceship", url: "https://luma.com/frontier-tower-open-day-march-20th" },
  ];
}

export function formatEventsForPrompt(events: LumaEvent[]): string {
  if (!events.length) return "No upcoming events found.";
  return events.map((e) => `• ${e.date} ${e.time} — ${e.title} @ ${e.location}`).join("\n");
}
