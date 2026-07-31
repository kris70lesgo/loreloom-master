export async function fetchVisualKnowledge(query: string): Promise<string> {
  if (!query || query.trim().length < 3) return "";

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 1200);

  try {
    const cleanQuery = encodeURIComponent(query.trim().slice(0, 100));
    const response = await fetch(`https://api.duckduckgo.com/?q=${cleanQuery}&format=json&no_html=1&skip_disambig=1`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!response.ok) return "";

    const data = await response.json().catch(() => ({}));
    const abstract = typeof data.AbstractText === "string" ? data.AbstractText : "";
    const heading = typeof data.Heading === "string" ? data.Heading : "";

    if (abstract && abstract.length > 20) {
      return `Visual & Lore Knowledge Grounding for "${heading || query}": ${abstract.slice(0, 450)}`;
    }
  } catch (err: any) {
    clearTimeout(timeoutId);
    console.warn("[knowledge] Visual knowledge grounding lookup skipped or timed out:", err.message);
  }

  return "";
}
