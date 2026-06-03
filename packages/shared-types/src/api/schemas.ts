import { z } from "zod";

export const ErrorBodySchema = z.object({
  message: z.string(),
  code: z.string().optional(),
  action: z.string().optional(),
});
export type ErrorBody = z.infer<typeof ErrorBodySchema>;

export const TrackFormatSchema = z.enum([
  "flac",
  "mp3",
  "aac",
  "ogg",
  "wav",
  "alac",
  "wma",
  "unsupported",
]);
export type TrackFormat = z.infer<typeof TrackFormatSchema>;

export const AudioQualitySchema = z.enum(["lossless", "transcoded"]);
export type AudioQuality = z.infer<typeof AudioQualitySchema>;

export const StreamQuerySchema = z.object({
  quality: z.enum(["auto", "lossless"]).optional(),
});
export type StreamQuery = z.infer<typeof StreamQuerySchema>;

export const PlaybackErrorCategorySchema = z.enum([
  "unsupported_format",
  "server_unreachable",
  "auth_expired",
  "track_not_found",
  "network_interrupted",
  "autoplay_blocked",
  "unknown",
]);
export type PlaybackErrorCategory = z.infer<typeof PlaybackErrorCategorySchema>;

export const PlaybackAffordanceSchema = z.enum([
  "skip",
  "retry",
  "sign_in",
  "back_to_library",
  "retry_queue",
  "play_gesture",
]);
export type PlaybackAffordance = z.infer<typeof PlaybackAffordanceSchema>;

export const TransitionStyleSchema = z.enum(["none", "gapless", "crossfade"]);
export type TransitionStyle = z.infer<typeof TransitionStyleSchema>;

export const PlaybackFailureSchema = z.object({
  category: PlaybackErrorCategorySchema,
  recoverable: z.boolean(),
  message: z.string(),
  trackTitle: z.string().optional(),
  trackArtist: z.string().optional(),
  trackId: z.string().optional(),
  technicalDetail: z.string().optional(),
  affordances: z.array(PlaybackAffordanceSchema).min(1),
  timestamp: z.string().datetime(),
});
export type PlaybackFailure = z.infer<typeof PlaybackFailureSchema>;

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
  userRating: z.number().int().min(0).max(10).optional(),
  addedAt: z.string().datetime().optional(),
});
export type Album = z.infer<typeof AlbumSchema>;

export const ArtistSpotlightSchema = z.object({
  artistId: z.string(),
  artistName: z.string(),
  albumCount: z.number().int().min(3),
  albumArtUrls: z.array(z.string()).max(3),
});
export type ArtistSpotlight = z.infer<typeof ArtistSpotlightSchema>;

export const AlbumGroupsResponseSchema = z.object({
  recentlyPlayed: z.array(AlbumSchema).max(10),
  recentlyAdded: z.array(AlbumSchema).max(10),
  hiddenGems: z.array(AlbumSchema).max(10),
  randomPicks: z.array(AlbumSchema).max(10),
  artistSpotlights: z.array(ArtistSpotlightSchema).max(10),
});
export type AlbumGroupsResponse = z.infer<typeof AlbumGroupsResponseSchema>;

export const LibraryGroupKeySchema = z.enum([
  "recently-played",
  "recently-added",
  "hidden-gems",
  "random-picks",
  "artist-spotlights",
]);
export type LibraryGroupKey = z.infer<typeof LibraryGroupKeySchema>;

export const AlbumGroupResponseSchema = z.object({
  items: z.array(AlbumSchema),
});
export type AlbumGroupResponse = z.infer<typeof AlbumGroupResponseSchema>;

export const ArtistSpotlightGroupResponseSchema = z.object({
  items: z.array(ArtistSpotlightSchema),
});
export type ArtistSpotlightGroupResponse = z.infer<typeof ArtistSpotlightGroupResponseSchema>;

export const AlbumListItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  artist: z.string(),
  artUrl: z.string().optional(),
  sortKey: z.string(),
});
export type AlbumListItem = z.infer<typeof AlbumListItemSchema>;

export const AllAlbumsResponseSchema = z.object({
  items: z.array(AlbumListItemSchema),
  total: z.number().int().nonnegative(),
});
export type AllAlbumsResponse = z.infer<typeof AllAlbumsResponseSchema>;

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

export const PlexConnectionIssueSchema = z.enum([
  "not_configured",
  "decrypt_failed",
  "server_unreachable",
  "reauth_recommended",
]);
export type PlexConnectionIssue = z.infer<typeof PlexConnectionIssueSchema>;

export const PlexConnectionPublicSchema = z.object({
  serverUrl: z.string().optional(),
  serverName: z.string().nullable().optional(),
  machineIdentifier: z.string().nullable().optional(),
  tokenMasked: z.string().optional(),
  libraryIds: z.array(z.string()).optional(),
  connected: z.boolean(),
  account: PlexAccountIdentitySchema.optional(),
  /** Why the UI should prompt reconnect or wait (omitted when healthy). */
  issue: PlexConnectionIssueSchema.optional(),
  issueMessage: z.string().optional(),
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

export const StatsPeriodSchema = z.enum(["7d", "1m", "3m", "6m", "12m", "all"]);
export type StatsPeriod = z.infer<typeof StatsPeriodSchema>;

export const StatsSourceSchema = z.enum(["lastfm", "plex"]);
export type StatsSource = z.infer<typeof StatsSourceSchema>;

export const StatsGranularitySchema = z.enum(["day", "week", "month"]);
export type StatsGranularity = z.infer<typeof StatsGranularitySchema>;

export const TopEntrySchema = z.object({
  label: z.string(),
  sub: z.string().optional(),
  count: z.number().int().nonnegative(),
  imageUrl: z.string().optional(),
});
export type TopEntry = z.infer<typeof TopEntrySchema>;

export const ListeningOverviewSchema = z.object({
  period: StatsPeriodSchema,
  source: StatsSourceSchema,
  totalPlays: z.number().int().nonnegative(),
  totalPlaysAllTime: z.number().int().nonnegative(),
  uniqueArtists: z.number().int().nonnegative(),
  uniqueAlbums: z.number().int().nonnegative(),
  uniqueTracks: z.number().int().nonnegative(),
  avgPlaysPerDay: z.number().nonnegative(),
  busiestDate: z
    .object({
      date: z.string(),
      count: z.number().int().nonnegative(),
    })
    .nullable()
    .optional(),
  busiestWeekday: z
    .object({
      weekday: z.number().int().min(0).max(6),
      count: z.number().int().nonnegative(),
    })
    .nullable()
    .optional(),
  topArtists: z.array(TopEntrySchema).max(10),
  topAlbums: z.array(TopEntrySchema).max(10),
  topTracks: z.array(TopEntrySchema).max(10),
});
export type ListeningOverview = z.infer<typeof ListeningOverviewSchema>;

export const TimeSeriesPointSchema = z.object({
  bucket: z.string(),
  count: z.number().int().nonnegative(),
});
export type TimeSeriesPoint = z.infer<typeof TimeSeriesPointSchema>;

export const ListeningPatternsSchema = z.object({
  period: StatsPeriodSchema,
  source: StatsSourceSchema,
  granularity: StatsGranularitySchema,
  playsOverTime: z.array(TimeSeriesPointSchema),
  clock: z.array(
    z.object({
      hour: z.number().int().min(0).max(23),
      count: z.number().int().nonnegative(),
    }),
  ),
  weekday: z.array(
    z.object({
      weekday: z.number().int().min(0).max(6),
      count: z.number().int().nonnegative(),
    }),
  ),
  calendar: z.array(TimeSeriesPointSchema),
});
export type ListeningPatterns = z.infer<typeof ListeningPatternsSchema>;

export const LastfmSyncStatusSchema = z.object({
  connected: z.boolean(),
  username: z.string().nullable().optional(),
  status: z.enum(["idle", "syncing", "error"]),
  lastSyncedAt: z.string().datetime().nullable().optional(),
  totalScrobbles: z.number().int().nullable().optional(),
  syncedPages: z.number().int().nonnegative(),
  totalPages: z.number().int().nullable().optional(),
  lastError: z.string().nullable().optional(),
});
export type LastfmSyncStatus = z.infer<typeof LastfmSyncStatusSchema>;

export const LastfmAuthTokenSchema = z.object({
  token: z.string(),
  authUrl: z.string(),
});
export type LastfmAuthToken = z.infer<typeof LastfmAuthTokenSchema>;

export const LastfmAuthStatusSchema = z.object({
  authorized: z.boolean(),
  expired: z.boolean(),
  username: z.string().nullable().optional(),
});
export type LastfmAuthStatus = z.infer<typeof LastfmAuthStatusSchema>;

export const LastfmConnectionInputSchema = z
  .object({
    sessionKey: z.string().min(1).optional(),
    username: z.string().min(1).optional(),
  })
  .refine((v) => v.sessionKey != null || v.username != null, {
    message: "At least one of sessionKey or username is required",
  });
export type LastfmConnectionInput = z.infer<typeof LastfmConnectionInputSchema>;

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

export const PlexTimelineStateSchema = z.enum(["playing", "paused", "stopped", "buffering"]);
export type PlexTimelineState = z.infer<typeof PlexTimelineStateSchema>;

export const PlexTimelineInputSchema = z.object({
  ratingKey: z.string().min(1),
  state: PlexTimelineStateSchema,
  timeMs: z.number().int().nonnegative(),
  durationMs: z.number().int().positive(),
  sessionKey: z.number().int(),
});
export type PlexTimelineInput = z.infer<typeof PlexTimelineInputSchema>;

export const PlexReportingStatusSchema = z.object({
  enabled: z.boolean(),
  connected: z.boolean(),
  pending: z.number().int().nonnegative(),
  lastError: z.string().nullable(),
});
export type PlexReportingStatus = z.infer<typeof PlexReportingStatusSchema>;

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
  plexPlaybackReporting: z
    .object({
      enabled: z.boolean(),
    })
    .optional(),
});
export type AppSettings = z.infer<typeof AppSettingsSchema>;

export const NetworkPlayerSchema = z.object({
  clientIdentifier: z.string(),
  name: z.string(),
  product: z.string(),
  device: z.string().optional(),
  platform: z.string().optional(),
  reachable: z.boolean(),
  supportsSeek: z.boolean(),
  supportsQueueSync: z.boolean(),
});
export type NetworkPlayer = z.infer<typeof NetworkPlayerSchema>;

export const PlayerListEmptyReasonSchema = z.enum([
  "no_players",
  "remote_control_disabled",
  "server_unreachable",
]);
export type PlayerListEmptyReason = z.infer<typeof PlayerListEmptyReasonSchema>;

export const PlayerListResponseSchema = z.object({
  refreshedAt: z.string().datetime(),
  players: z.array(NetworkPlayerSchema),
  emptyReason: PlayerListEmptyReasonSchema.optional(),
});
export type PlayerListResponse = z.infer<typeof PlayerListResponseSchema>;

export const PlayerStatusSchema = z.object({
  clientIdentifier: z.string(),
  state: z.enum(["playing", "paused", "stopped", "idle", "unknown"]),
  ratingKey: z.string().nullable(),
  title: z.string().nullable(),
  artist: z.string().nullable(),
  album: z.string().nullable(),
  positionMs: z.number().int().nonnegative(),
  durationMs: z.number().int().nonnegative(),
  queueItemId: z.string().nullable().optional(),
});
export type PlayerStatus = z.infer<typeof PlayerStatusSchema>;

export const RemotePlayInputSchema = z.object({
  ratingKey: z.string().min(1),
  queue: z
    .object({
      ratingKeys: z.array(z.string().min(1)),
      startIndex: z.number().int().nonnegative(),
    })
    .optional(),
  offsetMs: z.number().int().nonnegative().optional(),
});
export type RemotePlayInput = z.infer<typeof RemotePlayInputSchema>;

export const RemotePlayDegradedResponseSchema = z.object({
  degraded: z.literal(true),
  message: z.string(),
});
export type RemotePlayDegradedResponse = z.infer<typeof RemotePlayDegradedResponseSchema>;

export const RemoteControlActionSchema = z.enum([
  "pause",
  "resume",
  "stop",
  "skipNext",
  "skipPrevious",
  "seek",
]);
export type RemoteControlAction = z.infer<typeof RemoteControlActionSchema>;

export const RemoteControlInputSchema = z.object({
  action: RemoteControlActionSchema,
  seekToMs: z.number().int().nonnegative().optional(),
});
export type RemoteControlInput = z.infer<typeof RemoteControlInputSchema>;

export const QueueSyncInputSchema = z.object({
  ratingKeys: z.array(z.string().min(1)),
  currentIndex: z.number().int().nonnegative(),
  interruptPlayback: z.boolean().optional(),
  queueRevision: z.number().int().nonnegative(),
});
export type QueueSyncInput = z.infer<typeof QueueSyncInputSchema>;

export const QueueSyncConflictSchema = z.object({
  queueRevision: z.number().int(),
  error: z.string(),
});
export type QueueSyncConflict = z.infer<typeof QueueSyncConflictSchema>;

export const PlaybackOutputPreferenceSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("local") }),
  z.object({
    mode: z.literal("network"),
    clientIdentifier: z.string(),
    displayName: z.string(),
    product: z.string(),
  }),
]);
export type PlaybackOutputPreference = z.infer<typeof PlaybackOutputPreferenceSchema>;
