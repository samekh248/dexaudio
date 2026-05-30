import type { PlaybackFailure } from "@dexaudio/shared-types";

export type PlaybackStatus =
  | "idle"
  | "loading"
  | "ready"
  | "playing"
  | "paused"
  | "buffering"
  | "recovering"
  | "ended"
  | "failed";

export interface RecoveryState {
  attempt: number;
  lastErrorAt: number | null;
  stallStartedAt: number | null;
}

export interface PlaybackMachineState {
  status: PlaybackStatus;
  positionMs: number;
  recovery: RecoveryState;
  failure: PlaybackFailure | null;
}

export type PlaybackMachineEvent =
  | { type: "LOAD" }
  | { type: "LOADED"; autoplay?: boolean }
  | { type: "PLAY" }
  | { type: "PAUSE" }
  | { type: "STALL"; nowMs: number }
  | { type: "RESUME" }
  | { type: "RETRY"; nowMs: number }
  | { type: "ERROR"; recoverable: boolean; retriesLeft: boolean; failure: PlaybackFailure | null }
  | { type: "ENDED" }
  | { type: "CANCEL" }
  | { type: "SEEK"; positionMs: number };

export const initialPlaybackMachineState: PlaybackMachineState = {
  status: "idle",
  positionMs: 0,
  recovery: { attempt: 0, lastErrorAt: null, stallStartedAt: null },
  failure: null,
};

function resetRecovery(): RecoveryState {
  return { attempt: 0, lastErrorAt: null, stallStartedAt: null };
}

export function reducePlaybackMachine(
  state: PlaybackMachineState,
  event: PlaybackMachineEvent,
): PlaybackMachineState {
  switch (event.type) {
    case "LOAD":
      return {
        status: "loading",
        positionMs: 0,
        recovery: resetRecovery(),
        failure: null,
      };

    case "CANCEL":
      return { ...initialPlaybackMachineState };

    case "LOADED":
      return {
        ...state,
        status: event.autoplay ? "playing" : "ready",
        failure: null,
      };

    case "PLAY":
      if (state.status === "ready" || state.status === "paused") {
        return { ...state, status: "playing", failure: null };
      }
      return state;

    case "PAUSE":
      if (state.status === "playing" || state.status === "buffering") {
        return { ...state, status: "paused" };
      }
      return state;

    case "STALL":
      if (state.status === "playing") {
        return {
          ...state,
          status: "buffering",
          recovery: { ...state.recovery, stallStartedAt: event.nowMs },
        };
      }
      return state;

    case "RESUME":
      if (state.status === "buffering") {
        return {
          ...state,
          status: "playing",
          recovery: { ...state.recovery, stallStartedAt: null },
        };
      }
      return state;

    case "RETRY":
      return {
        ...state,
        status: "recovering",
        recovery: {
          ...state.recovery,
          attempt: state.recovery.attempt + 1,
          lastErrorAt: event.nowMs,
          stallStartedAt: null,
        },
      };

    case "ERROR":
      if (event.recoverable && event.retriesLeft) {
        return {
          ...state,
          status: "recovering",
          recovery: {
            ...state.recovery,
            attempt: state.recovery.attempt + 1,
            lastErrorAt: Date.now(),
          },
        };
      }
      return {
        ...state,
        status: "failed",
        failure: event.failure,
      };

    case "ENDED":
      return { ...state, status: "ended" };

    case "SEEK":
      return { ...state, positionMs: Math.max(0, event.positionMs) };

    default:
      return state;
  }
}

export function isTerminalStatus(status: PlaybackStatus): boolean {
  return status === "ended" || status === "failed";
}

export function isLoadingIndicatorStatus(status: PlaybackStatus): boolean {
  return status === "loading" || status === "buffering" || status === "recovering";
}
