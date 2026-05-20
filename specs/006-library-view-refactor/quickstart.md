# Quickstart: Library View Refactor (006-library-view-refactor)

**Date**: 2026-05-20  
**Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md)

## Prerequisites

- Feature 003 (Albums Library View) implemented and Plex connected
- Node.js 22.x, PostgreSQL running
- Library with enough data to populate multiple groups (plays, ratings, multi-album artists)

## 1. Run the stack

```pwsh
cd backend
npm run dev
```

```pwsh
cd frontend
npm run dev
```

## 2. Smoke-test per-group APIs

Replace `<libraryId>` with your active Plex section ID.

```pwsh
# Home preview (10 items)
curl "http://localhost:3000/api/v1/library/albums/groups/recently-added?libraryId=<libraryId>" | jq '.items | length'

# View-all cap (20 items)
curl "http://localhost:3000/api/v1/library/albums/groups/recently-added?libraryId=<libraryId>&limit=20" | jq '.items | length'

# Random picks (no view-all page; tile is frontend-only)
curl "http://localhost:3000/api/v1/library/albums/groups/random-picks?libraryId=<libraryId>&limit=10" | jq '.items | length'
```

Expected: lengths ≤ requested `limit`; empty arrays when group has no qualifiers.

## 3. Manual UI checklist

Open `/` (library home):

- [ ] Groups appear in fixed order; slow groups show row skeletons, not full-page spinner
- [ ] Each row has up to 10 cards (Random Picks: 10 albums + Browse All tile)
- [ ] All cards same width; horizontal scroll does not loop
- [ ] "View all" under Recently Added / Played / Hidden Gems / Artist Spotlights (not under Random Picks)
- [ ] View all → dense grid page with up to 20 items (Browse All styling)
- [ ] Disconnect Plex mid-load → one row errors with Retry; other rows still work
- [ ] Retry reloads only that row

## 4. Automated tests

```pwsh
cd backend
npm test -- album-groups
```

```pwsh
cd frontend
npm test -- library-group
```

## 5. Success criteria spot-check

| ID | Check |
|----|--------|
| SC-001 | First group visible < 2 s (Network tab: parallel group requests) |
| SC-002 | DevTools measure card widths — all 160px |
| SC-003 | Rows show 10 items when library has enough data |
| SC-005 | Recently Added view-all shows ≤20, newest first |

Record results in the feature PR or append a "Verification results" subsection here after implementation.
