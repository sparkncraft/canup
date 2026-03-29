# Canva App Example with canup

A reference Canva app that demonstrates canup components in a realistic project setup. Shows prompt input via `TextInput`, server-side action execution via `ActionButton`, adding generated text to the Canva canvas, and credit tracking via `CreditCounter`.

## Setup

### Prerequisites

- Node.js 18+
- A [Canva developer account](https://www.canva.dev/) and app created via `canva apps create`

### Steps

1. Install the CLI and authenticate:

   ```bash
   npm install -g canup
   canup login
   ```

2. Copy `.env.template` to `.env` and fill in your Canva app details:

   ```bash
   cp .env.template .env
   ```

3. Initialize the Canup project (auto-detects `CANVA_APP_ID` from `.env`):

   ```bash
   canup init
   ```

4. Deploy the example action:

   ```bash
   canup actions deploy generate-text
   ```

5. Install dependencies and start:

   ```bash
   npm install
   npm start
   ```

6. Open the [Canva Developer Portal](https://www.canva.dev/) and preview your app.

## Key code

| File | Description |
|------|-------------|
| `src/intents/design_editor/app.tsx` | Main app UI with ActionButton and CreditCounter |
| `canup/actions/generate-text.js` | Server-side action handler (replace with your logic) |
| `canup/canup.json` | Canup project configuration |

### Core integration

```tsx
import { ActionButton, CreditCounter } from 'canup';
import type { CanupError } from 'canup';

<ActionButton
  action="generate-text"
  params={{ prompt }}
  onResult={async (data) => {
    const { text } = data.result as { text: string };
    await addElement({ type: 'text', children: [text] });
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

`ActionButton` handles loading states, credit exhaustion, and error display automatically. `CreditCounter` shows the remaining credit balance (renders empty if no credit limit is configured).

To enable credits:

```bash
canup actions credits set generate-text --quota 100 --interval monthly
```

### Using hooks directly

```tsx
import { useAction, useCredits } from 'canup';

function MyComponent() {
  const { execute, loading, error } = useAction('generate-text');
  const { data, exhausted, refresh } = useCredits('generate-text');

  const handleClick = async () => {
    const { result, durationMs } = await execute({ prompt: 'Hello' });
    console.log(result, `completed in ${durationMs}ms`);
  };

  return (
    <button onClick={handleClick} disabled={loading || exhausted}>
      {loading ? 'Running...' : 'Execute Action'}
    </button>
  );
}
```

## Links

- [canup on npm](https://www.npmjs.com/package/canup)
- [Canva SDK documentation](https://www.canva.dev/docs/apps/)
- [Canva App UI Kit](https://www.canva.dev/docs/apps/app-ui-kit/)
