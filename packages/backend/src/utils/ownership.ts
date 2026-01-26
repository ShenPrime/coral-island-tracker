import { sql } from "../db";

/**
 * Verify that a save slot belongs to a specific session.
 * Used to ensure users can only access their own save data.
 */
export async function verifySaveOwnership(
  saveId: number,
  sessionId: string
): Promise<boolean> {
  const result = await sql`
    SELECT id FROM save_slots WHERE id = ${saveId} AND session_id = ${sessionId}
  `;
  return result.length > 0;
}
