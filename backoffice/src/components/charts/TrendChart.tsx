import { useId, useMemo } from "react";
import type { ChartPoint } from "../../types";

interface TrendChartProps {
  data: ChartPoint[];
  metric?: "applications" | "users";
}

function smoothPath(coords: { x: number; y: number }[]): string {
  if (coords.length === 0) return "";
  if (coords.length === 1) return `M ${coords[0].x} ${coords[0].y}`;

  const line = (point: { x: number; y: number }) => `${point.x} ${point.y}`;
  return coords.reduce((path, point, i, arr) => {
    if (i === 0) return `M ${line(point)}`;
    const prev = arr[i - 1];
    const cpx = (prev.x + point.x) / 2;
    return `${path} C ${cpx} ${prev.y}, ${cpx} ${point.y}, ${line(point)}`;
  }, "");
}

export default function TrendChart({ data, metric = "applications" }: TrendChartProps) {
  const uid = useId().replace(/:/g, "");
  const fillId = `boChartFill-${uid}`;
  const strokeId = `boChartStroke-${uid}`;
  const glowId = `boChartGlow-${uid}`;

  const w = 640;
  const h = 220;
  const padL = 12;
  const padR = 48;
  const padY = 28;
  const chartW = w - padL - padR;
  const chartH = h - padY * 2;

  const { coords, values, yLabels } = useMemo(() => {
    const vals = data.map((d) => (metric === "users" ? d.users : d.applications));
    const max = Math.max(...vals, 1);
    const min = Math.min(...vals);
    const range = max - min || 1;
    const step = chartW / Math.max(vals.length - 1, 1);

    const pts = vals.map((v, i) => ({
      x: padL + i * step,
      y: padY + chartH - ((v - min) / range) * chartH,
      value: v,
    }));

    const labels = [max, Math.round(min + range / 2), min].map((v, i) => ({
      value: v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v),
      y: padY + (i / 2) * chartH,
    }));

    return { coords: pts, values: vals, yLabels: labels };
  }, [data, metric, chartW, chartH, padL, padY]);

  const linePath = smoothPath(coords);
  const baseY = padY + chartH;
  const areaPath = coords.length
    ? `${linePath} L ${coords[coords.length - 1].x} ${baseY} L ${coords[0].x} ${baseY} Z`
    : "";

  const latest = values[values.length - 1] ?? 0;
  const previous = values[values.length - 2] ?? latest;
  const change = previous ? (((latest - previous) / previous) * 100).toFixed(1) : "0";

  return (
    <div className="bo-chart-wrap">
      <div className="bo-chart-summary">
        <div>
          <p className="bo-chart-summary-label">
            {metric === "users" ? "Active users" : "Applications"}
          </p>
          <p className="bo-chart-summary-value">{latest.toLocaleString()}</p>
        </div>
        <span className={`bo-chart-change ${Number(change) >= 0 ? "is-up" : "is-down"}`}>
          {Number(change) >= 0 ? "↑" : "↓"} {Math.abs(Number(change))}% vs prior day
        </span>
      </div>

      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="bo-chart-svg"
        role="img"
        aria-label={`Trend chart showing ${metric} over time`}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5b4cff" stopOpacity="0.45" />
            <stop offset="55%" stopColor="#8b7cf8" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#5b4cff" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={strokeId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#4338ca" />
            <stop offset="50%" stopColor="#5b4cff" />
            <stop offset="100%" stopColor="#a78bfa" />
          </linearGradient>
          <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {[0, 0.5, 1].map((r) => (
          <line
            key={r}
            x1={padL}
            x2={w - padR}
            y1={padY + r * chartH}
            y2={padY + r * chartH}
            className="bo-chart-grid"
          />
        ))}

        {yLabels.map((label) => (
          <text
            key={label.value}
            x={w - padR + 10}
            y={label.y + 4}
            className="bo-chart-axis-label"
          >
            {label.value}
          </text>
        ))}

        <path d={areaPath} fill={`url(#${fillId})`} className="bo-chart-area" />
        <path
          d={linePath}
          fill="none"
          stroke={`url(#${strokeId})`}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter={`url(#${glowId})`}
          className="bo-chart-line"
        />

        {coords.map((p, i) => (
          <g key={i} className="bo-chart-point">
            <circle cx={p.x} cy={p.y} r="10" className="bo-chart-point-halo" />
            <circle cx={p.x} cy={p.y} r="4.5" className="bo-chart-point-dot" />
          </g>
        ))}
      </svg>

      <div className="bo-chart-labels">
        {data.map((d, i) => (
          <span key={d.date} className={i === 0 || i === data.length - 1 ? "is-edge" : ""}>
            {(i === 0 || i === data.length - 1 || data.length <= 7) && d.date}
          </span>
        ))}
      </div>
    </div>
  );
}
