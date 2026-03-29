# canup

Managed backend for Canva Apps. Deploy serverless actions, manage credits, and drop in React components -- all from one package.

## Install

```sh
npm install canup
# or
pnpm add canup
```

## Quick Start

Initialize your project:

```sh
npx canup init
```

This links your directory to a Canva App, creates the `canup/` config folder, and adds `canup` to your `package.json` dependencies.

## CLI Commands

| Command | Description |
|---------|-------------|
| `canup init` | Initialize a Canup project (auto-login, app linking, dependency setup) |
| `canup actions deploy` | Deploy an action script to AWS Lambda |
| `canup actions list` | List all actions for the current app |
| `canup actions new` | Scaffold a new action |
| `canup actions run` | Invoke a deployed action |
| `canup actions logs` | View execution logs |
| `canup status` | Show project and app status |
| `canup login` | Authenticate via GitHub OAuth |

## React Components

Import components directly from `canup` in your Canva app:

```tsx
import { ActionButton, CreditCounter } from 'canup';

function App() {
  return (
    <div>
      <CreditCounter actionSlug="generate-text" />
      <ActionButton
        actionSlug="generate-text"
        label="Generate"
        onSuccess={(result) => console.log(result)}
      />
    </div>
  );
}
```

### Cross-component sync

`ActionButton` and `CreditCounter` share a reactive credit store. When a user clicks an `ActionButton` and consumes credits, every `CreditCounter` on the page updates automatically -- no prop drilling, no context providers, no state management boilerplate.

### Available exports

**Components:** `ActionButton`, `CreditCounter`

**Hooks:** `useAction`, `useCredits`

**Types:** `ActionButtonProps`, `CreditCounterProps`, `UseActionResult`, `UseCreditsResult`, `CreditBalance`, `ActionResult`, `CanupError`, `CanupErrorType`

## How It Works

1. Write a backend action (Python or Node.js) in your `canup/actions/` folder
2. Deploy with `canup actions deploy`
3. Import `ActionButton` in your Canva app to trigger it
4. Users click the button, the action runs on AWS Lambda, credits are tracked automatically

## License

MIT
