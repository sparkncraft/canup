# @canup/ui

React components for monetized [Canva apps](https://www.canva.dev/), backed by [CanUp](https://canup.link).

[![npm](https://img.shields.io/npm/v/@canup/ui)](https://www.npmjs.com/package/@canup/ui)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/sparkncraft/canup/blob/main/LICENSE)

CanUp gives a Canva app a managed backend — deploy serverless actions, meter credits, and sell
subscriptions without running servers. `@canup/ui` is the front-end half: drop-in components that
run your actions and render credit and subscription status that passes Canva's Monetization Status
review.

Pair it with [`@canup/cli`](https://www.npmjs.com/package/@canup/cli) to scaffold and deploy the backend.

## Install

```sh
npm install @canup/ui
```

### Peer dependencies

`@canup/ui` targets Canva's current app baseline and expects these to already be present in your app:

| Peer                              | Range              |
| --------------------------------- | ------------------ |
| `react`                           | `>=19 <20`         |
| `@canva/app-ui-kit`               | `>=5 <6`           |
| `@canva/platform`, `@canva/user`  | `>=2`              |
| `react-intl`                      | `>=6.6.8 <=7.1.11` |

## Quick start

```tsx
import { ActionButton, SubscriptionStatus } from '@canup/ui';

function App() {
  return (
    <>
      {/* Action panel — the button plus its live, per-action credit status. */}
      <ActionButton action="generate-text" params={{ prompt: 'Hello world' }} onResult={console.log}>
        Generate
      </ActionButton>

      {/* Account area — subscription status + manage / subscribe pathway. */}
      <SubscriptionStatus />
    </>
  );
}
```

Every component shares one reactive store, kept live over a single server-sent-events stream. When a
user spends credits or changes their subscription, every component on the page updates — no context
providers, no prop drilling, no state-management boilerplate.

## Components

### `<ActionButton action … showCredits?>`

Runs a deployed action when clicked. Disables itself when the user is out of credits and — on by
default — renders the per-action credit status directly below the button, so a blocked state always
shows a reason and a resolution. Pass `showCredits={false}` for the bare button.

### `<ActionCredits action>`

Per-action credit status: how many credits remain, when they refresh, and — when the balance is
exhausted — a critical alert with a "Buy credits" call to action. Renders nothing for actions that
aren't credit-metered.

### `<SubscriptionStatus>`

The customer's billing status — subscribed, on trial, payment past due, or not yet subscribed — each
with the appropriate manage / subscribe call to action. Renders nothing when the app has no billing
configured.

## Hooks

For full control, the same data the components use is available directly:

- `useAction(action)` — run an action and track its loading / error state.
- `useCredits(action)` — live per-action credit balance.
- `useCustomer()` — live customer-level billing state (app name, subscription status, trial /
  cancellation dates, email).

```tsx
import { useAction, useCredits } from '@canup/ui';

const { execute, loading } = useAction('generate-text');
const { data, exhausted } = useCredits('generate-text');
```

## Passing Canva's Monetization Status review

Canva's [Monetization Status guidelines](https://www.canva.dev/docs/apps/design-guidelines/monetization-status/)
require apps to show users their credit / subscription status, a way to manage it, and to attribute
every credit and plan to the app by name. These components do that out of the box — put
`<ActionButton>` in your action panel and `<SubscriptionStatus>` in your account area, and the
compliant layout is handled for you.

- The **app name** is resolved server-side — no configuration needed.
- **Payment calls to action are hidden automatically** on platforms that forbid external payment
  flows (e.g. iOS), while status still shows.
- Copy is **localized** for Canva-supported languages via
  [`AppI18nProvider`](https://www.canva.dev/docs/apps/localization/), with English as the fallback.

See the [complete example app](https://github.com/sparkncraft/canup/tree/main/examples/canva-app) for
a worked, compliant reference.

## License

MIT
