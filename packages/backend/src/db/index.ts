import postgres from "postgres";

const connectionString = process.env.DATABASE_URL || "postgres://postgres@localhost:5432/coral_tracker";

// Create postgres client using postgres.js (works great with Bun)
export const sql = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

// Helper to check database connection
export async function checkConnection(): Promise<boolean> {
  try {
    await sql`SELECT 1`;
    return true;
  } catch (error) {
    console.error("Database connection failed:", error);
    return false;
  }
}

// Graceful shutdown
export async function closeConnection(): Promise<void> {
  await sql.end();
}
