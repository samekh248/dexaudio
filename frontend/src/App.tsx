import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { AlbumsHomePage } from "@/pages/AlbumsHomePage";
import { BrowseAllAlbumsPage } from "@/pages/BrowseAllAlbumsPage";
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

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

function AppRoutes() {
  useThemeSync();
  useLibraryRefreshOnLaunch();
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<AlbumsHomePage />} />
        <Route path="albums/all" element={<BrowseAllAlbumsPage />} />
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
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
