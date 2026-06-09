import type { CreditBalance } from './internal/credit-balance.js';

export type { CreditBalance };

/** Action execution result from POST /run/:slug */
export interface ActionResult {
  result: unknown;
  durationMs: number;
  credits?: CreditBalance;
}
