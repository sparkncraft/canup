/**
 * Shared input utilities for CLI commands.
 *
 * Provides hidden-input prompts and stdin-pipe reading for commands
 * that accept sensitive values (secrets, API keys, etc.).
 */

/**
 * Read a line of hidden input from the terminal.
 * Echoes '*' for each character typed, supports backspace.
 */
export function readHiddenInput(prompt: string): Promise<string> {
  return new Promise((resolve, _reject) => {
    process.stderr.write(prompt);

    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf-8');

    let input = '';

    const onData = (key: string): void => {
      if (key === '\r' || key === '\n') {
        // Enter pressed -- resolve
        process.stderr.write('\n');
        cleanup();
        resolve(input);
      } else if (key === '\x03') {
        // Ctrl+C -- exit
        cleanup();
        process.exit(1);
      } else if (key === '\x7f' || key === '\b') {
        // Backspace -- remove last char
        if (input.length > 0) {
          input = input.slice(0, -1);
          process.stderr.write('\b \b');
        }
      } else {
        // Regular character -- append and show asterisk
        input += key;
        process.stderr.write('*');
      }
    };

    const cleanup = (): void => {
      stdin.removeListener('data', onData);
      stdin.setRawMode(false);
      stdin.pause();
    };

    stdin.on('data', onData);
  });
}

/**
 * Read all data from stdin pipe.
 */
export function readStdinPipe(): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    process.stdin.on('data', (chunk: Buffer) => chunks.push(chunk));
    process.stdin.on('end', () => {
      resolve(Buffer.concat(chunks).toString('utf-8').trim());
    });
    process.stdin.on('error', reject);
  });
}
