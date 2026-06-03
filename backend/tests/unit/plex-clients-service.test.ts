import { describe, expect, it } from "vitest";
import {
  buildClientBaseUri,
  isMusicNetworkPlayer,
  parseClientsXml,
} from "../../src/services/plex/plex-clients-service.js";

describe("plex-clients-service", () => {
  it("parses Server entries from clients XML", () => {
    const xml = `<MediaContainer>
      <Server name="Plexamp" product="Plexamp" machineIdentifier="amp-1" address="192.168.1.2" port="32500" protocol="http" provides="player,music"/>
      <Server name="DexAudio" product="DexAudio" machineIdentifier="dex-audio-player" provides="player"/>
    </MediaContainer>`;
    const clients = parseClientsXml(xml);
    expect(clients).toHaveLength(2);
    expect(clients[0].name).toBe("Plexamp");
  });

  it("filters music players and excludes DexAudio self", () => {
    expect(
      isMusicNetworkPlayer({
        provides: "player,music",
        machineIdentifier: "amp-1",
        product: "Plexamp",
      }),
    ).toBe(true);
    expect(
      isMusicNetworkPlayer({
        provides: "player",
        machineIdentifier: "dex-audio-player",
        product: "DexAudio",
      }),
    ).toBe(false);
  });

  it("builds base URI from address and port", () => {
    expect(
      buildClientBaseUri({
        protocol: "http",
        address: "10.0.0.5",
        port: "32500",
      }),
    ).toBe("http://10.0.0.5:32500");
  });

  it("builds base URI from host when address is absent", () => {
    expect(
      buildClientBaseUri({
        protocol: "http",
        host: "192.168.1.13",
        port: "32500",
      }),
    ).toBe("http://192.168.1.13:32500");
  });

  it("accepts players that only advertise protocolCapabilities playback", () => {
    expect(
      isMusicNetworkPlayer({
        name: "Living Room",
        host: "192.168.1.13",
        machineIdentifier: "12345678-ABCD",
        product: "Plex for Apple TV",
        protocolCapabilities: "playback,playqueues,timeline",
      }),
    ).toBe(true);
  });
});
