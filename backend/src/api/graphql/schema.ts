export const typeDefs = `#graphql
  type Album {
    id: ID!
    title: String!
    artist: String!
    year: Int
    artUrl: String
  }

  type Track {
    id: ID!
    title: String!
    artist: String!
    album: String!
    durationMs: Int!
    format: String!
  }

  type RankedSong {
    track: Track!
    playCount: Int!
  }

  type TopStats {
    songs: [RankedSong!]!
    albums: [Album!]!
    artists: [RankedArtist!]!
  }

  type RankedArtist {
    name: String!
    playCount: Int!
  }

  type DiscogsItem {
    releaseId: Int!
    title: String!
    artist: String!
    matchStatus: String!
    plexAlbumId: String
  }

  type AlbumPage {
    items: [Album!]!
    total: Int!
    page: Int!
  }

  type Query {
    library(libraryId: ID!, page: Int, pageSize: Int): AlbumPage
    topStats: TopStats
    discogsCollection: [DiscogsItem!]!
  }
`;
