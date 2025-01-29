export class RateLimitError extends Error {
  public headers: Headers;
  public status: number;

  constructor(message: string, headers: Headers) {
    super(message);
    this.name = 'RateLimitError';
    this.headers = headers;
    this.status = 429; // Too Many Requests
  }
}