import { DownPaymentType } from '@/shared/domain/core/DownPaymentType';
import { LoanCalculationType } from '@/shared/domain/core/LoanCalculationType';
import type { LoanCalculatorFormValues } from '@/shared/lib/hooks/loanCalculatorSchema';

// Stored calculations carry their enums in two shapes: recent calculations and
// draft sessions keep the form's lowercase output (`term`/`percent`), while a
// saved loan's `formSnapshot` stores them UPPERCASE (`TERM`/`PERCENT`). The
// calculator form's zod enums only accept the lowercase variants, so feeding a
// snapshot straight into `form.reset()` silently breaks the calc-type tabs and
// the down-payment toggle (the value matches no option, so the wrong section
// renders). This pure helper normalises any of those shapes back into the form's
// values so every hydration site ports values identically.
//
// Kept free of MMKV / expo imports so it runs in the node Jest project.
export const normaliseCalculatorFormValues = (
  raw: Partial<Record<keyof LoanCalculatorFormValues, unknown>> | null | undefined,
): Partial<LoanCalculatorFormValues> => {
  if (!raw || typeof raw !== 'object') return {};

  const normalised: Partial<LoanCalculatorFormValues> = { ...(raw as Partial<LoanCalculatorFormValues>) };

  if (typeof raw.calculationType === 'string') {
    normalised.calculationType = raw.calculationType.toLowerCase() as LoanCalculationType;
  }
  if (typeof raw.downPaymentType === 'string') {
    normalised.downPaymentType = raw.downPaymentType.toLowerCase() as DownPaymentType;
  }

  return normalised;
};
