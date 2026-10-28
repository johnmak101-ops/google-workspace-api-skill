export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, message: string) {
    super(message.slice(0, 500));
    this.name = 'ApiError';
    this.status = status;
    this.code = `HTTP_${status}`;
  }
}
