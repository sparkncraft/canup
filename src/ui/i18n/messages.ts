import { defineMessages } from 'react-intl';

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
    defaultMessage:
      'Used {used} of {quota} {used, plural, one {credit} other {credits}}.',
  },
  refreshInterval: {
    id: 'canup.creditCounter.refreshInterval',
    defaultMessage:
      'Credits refresh {interval, select, daily {daily} weekly {weekly} monthly {monthly} other {daily}}.',
  },
});
