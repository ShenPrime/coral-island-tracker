/**
 * Changelog parsing utilities for the "What's new" banner.
 * Extracts the latest version's changes from CHANGELOG.md (injected at build time).
 */

export interface ChangelogEntry {
  version: string;
  changes: string[];
}

/**
 * Parse CHANGELOG.md and extract the latest version's changes.
 * Only extracts main bullet points (lines starting with "- **"),
 * not sub-bullets or implementation details.
 * 
 * Example input:
 *   ## v0.5.0 (Current)
 *   - **Cooking Recipes**: New category for tracking cooking recipes
 *     - Sub-detail that gets ignored
 *   - **Modal Improvements**: Cooking modal shows relevant info only
 * 
 * Example output:
 *   { version: "v0.5.0", changes: ["Cooking Recipes - New category...", "Modal Improvements - ..."] }
 */
export function getLatestChangelog(): ChangelogEntry | null {
  const raw = import.meta.env.VITE_CHANGELOG as string | undefined;
  if (!raw) return null;

  // Find first version header (## v0.5.0 or ## v0.5.0 (Current))
  const versionMatch = raw.match(/^## (v[\d.]+)/m);
  if (!versionMatch) return null;

  const version = versionMatch[1];

  // Find where this version section starts
  const versionStart = raw.indexOf(versionMatch[0]);

  // Find where the next version section starts (or end of file)
  const remainingContent = raw.slice(versionStart + versionMatch[0].length);
  const nextVersionMatch = remainingContent.match(/^## v[\d.]+/m);
  const versionEnd = nextVersionMatch
    ? versionStart + versionMatch[0].length + remainingContent.indexOf(nextVersionMatch[0])
    : raw.length;

  const versionContent = raw.slice(versionStart, versionEnd);

  // Extract main bullet points only (lines starting with "- **")
  // Format: "- **Feature Name**: Description" -> "Feature Name - Description"
  // Format: "- **Feature Name**" -> "Feature Name"
  const changes: string[] = [];
  const lines = versionContent.split("\n");

  for (const line of lines) {
    // Match lines starting with "- **" (main bullet points only, not sub-bullets)
    const match = line.match(/^- \*\*([^*]+)\*\*:?\s*(.*)$/);
    if (match) {
      const title = match[1].trim();
      const desc = match[2].trim();
      changes.push(desc ? `${title} - ${desc}` : title);
    }
  }

  return changes.length > 0 ? { version, changes } : null;
}
