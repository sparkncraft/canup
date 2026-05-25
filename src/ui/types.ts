/** Credit balance data from GET /run/:slug/credits */
export interface CreditBalance {
  subscribed: boolean;
  quota: number | null;
  used: number;
  remaining: number;
  resetAt: string | null;
  interval: 'daily' | 'weekly' | 'monthly' | 'lifetime' | null;
  /** When the subscription will end if cancellation is scheduled at period
   *  end. Null when the sub will renew normally OR the user is unsubscribed.
   *  ISO-8601 on the wire — same shape as resetAt. */
  cancelAt: string | null;
  email: string | null;
  billingUrl: string | null;
}

/** Action execution result from POST /run/:slug */
export interface ActionResult {
  result: unknown;
  durationMs: number;
  credits?: CreditBalance;
}
