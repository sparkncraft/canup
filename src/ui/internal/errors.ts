/**
 * CanupError with type discrimination.
 * Consumers can check error.type to determine the error category.
 */
export type CanupErrorType =
  | 'CREDITS_EXHAUSTED'
  | 'ACTION_NOT_FOUND'
  | 'NO_DEPLOYED_CODE'
  | 'HTTP_ERROR'
  | 'NETWORK_ERROR';

export class CanupError extends Error {
  readonly type: CanupErrorType;
  readonly details?: Record<string, unknown>;

  constructor(type: CanupErrorType, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'CanupError';
    this.type = type;
    this.details = details;
  }
}
