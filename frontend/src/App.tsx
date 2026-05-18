import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/AppShell";
import { AlbumGridPage } from "@/pages/AlbumGridPage";
import { AlbumDetailPage } from "@/pages/AlbumDetailPage";
import { ArtistAlbumsPage } from "@/pages/ArtistAlbumsPage";
import { NowPlayingPage } from "@/pages/NowPlayingPage";
import { SearchPage } from "@/pages/SearchPage";
import { StatsPage } from "@/pages/StatsPage";
import { CollectionPage } from "@/pages/CollectionPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { PlexSetupPage } from "@/pages/onboarding/PlexSetupPage";
import { useThemeSync } from "@/hooks/use-theme-sync";

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

function AppRoutes() {
  useThemeSync();
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<AlbumGridPage />} />
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
