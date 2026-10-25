import { useId, useState, type PointerEvent } from "react";
import { EmptyNote } from "@/components/primitives";
import { useIsDesktop } from "@/hooks/use-media-query";
import { useI18n } from "../lib/i18n";
import { useFamily, type ThemeFamily } from "../lib/theme";
import { smoothPath } from "../designs/shared";
import type { Point } from "../types";

/* ------------------------------------------------------------------ *
 * Spending-over-time line chart. The shape comes from Wallet Soft's
 * Statistics screen (smooth line, highlighted point, drop line,
 * value bubble); each theme draws it in its own design's language:
 *
 *  soft     the design as drawn: 3px accent line, ringed marker,
 *           dashed drop line, white bubble, accent tick
 *  classic  the Wallet Web bar charts' palette: emerald line over a
 *           hero-gradient area, hairline grid, income-green marker,
 *           popover-style bubble, 9.5px faint ticks
 *  dark     Wallet Dark's line-icon weight: 1.4px accent hairline, no
 *           fill, 6px accent dot, mono text readout, mono ticks
 *
 * The peak is highlighted until a point is hovered or tapped.
 * ------------------------------------------------------------------ */

interface Look {
  height: number;
  stroke: string;
  strokeWidth: number;
  area: boolean;
  grid: number;
  guide: { color: string; dash?: string; width: number };
  tick: { size: number; color: string; active: string; mono: boolean; weight: number };
}

const LOOKS: Record<ThemeFamily, Look> = {
  soft: {
    height: 170,
    stroke: "var(--c-primary)",
    strokeWidth: 3,
    area: false,
    grid: 0,
    guide: { color: "rgb(var(--ink-rgb) / .25)", dash: "4 4", width: 1.5 },
    tick: { size: 12, color: "rgb(var(--fg-rgb) / .55)", active: "var(--c-primary)", mono: false, weight: 600 },
  },
  classic: {
    height: 170,
    stroke: "var(--c-primary)",
    strokeWidth: 2.5,
    area: true,
    grid: 3,
    guide: { color: "rgb(var(--ink-rgb) / .14)", width: 1 },
    tick: { size: 9.5, color: "rgb(var(--fg-rgb) / .35)", active: "var(--c-income)", mono: false, weight: 700 },
  },
  dark: {
    height: 150,
    stroke: "var(--c-accent)",
    strokeWidth: 1.4,
    area: false,
    grid: 1,
    guide: { color: "rgb(var(--ink-rgb) / .22)", dash: "2 4", width: 1 },
    tick: { size: 9.5, color: "rgb(var(--fg-rgb) / .3)", active: "var(--c-fg)", mono: true, weight: 500 },
  },
};

export default function SpendLineChart({ bars, max }: { bars: Point[]; max: number }) {
  const { short, localize } = useI18n();
  const family = useFamily();
  const wide = useIsDesktop();
  const gradientId = useId();
  const [hover, setHover] = useState<number | null>(null);
  const look = LOOKS[family];

  if (bars.length === 0) return <EmptyNote pad={40}>—</EmptyNote>;

  const W = wide ? 720 : 390;
  const H = look.height;
  const pad = 14;
  const top = family === "dark" ? 30 : 18;
  const bottom = H - 14;
  const step = bars.length > 1 ? (W - pad * 2) / (bars.length - 1) : 0;
  const pts: [number, number][] = bars.map((b, i) => [
    bars.length > 1 ? pad + i * step : W / 2,
    top + (1 - b.amount_cents / Math.max(1, max)) * (bottom - top - 10),
  ]);
  const peak = Math.max(0, bars.findIndex((b) => b.amount_cents === max));
  const active = hover ?? peak;
  const [ax, ay] = pts[active];
  const value = short(bars[active].amount_cents);
  const line = smoothPath(pts);
  const every = Math.max(1, Math.ceil(bars.length / (wide ? 10 : 5)));

  function onMove(e: PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    const i = step > 0 ? Math.round((x - pad) / step) : 0;
    setHover(Math.min(bars.length - 1, Math.max(0, i)));
  }

  const bubbleW = value.length * 7.5 + 20;
  const bubbleX = Math.min(W - bubbleW, Math.max(0, ax - bubbleW / 2));

  return (
    <div style={{ marginTop: 18 }}>
      <svg
        width="100%"
        viewBox={`0 0 ${W} ${H}`}
        fill="none"
        role="img"
        aria-label={`${localize(bars[active].label)} · ${value}`}
        onPointerMove={onMove}
        onPointerDown={onMove}
        onPointerLeave={() => setHover(null)}
        style={{ display: "block", overflow: "visible", touchAction: "pan-y", cursor: "crosshair" }}
      >
        {look.area && (
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--c-primary)" stopOpacity=".28" />
              <stop offset="100%" stopColor="var(--c-primary)" stopOpacity="0" />
            </linearGradient>
          </defs>
        )}

        {Array.from({ length: look.grid }, (_, g) => {
          const y = look.grid === 1 ? bottom : top + ((bottom - top) * (g + 1)) / look.grid;
          return <path key={g} d={`M0 ${y} H${W}`} stroke="rgb(var(--ink-rgb) / .07)" strokeWidth="1" />;
        })}

        {look.area && (
          <path d={`${line} L${pts[pts.length - 1][0]} ${bottom} L${pts[0][0]} ${bottom} Z`} fill={`url(#${gradientId})`} />
        )}
        <path d={line} stroke={look.stroke} strokeWidth={look.strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        <path
          d={`M${ax} ${ay} V${bottom}`}
          stroke={look.guide.color}
          strokeWidth={look.guide.width}
          strokeDasharray={look.guide.dash}
        />

        {family === "soft" && (
          <>
            <circle cx={ax} cy={ay} r="8" fill="var(--c-bg)" stroke="var(--c-primary)" strokeWidth="3" />
            <g transform={`translate(${bubbleX} ${Math.max(-8, ay - 44)})`}>
              <rect width={bubbleW} height="26" rx="10" fill="var(--c-surface)" style={{ filter: "drop-shadow(0 6px 16px rgba(0,0,0,.1))" }} />
              <text x={bubbleW / 2} y="17.5" textAnchor="middle" fontSize="12" fontWeight="600" fill="var(--c-fg)">
                {value}
              </text>
            </g>
          </>
        )}

        {family === "classic" && (
          <>
            <circle cx={ax} cy={ay} r="5.5" fill="var(--c-income)" stroke="var(--c-surface)" strokeWidth="3" />
            <g transform={`translate(${bubbleX} ${Math.max(-8, ay - 40)})`}>
              <rect width={bubbleW} height="24" rx="8" fill="var(--c-surface-2)" stroke="rgb(var(--ink-rgb) / .09)" />
              <text x={bubbleW / 2} y="16" textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--c-fg)">
                {value}
              </text>
            </g>
          </>
        )}

        {family === "dark" && (
          <>
            <circle cx={ax} cy={ay} r="9" fill="none" stroke="var(--c-accent)" strokeOpacity=".3" strokeWidth="1" />
            <circle cx={ax} cy={ay} r="3" fill="var(--c-accent)" />
            <text
              x={Math.min(W - 4, Math.max(4, ax))}
              y={Math.max(10, ay - 16)}
              textAnchor={ax < 60 ? "start" : ax > W - 60 ? "end" : "middle"}
              fontSize="11"
              fill="var(--c-fg)"
              style={{ fontFamily: "var(--app-mono)", letterSpacing: "calc(var(--track) * .08em)" }}
            >
              {value}
            </text>
          </>
        )}
      </svg>

      <div className="flex" dir="ltr" style={{ marginTop: 6 }}>
        {bars.map((b, i) => (
          <span
            key={`${b.label}-${i}`}
            className="flex-1 text-center"
            style={{
              visibility: i % every && i !== active ? "hidden" : "visible",
              fontSize: look.tick.size,
              fontFamily: look.tick.mono ? "var(--app-mono)" : undefined,
              textTransform: look.tick.mono ? "uppercase" : undefined,
              letterSpacing: look.tick.mono ? "calc(var(--track) * .06em)" : undefined,
              color: i === active ? look.tick.active : look.tick.color,
              fontWeight: i === active ? look.tick.weight : 400,
              whiteSpace: "nowrap",
              overflow: "hidden",
            }}
          >
            {localize(b.label)}
          </span>
        ))}
      </div>
    </div>
  );
}
