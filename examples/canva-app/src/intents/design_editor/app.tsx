import { useState } from 'react';
import { FormField, Rows, TextInput } from '@canva/app-ui-kit';
import { addElementAtPoint, addElementAtCursor } from '@canva/design';
import { notification } from '@canva/platform';
import { useFeatureSupport } from '@canva/app-hooks';
import { ActionButton, CreditCounter } from 'canup';
import type { CanupError } from 'canup';
import * as styles from 'styles/components.css';

export function App() {
  const [prompt, setPrompt] = useState('');

  const isSupported = useFeatureSupport();
  const addElement = [addElementAtPoint, addElementAtCursor].find((fn) => isSupported(fn));

  const handleResult = async (data: { result: unknown; durationMs: number }) => {
    const { text } = data.result as { text: string; generatedAt: string };

    if (addElement) {
      await addElement({ type: 'text', children: [text] });
      void notification.addToast({ messageText: 'Added to design.' });
    } else {
      void notification.addToast({ messageText: 'Cannot add elements in this context.' });
    }
  };

  const handleError = (error: CanupError) => {
    void notification.addToast({
      messageText: error.type === 'CREDITS_EXHAUSTED' ? 'No credits remaining.' : error.message,
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
        <CreditCounter action="generate-text" />
      </Rows>
    </div>
  );
}
