/**
 * Utility functions for ensuring metadata is properly parsed as objects.
 * 
 * The database stores metadata as JSONB, but depending on how data was inserted
 * or how the driver handles it, metadata might come back as a string or object.
 * These helpers ensure consistent object output.
 */

/**
 * Ensures metadata is returned as a parsed object.
 * Handles cases where metadata might be a JSON string or already an object.
 */
export function ensureParsedMetadata(metadata: unknown): Record<string, unknown> {
  if (!metadata) return {};
  if (typeof metadata === "string") {
    try {
      return JSON.parse(metadata);
    } catch {
      return {};
    }
  }
  return metadata as Record<string, unknown>;
}

/**
 * Maps an array of items to ensure their metadata is parsed.
 * Use this when returning items from API endpoints.
 * 
 * @example
 * const items = await sql`SELECT * FROM items`;
 * return c.json({ data: withParsedMetadata(items) });
 */
export function withParsedMetadata<T extends { metadata?: unknown }>(items: T[]): T[] {
  return items.map((item) => ({
    ...item,
    metadata: ensureParsedMetadata(item.metadata),
  }));
}
