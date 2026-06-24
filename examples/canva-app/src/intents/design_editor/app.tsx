import { useState } from 'react';
import { Alert, FormField, Rows, Text, TextInput } from '@canva/app-ui-kit';
import { addElementAtPoint, addElementAtCursor } from '@canva/design';
import { useFeatureSupport } from '@canva/app-hooks';
import { ActionButton, SubscriptionStatus } from '@canup/ui';
import type { CanupError } from '@canup/ui';
import * as styles from 'styles/components.css';

type ResultState =
  | { kind: 'idle' }
  | { kind: 'success'; text: string }
  | { kind: 'empty' }
  | { kind: 'error'; message: string };

export function App() {
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState<ResultState>({ kind: 'idle' });

  const isSupported = useFeatureSupport();
  const addElement = [addElementAtPoint, addElementAtCursor].find((fn) => isSupported(fn));

  const handleResult = async (actionResult: unknown) => {
    const text =
      actionResult && typeof actionResult === 'object' && 'text' in actionResult
        ? String((actionResult as { text: unknown }).text)
        : null;

    if (text == null) {
      // Demo apps ship without a backing action — render the hint inline
      // instead of throwing an OS-level modal at the user on every click.
      setResult({ kind: 'empty' });
      return;
    }

    setResult({ kind: 'success', text });

    if (addElement) {
      await addElement({ type: 'text', children: [text] });
    }
  };

  const handleError = (error: CanupError) => {
    setResult({
      kind: 'error',
      message: error.code === 'CREDITS_EXHAUSTED' ? 'No credits remaining.' : error.message,
    });
  };

  return (
    <div className={styles.scrollContainer}>
      <Rows spacing="2u">
        <FormField
          label="Prompt"
          control={(props) => (
            <TextInput
              {...props}
              value={prompt}
              onChange={(value) => {
                setPrompt(value);
              }}
              placeholder="Enter a prompt..."
            />
          )}
        />
        {/* Action panel: the button plus its live credit status, one drop-in
            (ActionButton renders ActionCredits below itself by default). */}
        <ActionButton
          action="generate-text"
          params={{ prompt }}
          onResult={handleResult}
          onError={handleError}
          variant="primary"
          stretch
          disabled={!addElement}
        >
          Generate Text
        </ActionButton>
        {result.kind === 'success' && (
          <Alert tone="positive" title="Generated">
            <Text>{result.text}</Text>
          </Alert>
        )}
        {result.kind === 'empty' && (
          <Alert tone="info" title="No text returned">
            <Text>Hook up your generate-text action server-side to render real output here.</Text>
          </Alert>
        )}
        {result.kind === 'error' && (
          <Alert tone="critical" title="Action failed">
            <Text>{result.message}</Text>
          </Alert>
        )}
        {/* Account area: subscription status + manage/subscribe pathway. */}
        <SubscriptionStatus />
      </Rows>
    </div>
  );
}
