import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { useIsDesktop } from "../lib/useMediaQuery";

/* ------------------------------------------------------------------ *
 * Primitives. Every literal here comes straight out of the design
 * bundle, so keep them in sync with project/*.dc.html rather than
 * "rounding" them to Tailwind's scale.
 * ------------------------------------------------------------------ */

export function Card({
  children,
  className = "",
  style,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`rounded-card bg-card border border-line ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}

export function CardTitle({ children }: { children: ReactNode }) {
  return <div className="text-[13.5px] font-bold">{children}</div>;
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <div className="text-[15px] font-bold">{children}</div>;
}

/** The design's `chip(on)` helper: filled accent when on, hairline when off. */
export function Chip({
  active,
  onClick,
  children,
  className = "px-[13px] py-[7px]",
  title,
}: {
  active: boolean;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`rounded-pill text-xs font-bold border transition-colors ${className}`}
      style={
        active
          ? { background: "#0f9b6e", color: "#04120c", borderColor: "#0f9b6e" }
          : {
              background: "transparent",
              color: "rgba(232,234,236,.7)",
              borderColor: "rgba(255,255,255,.14)",
            }
      }
    >
      {children}
    </button>
  );
}

export function Spinner() {
  return <span className="spinner" aria-hidden="true" />;
}

/**
 * Swaps a button's label for a spinner while `busy`, keeping the label in
 * the layout (just invisible) so the button doesn't change size mid-request.
 */
export function BusyLabel({ busy, children }: { busy: boolean; children: ReactNode }) {
  return (
    <span className="inline-grid place-items-center align-middle">
      <span style={{ gridArea: "1 / 1", visibility: busy ? "hidden" : "visible" }}>{children}</span>
      {busy && (
        <span className="flex" style={{ gridArea: "1 / 1" }}>
          <Spinner />
        </span>
      )}
    </span>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
  busy = false,
  className = "",
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  busy?: boolean;
  className?: string;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || busy}
      aria-busy={busy}
      className={`bg-accent text-accentInk font-bold disabled:opacity-50 ${className}`}
    >
      <BusyLabel busy={busy}>{children}</BusyLabel>
    </button>
  );
}

export function GhostButton({
  children,
  onClick,
  busy = false,
  className = "",
  tone = "normal",
}: {
  children: ReactNode;
  onClick?: () => void;
  busy?: boolean;
  className?: string;
  tone?: "normal" | "muted" | "danger";
}) {
  const color =
    tone === "muted"
      ? "rgba(232,234,236,.5)"
      : tone === "danger"
        ? "#ff7a6b"
        : "rgba(232,234,236,.8)";
  const borderColor = tone === "danger" ? "rgba(255,122,107,.35)" : "rgba(255,255,255,.14)";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-busy={busy}
      className={`border font-bold ${className}`}
      style={{ color, borderColor }}
    >
      <BusyLabel busy={busy}>{children}</BusyLabel>
    </button>
  );
}

/** Thin rounded meter used by the budget and breakdown rows. */
export function Meter({ width, color, height = 7 }: { width: string; color: string; height?: number }) {
  return (
    <div
      className="rounded-pill overflow-hidden"
      style={{ height, background: "rgba(255,255,255,.07)", marginTop: 7 }}
    >
      <div style={{ height: "100%", width, background: color }} />
    </div>
  );
}

/** The bank-rule switch from the web design's sidebar. */
export function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      className="rounded-pill flex flex-none items-center"
      style={{
        width: 34,
        height: 20,
        padding: 2,
        background: on ? "#0f9b6e" : "rgba(255,255,255,.12)",
        justifyContent: on ? "flex-end" : "flex-start",
      }}
    >
      <span
        style={{
          width: 16,
          height: 16,
          borderRadius: 99,
          background: on ? "#04120c" : "rgba(232,234,236,.6)",
        }}
      />
    </button>
  );
}

export function Avatar({
  children,
  color,
  size = 36,
  background = "#161c1a",
}: {
  children: ReactNode;
  color: string;
  size?: number;
  background?: string;
}) {
  return (
    <div
      className="rounded-pill flex flex-none items-center justify-center font-bold"
      style={{ width: size, height: size, background, color, fontSize: size <= 30 ? 11 : 12 }}
    >
      {children}
    </div>
  );
}

export function EmptyNote({ children, pad = 40 }: { children: ReactNode; pad?: number }) {
  return (
    <div
      className="text-center text-[13px]"
      style={{ padding: `${pad}px 0`, color: "rgba(232,234,236,.35)" }}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Overlay: a centred modal on the web layout, a bottom sheet on the
 * phone layout — exactly the two treatments in the bundle.
 * ------------------------------------------------------------------ */

export function Overlay({
  children,
  onClose,
  maxWidth = 460,
  sheetMaxHeight = "88%",
}: {
  children: ReactNode;
  onClose: () => void;
  maxWidth?: number;
  sheetMaxHeight?: string;
}) {
  const isDesktop = useIsDesktop();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  if (isDesktop) {
    return (
      <div
        className="fixed inset-0 z-40 flex items-center justify-center p-6"
        style={{ background: "rgba(4,6,5,.7)" }}
        onClick={onClose}
      >
        <div
          className="w-full overflow-y-auto rounded-modal bg-cardAlt fade-in"
          style={{
            maxWidth,
            maxHeight: "86vh",
            padding: 26,
            border: "1px solid rgba(255,255,255,.09)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-end fade-in-flat"
      style={{ background: "rgba(4,6,5,.66)" }}
      onClick={onClose}
    >
      <div
        className="w-full overflow-y-auto bg-cardAlt sheet-up no-scrollbar"
        style={{
          maxHeight: sheetMaxHeight,
          padding: "20px 22px calc(26px + env(safe-area-inset-bottom))",
          borderRadius: "26px 26px 0 0",
          borderTop: "1px solid rgba(255,255,255,.09)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export function OverlayHeader({ title, onClose, closeLabel }: { title: string; onClose: () => void; closeLabel: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="text-[11.5px] md:text-xs" style={{ color: "rgba(232,234,236,.4)" }}>
        {title}
      </div>
      <button type="button" className="text-[11.5px] md:text-xs text-accent" onClick={onClose}>
        {closeLabel}
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Form primitives. The design bundle has no forms (its prototypes were
 * read-only), so these extend its language rather than copy it: same
 * radii, hairlines and muted greys as the cards.
 * ------------------------------------------------------------------ */

const FIELD_STYLE: CSSProperties = {
  width: "100%",
  borderRadius: 12,
  background: "rgba(255,255,255,.05)",
  border: "1px solid rgba(255,255,255,.09)",
  padding: "10px 13px",
  fontSize: 13,
  color: "#e8eaec",
  outline: "none",
};

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="flex min-w-0 flex-1 flex-col" style={{ gap: 6 }}>
      <span style={{ fontSize: 11.5, color: "rgba(232,234,236,.45)" }}>{label}</span>
      {children}
      {hint && <span style={{ fontSize: 10.5, color: "rgba(232,234,236,.35)" }}>{hint}</span>}
    </label>
  );
}

export function Input({
  value,
  onChange,
  placeholder,
  type = "text",
  dir,
  style,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  dir?: "ltr" | "rtl";
  style?: CSSProperties;
}) {
  return (
    <input
      type={type}
      dir={dir}
      inputMode={type === "number" ? "decimal" : undefined}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      style={{ ...FIELD_STYLE, ...style }}
    />
  );
}

export function Select({
  value,
  onChange,
  options,
  style,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  style?: CSSProperties;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ ...FIELD_STYLE, ...style }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} style={{ background: "#101318" }}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/** A row in an editable list: content on the left, small actions trailing. */
export function ListRow({ children, actions }: { children: ReactNode; actions?: ReactNode }) {
  return (
    <div
      className="flex items-center"
      style={{ gap: 11, padding: "11px 13px", borderRadius: 14, background: "rgba(255,255,255,.04)" }}
    >
      <div className="min-w-0 flex-1">{children}</div>
      {actions && (
        <div className="flex flex-none items-center" style={{ gap: 6 }}>
          {actions}
        </div>
      )}
    </div>
  );
}

export function MiniButton({
  children,
  onClick,
  tone = "normal",
  title,
  busy = false,
}: {
  children: ReactNode;
  onClick: () => void;
  tone?: "normal" | "accent" | "danger";
  title?: string;
  busy?: boolean;
}) {
  const color = tone === "danger" ? "#ff7a6b" : tone === "accent" ? "#0f9b6e" : "rgba(232,234,236,.7)";
  const borderColor =
    tone === "danger"
      ? "rgba(255,122,107,.3)"
      : tone === "accent"
        ? "rgba(15,155,110,.35)"
        : "rgba(255,255,255,.12)";
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={busy}
      aria-busy={busy}
      style={{
        padding: "6px 10px",
        borderRadius: 9,
        border: `1px solid ${borderColor}`,
        color,
        fontSize: 11.5,
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      <BusyLabel busy={busy}>{children}</BusyLabel>
    </button>
  );
}

/**
 * Two-step delete: the first click arms, the second confirms. Destructive
 * actions here remove real records, so they never fire on a single click.
 */
export function DeleteButton({
  onConfirm,
  label,
  confirmLabel,
  busy = false,
}: {
  onConfirm: () => void;
  label: string;
  confirmLabel: string;
  busy?: boolean;
}) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const timer = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(timer);
  }, [armed]);

  return (
    <MiniButton
      tone="danger"
      busy={busy}
      onClick={() => {
        if (armed) {
          onConfirm();
          setArmed(false);
        } else {
          setArmed(true);
        }
      }}
    >
      {armed ? confirmLabel : label}
    </MiniButton>
  );
}
