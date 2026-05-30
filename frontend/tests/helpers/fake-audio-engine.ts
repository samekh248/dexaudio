import type { AudioEngine, AudioEngineEvents } from "@/lib/audio-engine";

export class FakeAudioEngine implements AudioEngine {
  loads: Array<{ src: string; formatHints: string[] }> = [];
  fadeCalls: Array<{ from: number; to: number; ms: number }> = [];
  private events: AudioEngineEvents | null = null;
  private _state: "unloaded" | "loading" | "loaded" = "unloaded";
  private _positionMs = 0;
  private _durationMs = 0;
  private _volume = 1;
  private _playing = false;

  load(src: string, formatHints: string[], events: AudioEngineEvents): void {
    this.loads.push({ src, formatHints });
    this.events = events;
    this._state = "loading";
  }

  setEvents(events: AudioEngineEvents): void {
    this.events = events;
  }

  /** Test helper: simulate successful load. */
  simulateLoaded(durationMs = 180_000): void {
    this._state = "loaded";
    this._durationMs = durationMs;
    this.events?.onLoaded(durationMs);
  }

  simulateError(err: number | string = 2): void {
    this.events?.onError(err);
  }

  simulateEnded(): void {
    this._playing = false;
    this.events?.onEnded();
  }

  simulateStall(): void {
    this.events?.onStall();
  }

  simulateResume(): void {
    this.events?.onResume();
  }

  play(): void {
    this._playing = true;
    this.events?.onPlay();
  }

  pause(): void {
    this._playing = false;
    this.events?.onPause();
  }

  stop(): void {
    this._playing = false;
    this.events?.onPause();
  }

  seek(ms: number): void {
    this._positionMs = ms;
    this.events?.onProgress(ms);
  }

  getPositionMs(): number {
    return this._positionMs;
  }

  getDurationMs(): number {
    return this._durationMs;
  }

  setVolume(v: number): void {
    this._volume = v;
  }

  getVolume(): number {
    return this._volume;
  }

  fadeVolume(from: number, to: number, ms: number): void {
    this.fadeCalls.push({ from, to, ms });
  }

  state(): "unloaded" | "loading" | "loaded" {
    return this._state;
  }

  destroy(): void {
    this._state = "unloaded";
    this._playing = false;
    this.events = null;
  }

  isPlaying(): boolean {
    return this._playing;
  }
}
