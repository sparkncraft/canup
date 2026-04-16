# CanUp

Managed backend for Canva Apps. Deploy serverless actions, manage credits, and drop in React components -- all from one package.

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
npx canup actions new generate-text   # Scaffold an action
npx canup actions deploy generate-text # Deploy to AWS Lambda
```

## React Components

Import components directly from `canup` in your Canva app:

```tsx
import { ActionButton, CreditCounter } from 'canup';

function App() {
  return (
    <div>
      <ActionButton
        action="generate-text"
        params={{ prompt: 'Hello world' }}
        onResult={(data) => console.log(data.result)}
        onError={(error) => console.error(error.message)}
        variant="primary"
      >
        Generate
      </ActionButton>
      <CreditCounter action="generate-text" />
    </div>
  );
}
```

`ActionButton` and `CreditCounter` share a reactive credit store. When a user clicks an `ActionButton` and consumes credits, every `CreditCounter` on the page updates automatically -- no prop drilling, no context providers, no state management boilerplate.

`CreditCounter` is localized out of the box for all 18 Canva-supported languages. If your app uses [`AppI18nProvider`](https://www.canva.dev/docs/apps/localization/), credit text renders in the user's locale automatically. No configuration needed -- English is the default fallback.

## Hooks

For full control, use the hooks directly:

```tsx
import { useAction, useCredits } from 'canup';

function MyComponent() {
  const { execute, loading, error } = useAction('generate-text');
  const { data, exhausted, refresh } = useCredits('generate-text');

  const handleClick = async () => {
    const { result, durationMs } = await execute({ prompt: 'Hello' });
    console.log(result, `${durationMs}ms`);
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

## CLI Commands

| Command        | Description                                                      |
| -------------- | ---------------------------------------------------------------- |
| `canup init`   | Initialize a project (auto-login, app linking, dependency setup) |
| `canup login`  | Authenticate via GitHub OAuth                                    |
| `canup logout` | Clear stored credentials                                         |
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
| `canup actions logs <name>`         | View execution logs                       |
| `canup actions logs <name> --search <term>` | Search logs by text (matches action, user/brand IDs, error type, error message, stack trace, print output) |
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
4. Users click the button, the action runs on AWS Lambda, credits are tracked automatically

## Exports

**Components:** `ActionButton`, `CreditCounter`

**Hooks:** `useAction`, `useCredits`

**Types:** `ActionButtonProps`, `CreditCounterProps`, `UseActionResult`, `UseCreditsResult`, `CreditBalance`, `ActionResult`, `CanupError`

## License

MIT
