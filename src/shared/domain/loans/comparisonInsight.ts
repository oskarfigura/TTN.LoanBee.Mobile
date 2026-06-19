export type ComparisonInsight = {
  winner: 'current' | 'compared';
  interestSaved?: number;
  monthsSaved?: number;
};

// A one-month difference is noise (it routinely falls out of rounding when a single
// overpayment nudges the final period); only surface a time saving from two months up.
const MEANINGFUL_MONTHS_THRESHOLD = 2;

export const getComparisonInsight = ({
  currentInterest,
  comparedInterest,
  currentMonths,
  comparedMonths,
}: {
  currentInterest: number;
  comparedInterest: number;
  currentMonths: number;
  comparedMonths: number;
}): ComparisonInsight | null => {
  const interestDifference = currentInterest - comparedInterest;
  const monthsDifference = currentMonths - comparedMonths;
  const meaningfulInterestThreshold = Math.max(500, currentInterest * 0.05);
  const comparedInterestSaving = interestDifference >= meaningfulInterestThreshold
    ? interestDifference
    : undefined;
  const currentInterestSaving = -interestDifference >= meaningfulInterestThreshold
    ? -interestDifference
    : undefined;
  const comparedMonthsSaving = monthsDifference >= MEANINGFUL_MONTHS_THRESHOLD
    ? monthsDifference
    : undefined;
  const currentMonthsSaving = -monthsDifference >= MEANINGFUL_MONTHS_THRESHOLD
    ? -monthsDifference
    : undefined;

  if (comparedInterestSaving || comparedMonthsSaving) {
    return {
      winner: 'compared',
      interestSaved: comparedInterestSaving,
      monthsSaved: comparedMonthsSaving,
    };
  }
  if (currentInterestSaving || currentMonthsSaving) {
    return {
      winner: 'current',
      interestSaved: currentInterestSaving,
      monthsSaved: currentMonthsSaving,
    };
  }
  return null;
};
