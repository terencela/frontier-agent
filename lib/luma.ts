export interface LumaEvent {
  title: string;
  date: string;
  time: string;
  location: string;
  url: string;
  rsvpCount?: string;
}

export async function fetchFrontierTowerEvents(): Promise<LumaEvent[]> {
  try {
    const res = await fetch("https://lu.ma/frontiertower", {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; PulseBot/1.0)" },
      next: { revalidate: 300 },
    });
    const html = await res.text();

    const events: LumaEvent[] = [];

    // Extract event blocks using regex (Luma HTML structure)
    const eventPattern = /href="(https:\/\/luma\.com\/[^"]+)"[^>]*>[\s\S]*?<h3[^>]*>([\s\S]*?)<\/h3>[\s\S]*?<\/a>/g;
    const titlePattern = /<h3[^>]*>\s*([\s\S]*?)\s*<\/h3>/;
    const timePattern = /(\d{1,2}:\d{2}\s*(?:AM|PM))/gi;
    const locationPattern = /Frontier Tower @\s*([^<\n,]+)/g;

    // Simpler approach: find all event titles and times from the page
    const lines = html.split('\n').map(l => l.trim()).filter(Boolean);

    let currentDate = '';
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      // Detect date headers (Today, Tomorrow, Mar XX)
      if (/^(Today|Tomorrow|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s/.test(line) ||
          /^(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)$/.test(line)) {
        currentDate = line;
      }

      // Detect time + title pattern
      const timeMatch = line.match(/^(\d{1,2}:\d{2}\s*(?:AM|PM))$/i);
      if (timeMatch && i + 1 < lines.length) {
        const nextLine = lines[i + 1];
        if (nextLine.length > 5 && !nextLine.startsWith('<') && !nextLine.startsWith('By ')) {
          // Find location
          let location = 'Frontier Tower';
          for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
            const locMatch = lines[j].match(/Frontier Tower @\s*(.+?)(?:\s*995|\s*$)/);
            if (locMatch) {
              location = `Frontier Tower @ ${locMatch[1].trim()}`;
              break;
            }
          }

          events.push({
            title: nextLine.replace(/^\s+/, '').split('\n')[0].trim(),
            date: currentDate || 'Upcoming',
            time: timeMatch[1],
            location,
            url: 'https://lu.ma/frontiertower',
          });
        }
      }
      i++;
    }

    // Deduplicate by title
    const seen = new Set<string>();
    const unique = events.filter(e => {
      if (seen.has(e.title)) return false;
      seen.add(e.title);
      return true;
    });

    return unique.slice(0, 20);
  } catch (err) {
    console.error('Luma fetch error:', err);
    return [];
  }
}

export function formatEventsForPrompt(events: LumaEvent[]): string {
  if (!events.length) return 'No upcoming events found.';
  return events
    .map(e => `• ${e.date} ${e.time} — ${e.title} (${e.location})`)
    .join('\n');
}
