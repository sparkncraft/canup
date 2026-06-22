import { getPlatformInfo } from '@canva/platform';

/**
 * Whether the current Canva surface permits opening external payment flows.
 * False on platforms that forbid it (e.g. iOS) — callers withhold pay CTAs but
 * keep showing status. `getPlatformInfo()` is a synchronous, session-stable
 * read, so there is nothing to cache or await.
 */
export function canAcceptPayments(): boolean {
  return getPlatformInfo().canAcceptPayments;
}
