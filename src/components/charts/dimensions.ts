const Y_AXIS_AND_EDGE_SPACE = 66;
const MIN_PROJECTION_CHART_WIDTH = 220;

export interface ProjectionChartLayout {
  /** Width to hand the chart's drawing area. Equals the content width when scrolling. */
  chartWidth: number;
  /** Visible width inside the container, excluding the y-axis/edge gutter. */
  viewportWidth: number;
  /** Per-point spacing to feed the chart. Equals perPointWidth unless fit-to-width compresses it. */
  pointSpacing: number;
  /** True when the plotted content is wider than the viewport and must scroll. */
  scrollEnabled: boolean;
}

/**
 * Size a projection chart from its data so the whole timeline is always reachable:
 * give every point a fixed slice of width and, when the resulting content is wider
 * than the viewport, widen the chart and turn on horizontal scrolling. Short
 * timelines keep fitting the viewport with no scroll.
 *
 * Pass `fitToWidth` to instead condense a long timeline into the viewport: the
 * per-point spacing shrinks (down to `minPerPointWidth`) so the entire chart is
 * visible at once on a narrow screen rather than showing a scrollable snapshot.
 * Only once spacing hits that floor does the chart fall back to scrolling. Short
 * timelines are never stretched past `perPointWidth`.
 */
export const getProjectionChartLayout = ({
  containerWidth,
  pointCount,
  perPointWidth,
  edgeSpacing = 0,
  axisWidth = Y_AXIS_AND_EDGE_SPACE,
  fitToWidth = false,
  minPerPointWidth = 10,
}: {
  containerWidth: number;
  pointCount: number;
  perPointWidth: number;
  /** Combined initial + end spacing baked into the chart. */
  edgeSpacing?: number;
  axisWidth?: number;
  /** Compress spacing to fit the viewport instead of scrolling. */
  fitToWidth?: boolean;
  /** Lower bound on spacing when fitting; below this the chart scrolls instead. */
  minPerPointWidth?: number;
}): ProjectionChartLayout => {
  const safeContainer = Number.isFinite(containerWidth) && containerWidth > 0
    ? containerWidth
    : MIN_PROJECTION_CHART_WIDTH + axisWidth;
  const viewportWidth = Math.max(
    MIN_PROJECTION_CHART_WIDTH,
    Math.floor(safeContainer - axisWidth),
  );

  const safePointCount = Math.max(0, pointCount);
  let pointSpacing = perPointWidth;

  if (fitToWidth && safePointCount > 0) {
    // Solve spacing from `pointCount * spacing + edgeSpacing <= viewportWidth`, then
    // clamp: never stretch a short timeline past its natural spacing, never squeeze a
    // long one below the legible floor (past that point the chart scrolls instead).
    const fitSpacing = Math.floor((viewportWidth - edgeSpacing) / safePointCount);
    pointSpacing = Math.max(minPerPointWidth, Math.min(perPointWidth, fitSpacing));
  }

  const contentWidth = Math.ceil(safePointCount * pointSpacing + edgeSpacing);
  const scrollEnabled = contentWidth > viewportWidth;

  return {
    chartWidth: scrollEnabled ? contentWidth : viewportWidth,
    viewportWidth,
    pointSpacing,
    scrollEnabled,
  };
};
