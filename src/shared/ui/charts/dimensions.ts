const Y_AXIS_AND_EDGE_SPACE = 66;
const MIN_PROJECTION_CHART_WIDTH = 220;
const DEFAULT_SECTION_COUNT = 4;

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
  minPerPointWidth = 4,
  spacingMode = 'points',
  fillAvailableWidth = false,
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
  /**
   * Bars occupy one spacing slot per point. Lines occupy the intervals between
   * points, so their visible span is `(pointCount - 1) * spacing`.
   */
  spacingMode?: 'points' | 'intervals';
  /**
   * Let a fitted, non-scrolling chart hand the full viewport width to the chart library
   * and stretch its point spacing to fill it exactly, so the series spans the whole width
   * instead of stopping short under empty trailing gridlines.
   */
  fillAvailableWidth?: boolean;
}): ProjectionChartLayout => {
  const safeContainer = Number.isFinite(containerWidth) && containerWidth > 0
    ? containerWidth
    : MIN_PROJECTION_CHART_WIDTH + axisWidth;
  const viewportWidth = Math.max(
    MIN_PROJECTION_CHART_WIDTH,
    Math.floor(safeContainer - axisWidth),
  );

  const safePointCount = Math.max(0, pointCount);
  const spacingUnits = spacingMode === 'intervals'
    ? Math.max(0, safePointCount - 1)
    : safePointCount;
  let pointSpacing = perPointWidth;

  if (fitToWidth && spacingUnits > 0) {
    // Solve spacing from the chart's visual span so the whole timeline fits without
    // scrolling. Bar charts use one spacing slot per bar; line charts use the intervals
    // between points. Clamp only at the natural width (never stretch a short series) and
    // a tiny floor (never collapse the curve); the floor sits low enough that realistic
    // terms always fit, so the chart only falls back to scrolling for pathologically long
    // timelines.
    const fitSpacing = Math.floor((viewportWidth - edgeSpacing) / spacingUnits);
    pointSpacing = Math.max(minPerPointWidth, Math.min(perPointWidth, fitSpacing));
  }

  const contentWidth = Math.ceil(spacingUnits * pointSpacing + edgeSpacing);
  const scrollEnabled = contentWidth > viewportWidth;

  // A fill-to-width chart hands the full viewport to the chart library so the gridlines
  // reach the card edge. Whenever such a chart isn't scrolling — whether it was fitted, or
  // it's a fixed-spacing chart whose short timeline simply doesn't fill a wide screen (e.g.
  // a 5-year loan on a tablet or in the fullscreen modal) — the series would otherwise stop
  // short under empty trailing gridlines on the left. Redistribute the spacing as an exact
  // fraction so the points span the whole width and the last point (the end of the term)
  // lands right at the trailing edge margin. Long timelines that overflow still scroll, so
  // this only ever expands dead space, never compresses a scrollable chart.
  if (fillAvailableWidth && !scrollEnabled && spacingUnits > 0) {
    pointSpacing = (viewportWidth - edgeSpacing) / spacingUnits;
  }

  // Most fitted charts keep the chart width equal to the spacing-derived content span.
  // Some gifted-charts line charts render the surrounding rules/axis from the explicit
  // width, though, so they can opt into the full viewport while the points stretch to
  // fill it.
  const chartWidth = scrollEnabled || (fitToWidth && !fillAvailableWidth)
    ? contentWidth
    : viewportWidth;

  return {
    chartWidth,
    viewportWidth,
    pointSpacing,
    scrollEnabled,
  };
};

export const getNiceChartMaxValue = (
  values: number[],
  sectionCount = DEFAULT_SECTION_COUNT,
) => {
  const maxValue = values.reduce((max, value) => (
    Number.isFinite(value) ? Math.max(max, value) : max
  ), 0);

  if (maxValue <= 0) return sectionCount;

  const targetMax = maxValue * 1.08;
  const rawStep = targetMax / sectionCount;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const multipliers = [1, 1.25, 1.5, 2, 2.5, 5, 7.5, 10];

  for (const multiplier of multipliers) {
    const candidateMax = multiplier * magnitude * sectionCount;
    if (candidateMax >= targetMax) return candidateMax;
  }

  return 10 * magnitude * sectionCount;
};
