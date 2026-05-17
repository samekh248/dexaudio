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
