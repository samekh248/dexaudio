import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { AlbumsHomePage } from "@/pages/AlbumsHomePage";
import { BrowseAllAlbumsPage } from "@/pages/BrowseAllAlbumsPage";
import { CategoryAlbumsPage } from "@/pages/CategoryAlbumsPage";
import { CategorySpotlightsPage } from "@/pages/CategorySpotlightsPage";
import { AlbumDetailPage } from "@/pages/AlbumDetailPage";
import { ArtistAlbumsPage } from "@/pages/ArtistAlbumsPage";
import { NowPlayingPage } from "@/pages/NowPlayingPage";
import { SearchPage } from "@/pages/SearchPage";
import { StatsPage } from "@/pages/StatsPage";
import { CollectionPage } from "@/pages/CollectionPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { PlexSetupPage } from "@/pages/onboarding/PlexSetupPage";
import { useThemeSync } from "@/hooks/use-theme-sync";
import { useLibraryRefreshOnLaunch } from "@/hooks/use-library-refresh";
import { useRecentlyPlayedRefresh } from "@/hooks/use-recently-played-refresh";
import { Toaster } from "@/components/ui/sonner";
import { PlayerProvider } from "@/contexts/player-context";
import { bootstrapPlaybackSession } from "@/lib/playback-bootstrap";
import { initPlaybackPersistence } from "@/stores/playback-queue-store";
import { hydratePlaybackOutputFromStorage } from "@/lib/playback-output-store";
import {
  hydrateNetworkCastPrefsFromStorage,
  isNetworkCastEnabled,
} from "@/lib/network-cast-prefs-store";
import { selectLocalOutput } from "@/lib/network-playback-orchestrator";
import { usePlaybackOutputStore } from "@/lib/playback-output-store";
import { initNetworkQueueSync } from "@/lib/network-playback-orchestrator";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

bootstrapPlaybackSession();
hydratePlaybackOutputFromStorage();
hydrateNetworkCastPrefsFromStorage();
if (!isNetworkCastEnabled() && usePlaybackOutputStore.getState().isNetworkMode()) {
  void selectLocalOutput();
}

function AppRoutes() {
  useThemeSync();
  useLibraryRefreshOnLaunch();
  useRecentlyPlayedRefresh();
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<AlbumsHomePage />} />
        <Route path="albums/all" element={<BrowseAllAlbumsPage />} />
        <Route path="library/recently-added" element={<CategoryAlbumsPage />} />
        <Route path="library/recently-played" element={<CategoryAlbumsPage />} />
        <Route path="library/hidden-gems" element={<CategoryAlbumsPage />} />
        <Route path="library/artist-spotlights" element={<CategorySpotlightsPage />} />
        <Route path="albums" element={<Navigate to="/" replace />} />
        <Route path="albums/:albumId" element={<AlbumDetailPage />} />
        <Route path="artists/:artistId" element={<ArtistAlbumsPage />} />
        <Route path="now-playing" element={<NowPlayingPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="stats" element={<StatsPage />} />
        <Route path="collection" element={<CollectionPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="setup" element={<PlexSetupPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  useEffect(() => {
    const unsubQueueSync = initNetworkQueueSync();
    const unsubPersist = initPlaybackPersistence();
    return () => {
      unsubQueueSync();
      unsubPersist();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <PlayerProvider>
          <AppRoutes />
          <Toaster />
        </PlayerProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
