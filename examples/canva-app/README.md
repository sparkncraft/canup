# Canva App Example with canup

## What this is

A reference Canva app that demonstrates [canup](../../src/ui/) components in a realistic developer project setup. It shows the complete integration flow: prompt input via `TextInput`, server-side action execution via `ActionButton`, adding generated text to the Canva canvas, and credit tracking via `CreditCounter`.

Use this example as a starting point for building your own Canva apps powered by Canup.

## Setup

### Prerequisites

- Node.js 18+
- A [Canva developer account](https://www.canva.dev/) and app created via `canva apps create`
- If running from the monorepo, build `canup` first:
  ```
  pnpm --filter canup build
  ```

### Steps

1. Install the Canup CLI globally:

   ```bash
   npm install -g @canup/cli
   ```

2. Authenticate with the Canup platform:

   ```bash
   canup login
   ```

3. Copy `.env.template` to `.env` and fill in your `CANVA_APP_ID` from the [Canva Developer Portal](https://www.canva.dev/):

   ```bash
   cp .env.template .env
   ```

4. Initialize the Canup project directory (auto-detects `CANVA_APP_ID` from `.env`):

   ```bash
   canup init
   ```

5. Scaffold the action handler (or use the one already included in `canup/actions/`):

   ```bash
   canup actions new generate-text
   ```

6. Deploy your action to the Canup platform:

   ```bash
   canup deploy
   ```

7. Install dependencies:

   ```bash
   npm install
   ```

8. Start the webpack dev server:

   ```bash
   npm start
   ```

9. Open the [Canva Developer Portal](https://www.canva.dev/) and preview your app.

> **Note:** When cloned as a standalone project (outside the monorepo), replace `"canup": "file:../../packages/ui"` with `"canup": "^0.1.0"` in `package.json` once the package is published to npm.

## Key code

| File                                  | Description                                          |
| ------------------------------------- | ---------------------------------------------------- |
| `src/intents/design_editor/app.tsx`   | Main app UI with ActionButton and CreditCounter      |
| `canup/actions/generate-text.js`      | Server-side action handler (replace with your logic) |
| `canup/canup.json`                    | Canup project configuration                          |
| `src/intents/design_editor/index.tsx` | Canva intent entry point with providers              |
| `src/index.tsx`                       | Intent registration entry point                      |

### Core integration snippet

```tsx
import { ActionButton, CreditCounter } from "canup";
import type { CanupError } from "canup";

// Inside your component:
<ActionButton
  action="generate-text"
  params={{ prompt }}
  onResult={async (data) => {
    const { text } = data.result as { text: string };
    await addElement({ type: "text", children: [text] });
  }}
  onError={(error: CanupError) => {
    console.error(error.type, error.message);
  }}
  variant="primary"
  stretch
>
  Generate Text
</ActionButton>

<CreditCounter action="generate-text" />
```

`ActionButton` handles loading states, credit exhaustion, and error display automatically. `CreditCounter` fetches and displays the remaining credit balance for the specified action.

> **Note on CreditCounter:** `CreditCounter` only renders content when a credit limit has been configured for the action. If no limit is set, the component renders empty (which is intentional — unlimited actions don't need a counter). To enable it, configure a quota:
>
> ```bash
> canup actions credits set generate-text --quota 100
> # or scoped to a time period:
> canup actions credits set generate-text --quota 100 --interval monthly
> ```
>
> After setting a quota, `CreditCounter` will show the remaining credits.

## Advanced: Using hooks directly

For full programmatic control over action execution and credit data, use the `useAction` and `useCredits` hooks instead of the pre-built components:

```tsx
import { useAction, useCredits } from 'canup';

function MyComponent() {
  const { execute, loading, error } = useAction('generate-text');
  const { data, loading: creditsLoading, exhausted, refresh } = useCredits('generate-text');

  const handleClick = async () => {
    try {
      const { result, durationMs } = await execute({ prompt: 'Hello' });
      console.log(result, `completed in ${durationMs}ms`);
    } catch (err) {
      // Error is also available via the `error` state
      console.error(err);
    }
  };

  return (
    <div>
      <button onClick={handleClick} disabled={loading || exhausted}>
        {loading ? 'Running...' : 'Execute Action'}
      </button>
      {data && (
        <p>
          Credits: {data.remaining} of {data.quota} remaining
        </p>
      )}
    </div>
  );
}
```

The hooks give you direct access to loading states, error objects, and credit balances so you can build fully custom UI around Canup actions.

## Links

- [canup documentation](../../src/ui/)
- [Canva SDK documentation](https://www.canva.dev/docs/apps/)
- [Canva App UI Kit](https://www.canva.dev/docs/apps/app-ui-kit/)
