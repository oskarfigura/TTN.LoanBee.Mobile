// First-run coordination gate between the onboarding guide and the ad/tracking
// stack. On a cold start the AdProvider must hold the iOS App Tracking
// Transparency prompt until the user has dismissed onboarding, so the guide's
// tracking rationale (the "priming" context) is shown before the system dialog.
// The guide signals dismissal via `markOnboardingDismissed`; the AdProvider
// awaits `whenOnboardingDismissed`.
//
// There is deliberately NO timeout fallback: users routinely spend longer than a
// few seconds reading onboarding, and a timeout would release the ATT prompt
// mid-onboarding (over the wrong screen). The guide guarantees this resolves by
// calling `markOnboardingDismissed` on every exit path — buttons and unmount
// (which covers the iOS swipe-back gesture) — so the gate cannot hang in normal
// use. Until then ads simply don't initialise, which is correct: nothing is shown
// during onboarding anyway.
let settled = false;
let resolveGate: (() => void) | undefined;

const gate = new Promise<void>((resolve) => {
  resolveGate = resolve;
});

export function markOnboardingDismissed(): void {
  if (settled) {
    return;
  }

  settled = true;
  resolveGate?.();
}

export function whenOnboardingDismissed(): Promise<void> {
  if (settled) {
    return Promise.resolve();
  }

  return gate;
}
