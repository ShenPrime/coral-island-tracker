/**
 * Shared search utilities with relevance scoring.
 *
 * Score tiers:
 *   100 — exact match
 *    80 — name starts with query
 *    60 — a word boundary starts with query (e.g. "Buffalo Butter" for "butter")
 *    40 — substring match anywhere
 *    20 — fuzzy match (all query chars appear in order)
 *     0 — no match
 */

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function fuzzyMatch(text: string, query: string): boolean {
  let qi = 0;
  for (let i = 0; i < text.length && qi < query.length; i++) {
    if (text[i] === query[qi]) qi++;
  }
  return qi === query.length;
}

export function scoreMatch(name: string, query: string): number {
  const nameLower = name.toLowerCase();
  const queryLower = query.toLowerCase();

  if (nameLower === queryLower) return 100;
  if (nameLower.startsWith(queryLower)) return 80;

  const wordBoundaryIndex = nameLower.search(
    new RegExp(`[\\s\\-]${escapeRegex(queryLower)}`)
  );
  if (wordBoundaryIndex !== -1) return 60;

  if (nameLower.includes(queryLower)) return 40;
  if (fuzzyMatch(nameLower, queryLower)) return 20;

  return 0;
}

/** Filter and sort items by search relevance. Returns items unchanged when query is empty. */
export function searchAndSort<T>(
  items: T[],
  query: string,
  getName: (item: T) => string
): T[] {
  if (!query.trim()) return items;
  return items
    .map((item) => ({ item, score: scoreMatch(getName(item), query) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item);
}
