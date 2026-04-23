/** Credit balance data from GET /run/:slug/credits */
export interface CreditBalance {
  subscribed: boolean;
  quota: number | null;
  used: number;
  remaining: number;
  resetAt: string | null;
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
