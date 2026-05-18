import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlexSettingsSection } from "@/components/settings/PlexSettingsSection";
import { DiscogsSettingsSection } from "@/components/settings/DiscogsSettingsSection";
import { LastfmSettingsSection } from "@/components/settings/LastfmSettingsSection";
import { PlaybackSettingsSection } from "@/components/settings/PlaybackSettingsSection";
import { LibrarySettingsSection } from "@/components/settings/LibrarySettingsSection";
import { MatchingSettingsSection } from "@/components/settings/MatchingSettingsSection";
import { StorageSettingsSection } from "@/components/settings/StorageSettingsSection";
import { AppearanceSettingsSection } from "@/components/settings/AppearanceSettingsSection";

export function SettingsPage() {
  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Settings</h1>
      <Tabs defaultValue="plex">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="plex">Plex</TabsTrigger>
          <TabsTrigger value="discogs">Discogs</TabsTrigger>
          <TabsTrigger value="lastfm">Last.fm</TabsTrigger>
          <TabsTrigger value="playback">Playback</TabsTrigger>
          <TabsTrigger value="library">Library</TabsTrigger>
          <TabsTrigger value="matching">Matching</TabsTrigger>
          <TabsTrigger value="storage">Storage</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
        </TabsList>
        <TabsContent value="plex"><PlexSettingsSection /></TabsContent>
        <TabsContent value="discogs"><DiscogsSettingsSection /></TabsContent>
        <TabsContent value="lastfm"><LastfmSettingsSection /></TabsContent>
        <TabsContent value="playback"><PlaybackSettingsSection /></TabsContent>
        <TabsContent value="library"><LibrarySettingsSection /></TabsContent>
        <TabsContent value="matching"><MatchingSettingsSection /></TabsContent>
        <TabsContent value="storage"><StorageSettingsSection /></TabsContent>
        <TabsContent value="appearance"><AppearanceSettingsSection /></TabsContent>
      </Tabs>
    </div>
  );
}
