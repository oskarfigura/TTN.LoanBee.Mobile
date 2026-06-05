const Y_AXIS_AND_EDGE_SPACE = 66;
const MIN_PROJECTION_CHART_WIDTH = 220;

export interface ProjectionChartLayout {
  /** Width to hand the chart's drawing area. Equals the content width when scrolling. */
  chartWidth: number;
  /** Visible width inside the container, excluding the y-axis/edge gutter. */
  viewportWidth: number;
  /** True when the plotted content is wider than the viewport and must scroll. */
  scrollEnabled: boolean;
}

/**
 * Size a projection chart from its data so the whole timeline is always reachable:
 * give every point a fixed slice of width and, when the resulting content is wider
 * than the viewport, widen the chart and turn on horizontal scrolling. Short
 * timelines keep fitting the viewport with no scroll.
 */
export const getProjectionChartLayout = ({
  containerWidth,
  pointCount,
  perPointWidth,
  edgeSpacing = 0,
  axisWidth = Y_AXIS_AND_EDGE_SPACE,
}: {
  containerWidth: number;
  pointCount: number;
  perPointWidth: number;
  /** Combined initial + end spacing baked into the chart. */
  edgeSpacing?: number;
  axisWidth?: number;
}): ProjectionChartLayout => {
  const safeContainer = Number.isFinite(containerWidth) && containerWidth > 0
    ? containerWidth
    : MIN_PROJECTION_CHART_WIDTH + axisWidth;
  const viewportWidth = Math.max(
    MIN_PROJECTION_CHART_WIDTH,
    Math.floor(safeContainer - axisWidth),
  );
  const contentWidth = Math.ceil(Math.max(0, pointCount) * perPointWidth + edgeSpacing);
  const scrollEnabled = contentWidth > viewportWidth;

  return {
    chartWidth: scrollEnabled ? contentWidth : viewportWidth,
    viewportWidth,
    scrollEnabled,
  };
};
