# CanUp

Managed backend for Canva Apps. Deploy serverless actions, meter credits and subscriptions, and drop in React components -- all from one package.

## Install

```sh
npm install canup
# or
pnpm add canup
```

## Quick Start

```sh
npx canup login          # Authenticate via GitHub OAuth
npx canup init           # Link to your Canva app, create canup/ folder
npx canup actions new generate-text    # Scaffold an action
npx canup actions deploy generate-text # Deploy to AWS Lambda
```

## React Components

Import components directly from `canup` in your Canva app:

```tsx
import { ActionButton, SubscriptionStatus } from 'canup';

function App() {
  return (
    <div>
      {/* Action panel: the button plus its live credit status. */}
      <ActionButton
        action="generate-text"
        params={{ prompt: 'Hello world' }}
        onResult={(result) => console.log(result)}
        onError={(error) => console.error(error.message)}
        variant="primary"
        showCredits
      >
        Generate
      </ActionButton>

      {/* Account area: subscription status + manage/subscribe pathway. */}
      <SubscriptionStatus />
    </div>
  );
}
```

All components share one reactive store, kept live over a single server-sent-events
stream. When a user consumes credits or changes their subscription, every component
on the page updates automatically -- no prop drilling, no context providers, no state
management boilerplate.

### `<ActionButton action … showCredits?>`

Runs a deployed action when clicked. Disables itself automatically when the user is out
of credits. Set `showCredits` to render the per-action credit status (an `<ActionCredits>`)
directly below the button.

### `<ActionCredits action>`

Per-action credit status: how many credits remain, when they refresh, and -- when the
balance is exhausted -- a critical alert with a "Buy credits" call to action. Renders
nothing for actions that aren't credit-metered. Use it standalone, or via
`<ActionButton showCredits>`.

### `<SubscriptionStatus>`

The customer's billing status: subscribed, on trial, payment past due, or not yet
subscribed -- each with the appropriate manage/subscribe call to action. Renders nothing
when the app has no billing configured.

### Monetization status -- passing Canva review

Canva's [Monetization Status](https://www.canva.dev/docs/apps/design-guidelines/monetization-status/)
guidelines require apps to show the user their credit/subscription status, a way to manage
it, and to attribute every credit/plan noun with the app's name. These components do that
out of the box: drop `<ActionButton showCredits>` in your action panel and
`<SubscriptionStatus>` in your account area, and the compliant layout is handled for you.
The app name is resolved server-side -- no configuration needed. Payment calls to action
are automatically hidden on platforms that don't permit external payment flows (e.g. iOS),
while status still shows.

Components are localized for the Canva-supported languages via
[`AppI18nProvider`](https://www.canva.dev/docs/apps/localization/), with English as the
default fallback.

See [`examples/canva-app`](./examples/canva-app) for a complete, compliant reference app.

## Hooks

For full control, use the hooks directly:

```tsx
import { useAction, useCredits, useCustomer } from 'canup';

function MyComponent() {
  const { execute, loading } = useAction('generate-text');
  const { data, exhausted } = useCredits('generate-text');
  const { subscriptionStatus, appName } = useCustomer();

  const handleClick = async () => {
    const result = await execute({ prompt: 'Hello' });
    console.log(result);
  };

  return (
    <div>
      <button onClick={handleClick} disabled={loading || exhausted}>
        {loading ? 'Running...' : 'Execute'}
      </button>
      {data && (
        <p>
          {data.remaining} / {data.quota} credits
        </p>
      )}
    </div>
  );
}
```

- `useAction(action)` -- run an action and track its loading/error state.
- `useCredits(action)` -- live per-action credit balance.
- `useCustomer()` -- live customer-level billing state (app name, subscription status,
  trial/cancellation dates, email).

## CLI Commands

| Command        | Description                                                      |
| -------------- | ---------------------------------------------------------------- |
| `canup init`   | Initialize a project (auto-login, app linking, dependency setup) |
| `canup login`  | Authenticate via GitHub OAuth                                    |
| `canup logout` | Clear stored credentials                                        |
| `canup whoami` | Show current user identity                                       |
| `canup status` | Show project and app status                                      |
| `canup pull`   | Download deployed action scripts                                 |

### Actions

| Command                             | Description                               |
| ----------------------------------- | ----------------------------------------- |
| `canup actions new <name>`          | Scaffold a new action (Python or Node.js) |
| `canup actions deploy <name>`       | Deploy an action to AWS Lambda            |
| `canup actions list`                | List all actions for the current app      |
| `canup actions run <name>`          | Invoke a deployed action                  |
| `canup actions test <name>`         | Test an action locally                    |
| `canup actions invocations <name>`  | View invocation history                   |
| `canup actions invocations <name> --search <term>` | Search invocations by text (matches action, user/brand IDs, error type, error message, stack trace, print output) |
| `canup actions remove <name>`       | Remove a deployed action                  |

### Secrets & Dependencies

| Command                      | Description                                    |
| ---------------------------- | ---------------------------------------------- |
| `canup secrets set <key>`    | Set a secret (available as env var in actions) |
| `canup secrets list`         | List all secrets                               |
| `canup secrets delete <key>` | Remove a secret                                |
| `canup deps add <pkg>`       | Add a pip/npm dependency to your actions       |
| `canup deps list`            | List action dependencies                       |
| `canup deps remove <pkg>`    | Remove a dependency                            |

### Stripe Integration

| Command                   | Description                             |
| ------------------------- | --------------------------------------- |
| `canup stripe connect`    | Connect your Stripe account for billing |
| `canup stripe status`     | Show Stripe connection status           |
| `canup stripe disconnect` | Disconnect Stripe                       |

## How It Works

1. Write a backend action (Python or Node.js) in `canup/actions/`
2. Deploy with `canup actions deploy`
3. Import `ActionButton` in your Canva app to trigger it
4. Users click the button, the action runs on AWS Lambda, credits and subscriptions are tracked automatically

## Exports

**Components:** `ActionButton`, `ActionCredits`, `SubscriptionStatus`

**Hooks:** `useAction`, `useCredits`, `useCustomer`

**Types:** `ActionButtonProps`, `ActionCreditsProps`, `UseActionResult`, `UseCreditsResult`, `UseCustomerResult`, `CreditBalance`, `Customer`, `CanupError`

## License

MIT
