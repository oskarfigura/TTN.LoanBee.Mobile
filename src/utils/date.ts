export const monthsBetween = (startDate: string, now: Date): number => {
  const start = new Date(startDate);
  return Math.max(0, (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()));
};
