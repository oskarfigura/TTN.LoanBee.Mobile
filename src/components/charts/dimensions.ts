const Y_AXIS_AND_EDGE_SPACE = 66;
const MIN_PROJECTION_CHART_WIDTH = 220;

export const getProjectionChartWidth = (containerWidth: number): number => {
  if (!Number.isFinite(containerWidth) || containerWidth <= 0) {
    return MIN_PROJECTION_CHART_WIDTH;
  }

  return Math.max(
    MIN_PROJECTION_CHART_WIDTH,
    Math.floor(containerWidth - Y_AXIS_AND_EDGE_SPACE),
  );
};
