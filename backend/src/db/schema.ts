import {
  pgTable,
  uuid,
  text,
  timestamp,
  bigint,
  integer,
  numeric,
  boolean,
  jsonb,
  pgEnum,
  customType,
} from "drizzle-orm/pg-core";

const bytea = customType<{ data: Buffer; driverData: string }>({
  dataType() {
    return "bytea";
  },
  toDriver(value: Buffer) {
    return `\\x${value.toString("hex")}`;
  },
  fromDriver(value: string): Buffer {
    if (typeof value === "string" && value.startsWith("\\x")) {
      return Buffer.from(value.slice(2), "hex");
    }
    return Buffer.from(value as string);
  },
});

export const matchStatusEnum = pgEnum("match_status", ["matched", "partial", "not_on_plex"]);
export const scrobbleStatusEnum = pgEnum("scrobble_status", ["pending", "submitted", "dropped"]);

export const plexConnections = pgTable("plex_connections", {
  id: uuid("id").primaryKey().defaultRandom(),
  serverUrl: text("server_url").notNull(),
  tokenEncrypted: bytea("token_encrypted").notNull(),
  activeLibraryIds: text("active_library_ids").array().notNull().default([]),
  lastValidatedAt: timestamp("last_validated_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const discogsAccounts = pgTable("discogs_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: text("username").notNull(),
  tokenEncrypted: bytea("token_encrypted").notNull(),
  lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),
});

export const discogsReleases = pgTable("discogs_releases", {
  id: uuid("id").primaryKey().defaultRandom(),
  discogsReleaseId: bigint("discogs_release_id", { mode: "number" }).notNull().unique(),
  title: text("title").notNull(),
  artist: text("artist").notNull(),
  year: integer("year"),
  format: text("format"),
  rawPayload: jsonb("raw_payload"),
  syncedAt: timestamp("synced_at", { withTimezone: true }).defaultNow().notNull(),
});

export const collectionMatches = pgTable("collection_matches", {
  id: uuid("id").primaryKey().defaultRandom(),
  discogsReleaseId: bigint("discogs_release_id", { mode: "number" }).notNull().unique(),
  plexRatingKey: text("plex_rating_key"),
  status: matchStatusEnum("status").notNull(),
  confidence: numeric("confidence", { precision: 3, scale: 2 }),
  matchCandidates: jsonb("match_candidates"),
  manualOverride: boolean("manual_override").default(false).notNull(),
  matchedAt: timestamp("matched_at", { withTimezone: true }).defaultNow().notNull(),
});

export const lastfmAccounts = pgTable("lastfm_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionKeyEncrypted: bytea("session_key_encrypted"),
  connected: boolean("connected").default(false).notNull(),
  lastError: text("last_error"),
});

export const scrobbleOutbox = pgTable("scrobble_outbox", {
  id: uuid("id").primaryKey().defaultRandom(),
  trackTitle: text("track_title").notNull(),
  artist: text("artist").notNull(),
  album: text("album").notNull(),
  playedAt: timestamp("played_at", { withTimezone: true }).notNull(),
  retryCount: integer("retry_count").default(0).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  status: scrobbleStatusEnum("status").default("pending").notNull(),
});

export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
});
