import type { ErrorBody } from "@dexaudio/shared-types";

export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 500,
    public readonly code?: string,
    public readonly action?: string,
  ) {
    super(message);
    this.name = "AppError";
  }

  toBody(): ErrorBody {
    return {
      message: this.message,
      code: this.code,
      action: this.action,
    };
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Not found") {
    super(message, 404, "NOT_FOUND");
  }
}

export class ValidationError extends AppError {
  constructor(message: string, action?: string) {
    super(message, 400, "VALIDATION_ERROR", action);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Authentication required", action?: string) {
    super(message, 401, "UNAUTHORIZED", action);
  }
}

/** DexAudio has no stored Plex server token (PMS may still be running). */
export class PlexNotConnectedError extends AppError {
  constructor(
    message = "Plex not connected",
    action = "Sign in with Plex in Settings",
  ) {
    super(message, 401, "plex_not_connected", action);
  }
}

export class BadGatewayError extends AppError {
  constructor(message: string, action?: string) {
    super(message, 502, "BAD_GATEWAY", action);
  }
}
