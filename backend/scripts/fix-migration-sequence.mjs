import pg from "pg";

const pool = new pg.Pool({
  connectionString:
    process.env.DATABASE_URL ?? "postgresql://dexaudio:dexaudio@localhost:5432/dexaudio",
});

await pool.query(
  `SELECT setval(
    pg_get_serial_sequence('drizzle.__drizzle_migrations', 'id'),
    COALESCE((SELECT MAX(id) FROM drizzle."__drizzle_migrations"), 0)
  )`,
);

const seq = await pool.query(
  "SELECT last_value FROM drizzle.__drizzle_migrations_id_seq",
);
console.log("Sequence reset. last_value:", seq.rows[0]?.last_value);

await pool.end();
