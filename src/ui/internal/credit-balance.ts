import { z } from 'zod';

/**
 * Single source of truth for the credit-balance shape shared by the REST
 * `GET /run/:slug/credits` response and the SSE `credits.update` event.
 *
 * A discriminated union on `subscribed`: a subscribed balance carries the
 * customer `email` and the scheduled `cancelAt`; a free-tier balance can't, so
 * it cannot accidentally carry a stray email or cancellation date. Both the
 * realtime event schema and the public `CreditBalance` type derive from this,
 * so the two can't drift.
 */

const creditIntervalSchema = z.enum(['daily', 'weekly', 'monthly', 'lifetime']);

/**
 * Fields present on every balance regardless of subscription state — but NOT
 * `billingUrl`, which is HTTP-scoped (request origin + per-user token mint),
 * rides the REST fetch only, and is added by the `CreditBalance` type below.
 */
const balanceCommonShape = {
  quota: z.number().nullable(),
  used: z.number(),
  remaining: z.number(),
  // Date is JSON-serialized to ISO string on the wire.
  resetAt: z.string().nullable(),
  interval: creditIntervalSchema.nullable(),
};

export const creditBalanceSchema = z.discriminatedUnion('subscribed', [
  z.object({
    subscribed: z.literal(true),
    ...balanceCommonShape,
    // When the subscription will end if cancel_at_period_end is set; null when
    // it will renew normally. ISO-8601 string, same shape as resetAt.
    cancelAt: z.string().nullable(),
    // Stripe customer email while subscribed; null when the customer was deleted.
    email: z.string().nullable(),
  }),
  z.object({ subscribed: z.literal(false), ...balanceCommonShape }),
]);

/**
 * Credit balance from `GET /run/:slug/credits`. Derived from
 * {@link creditBalanceSchema} so it can't drift from the SSE `credits.update`
 * event, plus the HTTP-scoped `billingUrl` (the billing-portal link, set on the
 * initial fetch and preserved across live updates — it isn't on the SSE wire).
 */
export type CreditBalance = z.infer<typeof creditBalanceSchema> & {
  billingUrl: string | null;
};
