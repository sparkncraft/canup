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
 * Fields present on every balance regardless of subscription state.
 * `billingAvailable` gates the subscribe/manage CTA — true when the app has
 * billing connected. It's a stable flag (no token), so it rides both the REST
 * read and the SSE update; the subscribe URL itself is never on the wire — it's
 * minted on demand at click via `POST /subscribe/link`.
 */
const balanceCommonShape = {
  quota: z.number().nullable(),
  used: z.number(),
  remaining: z.number(),
  // Date is JSON-serialized to ISO string on the wire.
  resetAt: z.string().nullable(),
  interval: creditIntervalSchema.nullable(),
  billingAvailable: z.boolean(),
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
 * Credit balance from `GET /run/:slug/credits` and the SSE `credits.update`
 * event. Derived from {@link creditBalanceSchema} so the two can't drift.
 */
export type CreditBalance = z.infer<typeof creditBalanceSchema>;
