import type { ReactNode } from "react";
import { useIsDesktop } from "@/hooks/use-media-query";
import { useFamily } from "../lib/theme";

/* ------------------------------------------------------------------ *
 * Page frame shared by every screen: the title row and the gutters,
 * in each design's form.
 * ------------------------------------------------------------------ */

/** Wallet Dark: centred, letter-spaced, with icon slots either side. */
export function DarkTitle({ title, right, left }: { title: ReactNode; right?: ReactNode; left?: ReactNode }) {
  return (
    <div className="flex items-center justify-between" style={{ paddingTop: 16, gap: 12 }}>
      <div className="flex" style={{ minWidth: 22 }}>
        {left}
      </div>
      <span
        className="truncate"
        style={{ fontSize: 15, letterSpacing: "calc(var(--track) * .2em)", fontWeight: 500, textTransform: "uppercase" }}
      >
        {title}
      </span>
      <div className="flex justify-end" style={{ minWidth: 22 }}>
        {right}
      </div>
    </div>
  );
}

/** Wallet Soft: round buttons either side of a centred title. */
export function SoftTitle({ left, title, right }: { left?: ReactNode; title: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between" style={{ paddingTop: 12, gap: 12 }}>
      <div style={{ minWidth: 46 }}>{left}</div>
      <span className="truncate" style={{ fontSize: 16, fontWeight: 600 }}>
        {title}
      </span>
      <div className="flex justify-end" style={{ minWidth: 46 }}>
        {right}
      </div>
    </div>
  );
}

/** The screen title in the active design (classic: bold, start-aligned). */
export function PageTitle({ title, left, right }: { title: ReactNode; left?: ReactNode; right?: ReactNode }) {
  const family = useFamily();
  if (family === "dark") return <DarkTitle title={title} left={left} right={right} />;
  if (family === "soft") return <SoftTitle title={title} left={left} right={right} />;
  return (
    <div className="flex items-center justify-between" style={{ gap: 12 }}>
      <div className="flex items-center" style={{ gap: 10 }}>
        {left}
        <div style={{ fontSize: 19, fontWeight: 700 }}>{title}</div>
      </div>
      {right}
    </div>
  );
}

/**
 * Body gutters for the Dark and Soft shells: the designs' phone margins
 * (28px Dark, 20px Soft); on desktop the shell already pads.
 */
export function PageBody({ children, maxWidth }: { children: ReactNode; maxWidth?: number }) {
  const family = useFamily();
  const wide = useIsDesktop();
  const pad = wide ? 0 : family === "dark" ? 28 : 20;
  return (
    <div className="fade-in" style={{ padding: `0 ${pad}px 24px`, maxWidth, width: "100%", marginInline: "auto" }}>
      {children}
    </div>
  );
}
