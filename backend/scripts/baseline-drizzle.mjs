/**
 * Marks historical migrations as applied in drizzle.__drizzle_migrations
 * when the database schema already exists but the journal was never tracked.
 *
 * Usage: npm run db:baseline
 * Then: npm run db:migrate
 */
import { readMigrationFiles } from "drizzle-orm/migrator";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

const migrationsFolder = join(import.meta.dirname, "..", "drizzle");
const journal = JSON.parse(
  readFileSync(join(migrationsFolder, "meta", "_journal.json"), "utf8"),
);

const BASELINE_TAGS = new Set([
  "0000_init",
  "0001_match_candidates",
  "0008_add_plex_auth_fields",
  "0009_add_artist_spotlight_state",
  "0010_plex_timeline_outbox",
]);

const files = readMigrationFiles({ migrationsFolder });
const tagByHash = new Map();
for (let i = 0; i < journal.entries.length; i++) {
  tagByHash.set(journal.entries[i].tag, files[i]?.hash);
}

const pool = new pg.Pool({
  connectionString:
    process.env.DATABASE_URL ?? "postgresql://dexaudio:dexaudio@localhost:5432/dexaudio",
});

const existing = await pool.query('SELECT hash FROM drizzle."__drizzle_migrations"');
const applied = new Set(existing.rows.map((r) => r.hash));

for (const entry of journal.entries) {
  if (!BASELINE_TAGS.has(entry.tag)) continue;
  const hash = tagByHash.get(entry.tag);
  if (!hash) {
    console.warn(`skip ${entry.tag}: no hash`);
    continue;
  }
  if (applied.has(hash)) {
    console.log(`already applied: ${entry.tag}`);
    continue;
  }
  await pool.query(
    'INSERT INTO drizzle."__drizzle_migrations" (hash, created_at) VALUES ($1, $2)',
    [hash, entry.when],
  );
  console.log(`baselined: ${entry.tag}`);
}

await pool.query(
  `SELECT setval(
    pg_get_serial_sequence('drizzle.__drizzle_migrations', 'id'),
    COALESCE((SELECT MAX(id) FROM drizzle."__drizzle_migrations"), 0)
  )`,
);

await pool.end();
console.log("Baseline complete. Run: npm run db:migrate");
