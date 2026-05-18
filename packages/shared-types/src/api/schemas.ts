import { z } from "zod";

export const ErrorBodySchema = z.object({
  message: z.string(),
  code: z.string().optional(),
  action: z.string().optional(),
});
export type ErrorBody = z.infer<typeof ErrorBodySchema>;

export const TrackFormatSchema = z.enum(["flac", "mp3", "unsupported"]);
export type TrackFormat = z.infer<typeof TrackFormatSchema>;

export const TrackSchema = z.object({
  id: z.string(),
  title: z.string(),
  artist: z.string(),
  album: z.string(),
  albumId: z.string().optional(),
  durationMs: z.number().int().nonnegative(),
  format: TrackFormatSchema,
  artUrl: z.string().optional(),
  playCount: z.number().int().nonnegative().optional(),
});
export type Track = z.infer<typeof TrackSchema>;

export const AlbumSchema = z.object({
  id: z.string(),
  title: z.string(),
  artist: z.string(),
  year: z.number().int().optional(),
  artUrl: z.string().optional(),
  playCount: z.number().int().nonnegative().optional(),
  pinned: z.boolean().optional(),
});
export type Album = z.infer<typeof AlbumSchema>;

export const AlbumPageSchema = z.object({
  items: z.array(AlbumSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
});
export type AlbumPage = z.infer<typeof AlbumPageSchema>;

export const PlexConnectionInputSchema = z.object({
  serverUrl: z.string().url(),
  token: z.string().min(1),
  libraryIds: z.array(z.string()).optional(),
});
export type PlexConnectionInput = z.infer<typeof PlexConnectionInputSchema>;

export const PlexAccountIdentitySchema = z.object({
  username: z.string(),
  avatarUrl: z.string().url().nullable().optional(),
  email: z.string().email().nullable().optional(),
});
export type PlexAccountIdentity = z.infer<typeof PlexAccountIdentitySchema>;

export const PlexConnectionPublicSchema = z.object({
  serverUrl: z.string().optional(),
  serverName: z.string().nullable().optional(),
  machineIdentifier: z.string().nullable().optional(),
  tokenMasked: z.string().optional(),
  libraryIds: z.array(z.string()).optional(),
  connected: z.boolean(),
  account: PlexAccountIdentitySchema.optional(),
});
export type PlexConnectionPublic = z.infer<typeof PlexConnectionPublicSchema>;

export const PlexPinCreatedSchema = z.object({
  pinId: z.number().int(),
  pinCode: z.string(),
  authUrl: z.string().url(),
});
export type PlexPinCreated = z.infer<typeof PlexPinCreatedSchema>;

export const PlexPinStatusSchema = z.object({
  authorized: z.boolean(),
  expired: z.boolean().optional(),
});
export type PlexPinStatus = z.infer<typeof PlexPinStatusSchema>;

export const PlexServerInfoSchema = z.object({
  machineIdentifier: z.string(),
  name: z.string(),
  owned: z.boolean(),
  online: z.boolean(),
  sourceTitle: z.string().nullable().optional(),
});
export type PlexServerInfo = z.infer<typeof PlexServerInfoSchema>;

export const PlexAuthCompleteInputSchema = z.object({
  machineIdentifier: z.string().min(1),
  libraryIds: z.array(z.string()).min(1),
});
export type PlexAuthCompleteInput = z.infer<typeof PlexAuthCompleteInputSchema>;

export const PlexAuthCompleteResultSchema = z.object({
  connection: PlexConnectionPublicSchema,
  dataWiped: z.boolean(),
});
export type PlexAuthCompleteResult = z.infer<typeof PlexAuthCompleteResultSchema>;

export const PlexLibrarySchema = z.object({
  id: z.string(),
  title: z.string(),
  type: z.string(),
});
export type PlexLibrary = z.infer<typeof PlexLibrarySchema>;

export const SearchResultsSchema = z.object({
  albums: z.array(AlbumSchema),
  tracks: z.array(TrackSchema),
});
export type SearchResults = z.infer<typeof SearchResultsSchema>;

export const MatchStatusSchema = z.enum(["matched", "partial", "not_on_plex"]);
export type MatchStatus = z.infer<typeof MatchStatusSchema>;

export const MatchCandidateSchema = z.object({
  id: z.string(),
  title: z.string(),
  artist: z.string(),
  score: z.number().optional(),
});
export type MatchCandidate = z.infer<typeof MatchCandidateSchema>;

export const DiscogsCollectionItemSchema = z.object({
  releaseId: z.number().int(),
  title: z.string(),
  artist: z.string(),
  year: z.number().int().optional(),
  format: z.string().optional(),
  matchStatus: MatchStatusSchema,
  plexAlbumId: z.string().nullable().optional(),
  matchCandidates: z.array(MatchCandidateSchema).optional(),
});
export type DiscogsCollectionItem = z.infer<typeof DiscogsCollectionItemSchema>;

export const ScrobbleInputSchema = z.object({
  track: z.string(),
  artist: z.string(),
  album: z.string(),
  playedAt: z.string().datetime(),
  durationMs: z.number().int().nonnegative().optional(),
});
export type ScrobbleInput = z.infer<typeof ScrobbleInputSchema>;

export const TopStatsSchema = z.object({
  songs: z.array(
    z.object({
      track: TrackSchema,
      playCount: z.number().int().nonnegative(),
    }),
  ),
  albums: z.array(
    z.object({
      album: AlbumSchema,
      playCount: z.number().int().nonnegative(),
    }),
  ),
  artists: z.array(
    z.object({
      name: z.string(),
      playCount: z.number().int().nonnegative(),
    }),
  ),
});
export type TopStats = z.infer<typeof TopStatsSchema>;

export const AppSettingsSchema = z.object({
  matchingStrictness: z.enum(["strict", "fuzzy"]).optional(),
  libraryRefreshPolicy: z.enum(["manual", "on_launch"]).optional(),
  autoQueueSimilar: z.boolean().optional(),
  crossfade: z
    .object({
      enabled: z.boolean(),
      durationSec: z.number(),
    })
    .optional(),
});
export type AppSettings = z.infer<typeof AppSettingsSchema>;
