export class GameNotFoundError extends Error {
  constructor(slug: string) {
    super(`Game not found: ${slug}`);
    this.name = "GameNotFoundError";
  }
}

export class InvalidGameResultError extends Error {
  constructor(reason: string) {
    super(`Invalid game result: ${reason}`);
    this.name = "InvalidGameResultError";
  }
}

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class RateLimitedError extends Error {
  constructor(message = "Rate limited") {
    super(message);
    this.name = "RateLimitedError";
  }
}
