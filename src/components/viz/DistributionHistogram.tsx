import { neon, neonAlpha, type NeonColor } from "./colors";
import { niceMax } from "./geometry";

export interface HistogramBin {
  label: string;
  value: number;
}

interface DistributionHistogramProps {
  bins: HistogramBin[];
  color?: NeonColor;
  height?: number;
  className?: string;
}

/**
 * Vertical bar histogram for a bucketed distribution (e.g. run durations).
 * Responsive width via viewBox; pure SVG with a "draw-up" transition.
 *
 * Known and deferred (T-0114, for the Results conversion): `preserveAspectRatio
 * ="none"` stretches this chart horizontally to fill its card, and it is the one
 * chart in viz/ that carries TEXT inside that stretch. In a 323px card the
 * horizontal scale is 0.48, so a 12px label renders 14.4px tall and about 3.2px
 * per character. Raising the sizes off 8px and 9px made both dimensions 1.5x
 * larger and did not change the ratio, so this is strictly better than it was;
 * it is not yet right. Fixing it means the chart knowing its own rendered width
 * (there is no ResizeObserver anywhere in src/ yet) or moving the axis labels
 * out of the SVG into an HTML row, and both belong with the Insights rebuild.
 */
export default function DistributionHistogram({
  bins,
  color = "purple",
  height = 140,
  className,
}: DistributionHistogramProps) {
  const W = 600;
  const H = height;
  const padX = 8;
  const padTop = 16;
  const padBottom = 22;
  const n = bins.length;
  if (n === 0) {
    return (
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} className={className} preserveAspectRatio="none">
        <line x1="0" y1={H - padBottom} x2={W} y2={H - padBottom} stroke={neonAlpha(color, 20)} />
      </svg>
    );
  }
  const max = niceMax(Math.max(...bins.map((b) => b.value)));
  const innerW = W - padX * 2;
  const innerH = H - padTop - padBottom;
  const slot = innerW / n;
  const barW = Math.min(slot * 0.7, 48);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} className={className} preserveAspectRatio="none">
      <line x1={0} y1={H - padBottom} x2={W} y2={H - padBottom} stroke="var(--color-ps-viz-axis)" />
      {bins.map((b, i) => {
        const h = (b.value / max) * innerH;
        const x = padX + i * slot + (slot - barW) / 2;
        const y = H - padBottom - h;
        return (
          <g key={b.label}>
            <rect
              x={x}
              y={y}
              width={barW}
              height={Math.max(0, h)}
              rx={3}
              fill={neonAlpha(color, 55)}
              stroke={neonAlpha(color, 80)}
              strokeWidth={1}
              style={{ transition: "height 0.6s ease, y 0.6s ease" }}
            >
              <title>{`${b.label}: ${b.value}`}</title>
            </rect>
            {b.value > 0 && (
              <text x={x + barW / 2} y={y - 3} fill={neon(color)} fontSize={12} fontFamily="monospace" textAnchor="middle">
                {b.value}
              </text>
            )}
            <text
              x={padX + i * slot + slot / 2}
              y={H - padBottom + 13}
              fill="var(--color-ps-text-faint)"
              fontSize={12}
              fontFamily="monospace"
              textAnchor="middle"
            >
              {b.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
