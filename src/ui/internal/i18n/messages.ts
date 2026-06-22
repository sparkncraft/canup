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

export const creditCounterMessages = defineMessages({
  loggedInAs: {
    id: 'canup.creditCounter.loggedInAs',
    defaultMessage: "You're logged in as {email}.",
  },
  manageSubscription: {
    id: 'canup.creditCounter.manageSubscription',
    defaultMessage: 'Manage subscription',
  },
  upgradeForMore: {
    id: 'canup.creditCounter.upgradeForMore',
    defaultMessage: 'Upgrade for more credits',
  },
  exhausted: {
    id: 'canup.creditCounter.exhausted',
    defaultMessage: "You don't have enough credits left.",
  },
  exhaustedRefresh: {
    id: 'canup.creditCounter.exhaustedRefresh',
    defaultMessage: 'Credits refresh {resetDate}.',
  },
  usage: {
    id: 'canup.creditCounter.usage',
    defaultMessage: 'Used {used} of {quota} {quota, plural, one {credit} other {credits}}.',
  },
  refreshInterval: {
    id: 'canup.creditCounter.refreshInterval',
    defaultMessage:
      'Credits refresh {interval, select, daily {daily} weekly {weekly} monthly {monthly} other {daily}}.',
  },
  cancelScheduled: {
    id: 'canup.creditCounter.cancelScheduled',
    defaultMessage: 'Subscription ends {cancelDate}.',
  },
});
