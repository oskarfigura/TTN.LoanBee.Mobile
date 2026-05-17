/**
 * Decoupled hand-off between the ad-consent flow and the first-launch guide.
 *
 * The ad SDK is isolated in `src/ads/` and must not be imported outside it,
 * so the guide cannot wait on AdProvider directly. Instead AdProvider signals
 * here when the GDPR/consent flow has resolved, and the home screen waits here
 * before showing the guide — neither side imports the other.
 *
 * Module-level singleton state is intentional: the app is a single instance
 * and the consent flow runs exactly once per launch.
 */

let settled = false;
let resolveGate: (() => void) | undefined;
const gate = new Promise<void>(resolve => {
  resolveGate = resolve;
});

/** Called by AdProvider once the consent flow has fully resolved (or failed). */
export function markConsentFlowComplete(): void {
  if (settled) return;
  settled = true;
  resolveGate?.();
}

/**
 * Resolves when the consent flow is done, or after `timeoutMs` as a safety
 * net so the guide is never blocked indefinitely by a hung consent SDK.
 */
export function whenConsentFlowComplete(timeoutMs = 6000): Promise<void> {
  if (settled) return Promise.resolve();
  return Promise.race([
    gate,
    new Promise<void>(resolve => {
      setTimeout(resolve, timeoutMs);
    }),
  ]);
}
