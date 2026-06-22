import { defineMessages } from 'react-intl';

/**
 * Per-action credit status strings (`<ActionCredits>`). Every credit noun is
 * app-name-attributed via a `{hasApp, select, …}` branch so the copy reads
 * correctly whether or not the customer resource (which carries `appName`) has
 * resolved yet — Canva requires attribution to distinguish an app's credits
 * from Canva's own.
 */
export const creditsMessages = defineMessages({
  usage: {
    id: 'canup.credits.usage',
    defaultMessage:
      '{hasApp, select, true {Used {used} of {quota} {appName} {quota, plural, one {credit} other {credits}}} other {Used {used} of {quota} {quota, plural, one {credit} other {credits}}}}',
  },
  refreshSuffix: {
    id: 'canup.credits.refreshSuffix',
    defaultMessage:
      ' · refreshes {interval, select, daily {daily} weekly {weekly} monthly {monthly} other {daily}}',
  },
  exhaustedTitle: {
    id: 'canup.credits.exhaustedTitle',
    defaultMessage:
      "{hasApp, select, true {You're out of {appName} credits} other {You're out of credits}}",
  },
  exhaustedRefresh: {
    id: 'canup.credits.exhaustedRefresh',
    defaultMessage: 'Credits refresh {resetDate}.',
  },
  buy: {
    id: 'canup.credits.buy',
    defaultMessage: '{hasApp, select, true {Buy {appName} credits} other {Buy more credits}}',
  },
});

/**
 * Customer-level subscription status strings (`<SubscriptionStatus>`). Same
 * `{hasApp, select, …}` attribution approach as the credit strings.
 */
export const subscriptionMessages = defineMessages({
  subscribed: {
    id: 'canup.subscription.subscribed',
    defaultMessage:
      "{hasApp, select, true {You're subscribed to {appName}} other {You're subscribed}}",
  },
  manage: {
    id: 'canup.subscription.manage',
    defaultMessage:
      '{hasApp, select, true {Manage {appName} subscription} other {Manage subscription}}',
  },
  cancelScheduled: {
    id: 'canup.subscription.cancelScheduled',
    defaultMessage: 'Subscription ends {cancelDate}.',
  },
  trial: {
    id: 'canup.subscription.trial',
    defaultMessage:
      "{hasApp, select, true {You're on a trial of {appName}} other {You're on a trial}}",
  },
  trialEnds: {
    id: 'canup.subscription.trialEnds',
    defaultMessage: 'Trial ends {trialEndDate}.',
  },
  pastDueTitle: {
    id: 'canup.subscription.pastDueTitle',
    defaultMessage:
      "{hasApp, select, true {There's a problem with your {appName} payment} other {There's a problem with your payment}}",
  },
  subscribe: {
    id: 'canup.subscription.subscribe',
    defaultMessage: '{hasApp, select, true {Subscribe to {appName}} other {Subscribe}}',
  },
  loggedInAs: {
    id: 'canup.subscription.loggedInAs',
    defaultMessage: "You're logged in as {email}.",
  },
});
