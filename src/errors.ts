export class WorkspaceError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'WorkspaceError';
    this.code = code;
  }
}
