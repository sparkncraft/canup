import type { Language } from '@canup/types';
import { formatBytes, type CanupClient } from '../../api-client.js';
import { error } from '../../ui/output.js';
import { createSpinner } from '../../ui/spinner.js';

export const BUILD_POLL_INTERVAL_MS = 2000;
export const MAX_LAYER_SIZE_DISPLAY = '250MB';

/** Validate the `--language` option, exiting with a message on anything else. */
export function assertLanguage(language: string): asserts language is Language {
  if (language !== 'python' && language !== 'nodejs') {
    error(`Invalid language: "${language}". Must be "python" or "nodejs".`);
    process.exit(1);
  }
}

/**
 * Poll a layer build to completion, driving the spinner with elapsed seconds.
 * `progress` is the in-flight verb phrase ("Building layer" / "Rebuilding
 * layer") and `done` the success phrase. Resolves on success; exits the
 * process on a failed build.
 */
export async function pollLayerBuild(
  client: CanupClient,
  appId: string,
  language: Language,
  buildId: string,
  { progress, done }: { progress: string; done: string },
): Promise<void> {
  const spin = createSpinner(`${progress}...`);
  const startTime = Date.now();

  while (true) {
    await new Promise((resolve) => setTimeout(resolve, BUILD_POLL_INTERVAL_MS));

    const build = await client.getBuildStatus(appId, language, buildId);

    if (build.status === 'success') {
      const sizeLabel = build.sizeBytes != null ? formatBytes(build.sizeBytes) : '?';
      spin.succeed(`${done} (${sizeLabel} / ${MAX_LAYER_SIZE_DISPLAY})`);
      return;
    }

    if (build.status === 'failed') {
      spin.fail(`Build failed: ${build.errorMessage ?? 'Unknown error'}`);
      process.exit(1);
    }

    // Still building -- update spinner with elapsed time
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
    spin.update(`${progress}... (${elapsed}s)`);
  }
}
