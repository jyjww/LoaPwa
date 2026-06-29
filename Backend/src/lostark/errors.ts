// src/lostark/errors.ts

/**
 * Base class for all LostArk API errors.
 */
export class LostArkApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * 401 - API key is invalid or expired.
 */
export class LostArkApiKeyInvalidError extends LostArkApiError {
  constructor(public readonly keyHash: string) {
    super(`LostArk API key is invalid or expired (keyHash=${keyHash})`);
  }
}

/**
 * 403 - IP is blocked or the key has no permission for the requested endpoint.
 */
export class LostArkApiForbiddenError extends LostArkApiError {
  constructor(public readonly path: string) {
    super(`LostArk API access forbidden for path=${path}`);
  }
}

/**
 * 429 - Rate limit exceeded.
 */
export class LostArkRateLimitError extends LostArkApiError {
  constructor(
    public readonly keyHash: string,
    public readonly retryAfterSeconds: number,
  ) {
    super(
      `LostArk API rate limit exceeded for keyHash=${keyHash}. Retry after ${retryAfterSeconds}s`,
    );
  }
}

/**
 * 5xx - LostArk server-side error.
 */
export class LostArkApiServerError extends LostArkApiError {
  constructor(
    public readonly status: number,
    public readonly path: string,
  ) {
    super(`LostArk API server error: status=${status} path=${path}`);
  }
}

/**
 * The API key is currently in a rate-limit cooldown state.
 * Callers should wait until the cooldown expires before retrying.
 */
export class LostArkCooldownError extends LostArkApiError {
  constructor(public readonly keyHash: string) {
    super(`LostArk API key is in cooldown (keyHash=${keyHash})`);
  }
}
