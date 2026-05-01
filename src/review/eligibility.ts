export interface ReviewEligibilityInput {
  appOpens: number;
  usefulActions: number;
  hasReviewed: boolean;
  lastRequestAt: number;
  now: number;
  hasStoreAction: boolean;
  minAppOpens?: number;
  minUsefulActions?: number;
  daysBetweenRequests?: number;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const canRequestReview = ({
  appOpens,
  usefulActions,
  hasReviewed,
  lastRequestAt,
  now,
  hasStoreAction,
  minAppOpens = 3,
  minUsefulActions = 2,
  daysBetweenRequests = 30,
}: ReviewEligibilityInput): boolean => {
  if (hasReviewed || !hasStoreAction) return false;
  if (appOpens < minAppOpens || usefulActions < minUsefulActions) return false;
  if (lastRequestAt <= 0) return true;

  return now - lastRequestAt >= daysBetweenRequests * MS_PER_DAY;
};
