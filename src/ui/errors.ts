export class CanupError extends Error {
  readonly type: string;
  readonly details?: Record<string, unknown>;

  constructor(type: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'CanupError';
    this.type = type;
    this.details = details;
  }
}

/** Normalize an unknown caught value into a CanupError. */
export function toCanupError(err: unknown): CanupError {
  if (err instanceof CanupError) return err;
  return new CanupError('NETWORK_ERROR', err instanceof Error ? err.message : 'Request failed');
}
