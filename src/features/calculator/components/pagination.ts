export const clampPage = (page: number, totalPages: number): number => {
  if (totalPages <= 0) return 0;
  return Math.min(Math.max(page, 0), totalPages - 1);
};

export const getPaginationWindow = (
  currentPage: number,
  totalPages: number,
  maxVisiblePages = 5,
): number[] => {
  if (totalPages <= 0) return [];

  const safeCurrent = clampPage(currentPage, totalPages);
  const visible = Math.max(1, Math.min(maxVisiblePages, totalPages));
  const half = Math.floor(visible / 2);
  const start = Math.min(
    Math.max(safeCurrent - half, 0),
    Math.max(totalPages - visible, 0),
  );

  return Array.from({ length: visible }, (_, index) => start + index);
};
