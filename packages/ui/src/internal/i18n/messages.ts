import { defineMessages } from 'react-intl';

/**
 * Per-action credit status strings (`<ActionCredits>`). Every credit noun is
 * attributed with the app name — Canva requires this to distinguish an app's
 * credits from Canva's own. Components only render these once the customer
 * resource (which carries `appName`) has resolved, so `{appName}` is always set.
 *
 * `remaining` folds the refresh cadence into the noun phrase as an adjective
 * ("monthly credits"). A missing cadence is meaningful: the `other` arm — which
 * covers `lifetime` and any unset interval — drops the word entirely, since
 * credits with no refresh schedule simply read as "credits left".
 */
export const creditsMessages = defineMessages({
  remaining: {
    id: 'canup.credits.remaining',
    defaultMessage:
      '{interval, select, daily {{remaining} of {quota} {appName} daily credits left} weekly {{remaining} of {quota} {appName} weekly credits left} monthly {{remaining} of {quota} {appName} monthly credits left} other {{remaining} of {quota} {appName} credits left}}',
  },
  exhaustedTitle: {
    id: 'canup.credits.exhaustedTitle',
    defaultMessage: "You're out of {appName} credits.",
  },
  exhaustedRefresh: {
    id: 'canup.credits.exhaustedRefresh',
    defaultMessage: 'Credits refresh {resetDate}.',
  },
  buy: {
    id: 'canup.credits.buy',
    defaultMessage: 'Buy {appName} credits',
  },
});

/** Strings for the payments-gated billing CTAs (`BillingLink`). */
export const billingMessages = defineMessages({
  openFailed: {
    id: 'canup.billing.openFailed',
    defaultMessage: "Couldn't open billing. Please try again.",
  },
});

/**
 * Customer-level subscription status strings (`<SubscriptionStatus>`). Same
 * app-name attribution; `{appName}` is always set (the component renders only
 * once the customer has resolved).
 */
export const subscriptionMessages = defineMessages({
  subscribed: {
    id: 'canup.subscription.subscribed',
    defaultMessage: "You're subscribed to {appName}.",
  },
  manage: {
    id: 'canup.subscription.manage',
    defaultMessage: 'Manage {appName} subscription',
  },
  cancelScheduled: {
    id: 'canup.subscription.cancelScheduled',
    defaultMessage: 'Subscription ends {cancelDate}.',
  },
  trial: {
    id: 'canup.subscription.trial',
    defaultMessage: "You're on a trial of {appName}.",
  },
  trialEnds: {
    id: 'canup.subscription.trialEnds',
    defaultMessage: 'Trial ends {trialEndDate}.',
  },
  pastDueTitle: {
    id: 'canup.subscription.pastDueTitle',
    defaultMessage: "There's a problem with your {appName} payment.",
  },
  freePlan: {
    id: 'canup.subscription.freePlan',
    defaultMessage: "You're on the {appName} free plan.",
  },
  subscribe: {
    id: 'canup.subscription.subscribe',
    defaultMessage: 'Subscribe to {appName}',
  },
  loggedInAs: {
    id: 'canup.subscription.loggedInAs',
    defaultMessage: "You're logged in as {email}.",
  },
});
