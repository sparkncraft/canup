/**
 * Internal types for @canup/ui.
 * These mirror the server API response shapes but are client-side types.
 */

/** Credit balance data from GET /run/:slug/credits */
export interface CreditBalance {
  subscribed: boolean;
  quota: number | null; // null = unlimited (subscribed:true) or no config (subscribed:false)
  used: number;
  remaining: number;
  resetAt: string | null; // ISO string (not Date -- comes from JSON)
  interval: 'daily' | 'weekly' | 'monthly' | 'lifetime' | null;
  email: string | null;
  subscribeUrl: string | null;
}

/** Action execution result from POST /run/:slug */
export interface ActionResult {
  result: unknown;
  durationMs: number;
  credits?: CreditBalance;
}

/** Server error response envelope */
export interface ApiErrorResponse {
  ok: false;
  error: {
    type: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

/** Server success response envelope */
export interface ApiSuccessResponse<T> {
  ok: true;
  data: T;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
