let settled = false;
let resolveGate: (() => void) | undefined;

const gate = new Promise<void>((resolve) => {
  resolveGate = resolve;
});

export function markConsentFlowComplete(): void {
  if (settled) {
    return;
  }

  settled = true;
  resolveGate?.();
}

export function whenConsentFlowComplete(timeoutMs = 6000): Promise<void> {
  if (settled) {
    return Promise.resolve();
  }

  return Promise.race([
    gate,
    new Promise<void>((resolve) => {
      setTimeout(resolve, timeoutMs);
    }),
  ]);
}
