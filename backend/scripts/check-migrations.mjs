import pg from "pg";

const pool = new pg.Pool({
  connectionString:
    process.env.DATABASE_URL ?? "postgresql://dexaudio:dexaudio@localhost:5432/dexaudio",
});

const rows = await pool.query('SELECT id, hash, created_at FROM drizzle."__drizzle_migrations" ORDER BY id');
console.log("applied migrations:", rows.rows.length, rows.rows.map((r) => r.id));

const scrobbles = await pool.query(
  "SELECT column_name FROM information_schema.columns WHERE table_name = 'scrobbles' ORDER BY 1",
);
console.log("scrobbles columns:", scrobbles.rows.map((r) => r.column_name));

await pool.end();
