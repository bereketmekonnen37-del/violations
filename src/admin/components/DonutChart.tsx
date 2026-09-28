/**
 * DonutChart
 *
 * Renders a pie-with-hole using SVG arcs. Suitable for role breakdowns.
 */

interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  slices: DonutSlice[];
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;
}

function describeArc(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number,
): string {
  const start = polarToCartesian(cx, cy, radius, endAngle);
  const end = polarToCartesian(cx, cy, radius, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? '0' : '1';
  return [
    'M',
    start.x,
    start.y,
    'A',
    radius,
    radius,
    0,
    largeArc,
    0,
    end.x,
    end.y,
  ].join(' ');
}

function polarToCartesian(cx: number, cy: number, radius: number, angle: number) {
  const rad = ((angle - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(rad),
    y: cy + radius * Math.sin(rad),
  };
}

export function DonutChart({
  slices,
  size = 200,
  strokeWidth = 22,
  centerLabel,
}: DonutChartProps) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - strokeWidth;
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);

  let cumulative = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        stroke="#1E2129"
        strokeWidth={strokeWidth}
        fill="none"
      />
      {total > 0 &&
        slices.map((slice) => {
          const startAngle = (cumulative / total) * 360;
          cumulative += slice.value;
          const endAngle = (cumulative / total) * 360;
          const arc = describeArc(cx, cy, radius, startAngle, endAngle);
          return (
            <path
              key={slice.label}
              d={arc}
              fill="none"
              stroke={slice.color}
              strokeWidth={strokeWidth}
              strokeLinecap="butt"
            />
          );
        })}
      {centerLabel ? (
        <g>
          <text
            x={cx}
            y={cy - 2}
            textAnchor="middle"
            fill="#9AA0AA"
            fontSize={11}
          >
            {centerLabel}
          </text>
          <text
            x={cx}
            y={cy + 14}
            textAnchor="middle"
            fill="#EFF1F5"
            fontSize={16}
            fontWeight={600}
          >
            {total}
          </text>
        </g>
      ) : null}
    </svg>
  );
}
