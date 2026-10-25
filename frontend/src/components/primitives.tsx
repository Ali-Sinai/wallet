import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { DialogBackdrop, DialogPortal, DialogViewport } from "@/components/ui/dialog";
import { Drawer, DrawerPanel, DrawerPopup } from "@/components/ui/drawer";
import { Input as UiInput } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Spinner as UiSpinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { useIsDesktop } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import { useFamily, type ThemeFamily } from "../lib/theme";

/* ------------------------------------------------------------------ *
 * App primitives, built on the shadcn / Persian Labs components in
 * components/ui. Every literal here comes straight out of the design
 * bundle, so keep them in sync with project/*.dc.html rather than
 * "rounding" them to Tailwind's scale.
 *
 * Each primitive also has a Wallet Dark and a Wallet Soft form, picked
 * from the active theme, so every screen built from them follows the
 * design without its own branches:
 *   dark  no boxes — hairlines, mono small-caps labels, text-tab chips,
 *         underline fields, pill buttons
 *   soft  white rounded cards with a soft shadow, grey filled fields,
 *         pill chips and buttons
 * ------------------------------------------------------------------ */

/** Wallet Dark's small-caps label, shared by titles, field labels and text chips. */
export const DARK_LABEL: CSSProperties = {
  fontFamily: "var(--app-mono)",
  fontSize: 11,
  letterSpacing: "calc(var(--track) * .16em)",
  textTransform: "uppercase",
  color: "rgb(var(--fg-rgb) / .47)",
};
const DARK_LABEL_CLASS = "font-[family-name:var(--app-mono)] uppercase tracking-[calc(var(--track)*.16em)]";
const SOFT_SHADOW = "shadow-[0_6px_18px_rgba(0,0,0,.05)]";

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
  const family = useFamily();
  const look =
    family === "dark"
      ? "rounded-none bg-transparent border-0 border-t border-[rgb(var(--ink-rgb)/.12)]"
      : family === "soft"
        ? cn("rounded-[22px] bg-card border-0", SOFT_SHADOW)
        : "rounded-card bg-card border border-line";
  // Dark sections sit on the page's own gutter, so they drop side padding.
  const merged = family === "dark" ? { ...style, paddingInline: 0 } : style;
  return (
    <div onClick={onClick} className={cn(look, className)} style={merged}>
      {children}
    </div>
  );
}

export function CardTitle({ children }: { children: ReactNode }) {
  const family = useFamily();
  if (family === "dark") return <div style={DARK_LABEL}>{children}</div>;
  if (family === "soft") return <div className="text-[16px] font-semibold">{children}</div>;
  return <div className="text-[13.5px] font-bold">{children}</div>;
}

export function SectionTitle({ children }: { children: ReactNode }) {
  const family = useFamily();
  if (family === "dark") return <div style={DARK_LABEL}>{children}</div>;
  if (family === "soft") return <div className="text-[17px] font-semibold">{children}</div>;
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
  const family = useFamily();
  if (family === "dark") {
    // Wallet Dark: a text tab — small caps, accent underline when on.
    return (
      <Button
        variant="plain"
        size="plain"
        title={title}
        aria-pressed={active}
        onClick={onClick}
        className={cn(
          DARK_LABEL_CLASS,
          "rounded-none border-0 border-b-[1.5px] px-[4px] py-[6px] text-[11px] whitespace-nowrap transition-colors",
          active ? "border-[var(--c-accent)] text-foreground" : "border-transparent text-foreground/45",
        )}
      >
        {children}
      </Button>
    );
  }
  if (family === "soft") {
    return (
      <Button
        variant="plain"
        size="plain"
        title={title}
        aria-pressed={active}
        onClick={onClick}
        className={cn(
          "rounded-pill border-0 text-[12.5px] font-medium whitespace-nowrap transition-colors",
          active ? "bg-primary text-primary-foreground" : cn("bg-card text-foreground/60", SOFT_SHADOW),
          className,
        )}
      >
        {children}
      </Button>
    );
  }
  return (
    <Button
      variant="plain"
      size="plain"
      title={title}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "rounded-pill text-xs font-bold border transition-colors",
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-transparent text-foreground/70 border-[rgb(var(--ink-rgb)/.14)]",
        className,
      )}
    >
      {children}
    </Button>
  );
}

export function Spinner() {
  return <UiSpinner aria-hidden="true" aria-label={undefined} role={undefined} className="size-[1.15em]" />;
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
    <Button
      variant="plain"
      size="plain"
      type={type}
      onClick={onClick}
      disabled={disabled || busy}
      aria-busy={busy}
      className={cn("bg-primary text-primary-foreground font-bold disabled:opacity-50", className)}
    >
      <BusyLabel busy={busy}>{children}</BusyLabel>
    </Button>
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
  return (
    <Button
      variant="plain"
      size="plain"
      onClick={onClick}
      disabled={busy}
      aria-busy={busy}
      className={cn(
        "border font-bold",
        tone === "danger" ? "border-destructive/35 text-destructive" : "border-[rgb(var(--ink-rgb)/.14)]",
        tone === "muted" && "text-foreground/50",
        tone === "normal" && "text-foreground/80",
        className,
      )}
    >
      <BusyLabel busy={busy}>{children}</BusyLabel>
    </Button>
  );
}

/** Thin rounded meter used by the budget and breakdown rows. */
export function Meter({ width, color, height = 7 }: { width: string; color: string; height?: number }) {
  return (
    <div className="rounded-pill overflow-hidden" style={{ height, background: "rgb(var(--ink-rgb) / .07)", marginTop: 7 }}>
      <div style={{ height: "100%", width, background: color }} />
    </div>
  );
}

/** The bank-rule switch from the web design's sidebar. */
export function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return <Switch checked={on} onCheckedChange={onToggle} className="flex-none border-0 p-[2px] shadow-none data-[size=default]:h-5 data-[size=default]:w-[34px]" />;
}

export function Avatar({
  children,
  color,
  size = 36,
  background = "var(--c-avatar)",
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
    <div className="text-center text-[13px]" style={{ padding: `${pad}px 0`, color: "rgb(var(--fg-rgb) / .35)" }}>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Overlay: a centred Base UI dialog on the web layout, a swipeable
 * Persian Labs drawer on the phone layout — exactly the two treatments
 * in the bundle.
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
  const family = useFamily();
  const onOpenChange = (open: boolean) => {
    if (!open) onClose();
  };
  // Dark sheets are the black page itself behind a hairline; Soft sheets are
  // the grey canvas so the white rows inside them read as cards.
  const surface = family === "classic" ? "bg-cardAlt" : "bg-background";
  const edge = family === "dark" ? "rgb(var(--ink-rgb) / .14)" : family === "soft" ? "transparent" : "rgb(var(--ink-rgb) / .09)";
  const radius = family === "dark" ? 28 : family === "soft" ? 32 : undefined;

  if (isDesktop) {
    return (
      <DialogPrimitive.Root open onOpenChange={onOpenChange}>
        <DialogPortal>
          <DialogBackdrop className="z-40 bg-[rgb(var(--scrim-rgb)/.7)] backdrop-blur-none" />
          <DialogViewport className="z-40 flex items-center justify-center p-6">
            <DialogPrimitive.Popup
              className={cn("w-full overflow-y-auto rounded-modal fade-in outline-none", surface)}
              style={{ maxWidth, maxHeight: "86vh", padding: 26, border: `1px solid ${edge}`, borderRadius: radius }}
            >
              {children}
            </DialogPrimitive.Popup>
          </DialogViewport>
        </DialogPortal>
      </DialogPrimitive.Root>
    );
  }

  return (
    <Drawer open onOpenChange={onOpenChange}>
      <DrawerPopup
        backdropClassName="bg-[rgb(var(--scrim-rgb)/.66)] backdrop-blur-none"
        className={cn("max-w-none rounded-t-sheet border-[rgb(var(--ink-rgb)/.09)] shadow-none before:hidden", surface)}
        style={{ maxHeight: sheetMaxHeight, borderColor: edge, borderTopLeftRadius: radius, borderTopRightRadius: radius }}
      >
        <DrawerPanel className="no-scrollbar" style={{ padding: "20px 22px 26px" }}>
          {children}
        </DrawerPanel>
      </DrawerPopup>
    </Drawer>
  );
}

export function OverlayHeader({ title, onClose, closeLabel }: { title: string; onClose: () => void; closeLabel: string }) {
  const family = useFamily();
  const cross = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
  if (family === "dark") {
    return (
      <div className="flex items-center justify-between">
        <div style={DARK_LABEL}>{title}</div>
        <Button variant="plain" size="plain" aria-label={closeLabel} title={closeLabel} onClick={onClose} className="text-foreground">
          {cross}
        </Button>
      </div>
    );
  }
  if (family === "soft") {
    // The design's header: round white button, centred title.
    return (
      <div className="grid items-center" style={{ gridTemplateColumns: "44px 1fr 44px" }}>
        <Button
          variant="plain"
          size="plain"
          aria-label={closeLabel}
          title={closeLabel}
          onClick={onClose}
          className={cn("flex size-[44px] items-center justify-center rounded-full bg-card text-foreground", SOFT_SHADOW)}
        >
          {cross}
        </Button>
        <div className="text-center text-[15px] font-semibold">{title}</div>
        <span />
      </div>
    );
  }
  return (
    <div className="flex items-center justify-between">
      <div className="text-[11.5px] md:text-xs" style={{ color: "rgb(var(--fg-rgb) / .4)" }}>
        {title}
      </div>
      <Button variant="plain" size="plain" className="text-[11.5px] md:text-xs text-primary" onClick={onClose}>
        {closeLabel}
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Form primitives. The design bundle has no forms (its prototypes were
 * read-only), so these extend its language rather than copy it: same
 * radii, hairlines and muted greys as the cards.
 * ------------------------------------------------------------------ */

export const FIELD_CLASS =
  "h-auto w-full rounded-[12px] border-[rgb(var(--ink-rgb)/.09)] bg-[rgb(var(--ink-rgb)/.05)] px-[13px] py-[10px] text-[13px] md:text-[13px] text-foreground dark:bg-[rgb(var(--ink-rgb)/.05)]";

const FIELD_CLASSES: Record<ThemeFamily, string> = {
  classic: FIELD_CLASS,
  // Wallet Dark: an underline, nothing else.
  dark: "h-auto w-full rounded-none border-0 border-b border-[rgb(var(--ink-rgb)/.22)] bg-transparent dark:bg-transparent px-0 py-[10px] text-[14px] md:text-[14px] text-foreground shadow-none focus-visible:ring-0 focus-visible:border-[var(--c-accent)]",
  // Wallet Soft: a filled pill — white on the grey canvas, grey inside white cards.
  soft: "h-auto w-full rounded-[14px] border-0 bg-[var(--row-bg)] dark:bg-[var(--row-bg)] shadow-[var(--row-shadow)] px-[14px] py-[11px] text-[13.5px] md:text-[13.5px] text-foreground",
};

export function useFieldClass(): string {
  return FIELD_CLASSES[useFamily()];
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  const family = useFamily();
  const labelStyle: CSSProperties =
    family === "dark"
      ? { ...DARK_LABEL, fontSize: 10.5 }
      : family === "soft"
        ? { fontSize: 12, fontWeight: 500, color: "rgb(var(--fg-rgb) / .55)" }
        : { fontSize: 11.5, color: "rgb(var(--fg-rgb) / .45)" };
  return (
    <label className="flex min-w-0 flex-1 flex-col" style={{ gap: family === "dark" ? 2 : 6 }}>
      <span style={labelStyle}>{label}</span>
      {children}
      {hint && <span style={{ fontSize: 10.5, color: "rgb(var(--fg-rgb) / .35)" }}>{hint}</span>}
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
  const fieldClass = useFieldClass();
  return (
    <UiInput
      type={type}
      dir={dir}
      inputMode={type === "number" ? "decimal" : undefined}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={fieldClass}
      style={style}
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
  const family = useFamily();
  const fieldClass = useFieldClass();
  return (
    <NativeSelect
      value={value}
      onChange={(e) => onChange(e.target.value)}
      wrapperClassName="w-full"
      className={cn(
        fieldClass,
        family === "dark" ? "ps-0 pe-7" : "ps-[13px] pe-9",
        "leading-none shadow-none",
        family === "classic" && "dark:hover:bg-[rgb(var(--ink-rgb)/.05)]",
      )}
      style={style}
    >
      {options.map((o) => (
        <NativeSelectOption key={o.value} value={o.value} className="bg-cardAlt text-foreground">
          {o.label}
        </NativeSelectOption>
      ))}
    </NativeSelect>
  );
}

/** A row in an editable list: content on the left, small actions trailing. */
export function ListRow({ children, actions }: { children: ReactNode; actions?: ReactNode }) {
  const family = useFamily();
  const look: CSSProperties =
    family === "dark"
      ? { gap: 14, padding: "14px 0", borderBottom: "1px solid rgb(var(--ink-rgb) / .08)" }
      : family === "soft"
        ? { gap: 12, padding: "12px 14px", borderRadius: 18, background: "var(--row-bg)", boxShadow: "var(--row-shadow)" }
        : { gap: 11, padding: "11px 13px", borderRadius: 14, background: "rgb(var(--ink-rgb) / .04)" };
  return (
    <div className="flex items-center" style={look}>
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
  const family = useFamily();
  const looks: Record<ThemeFamily, string> = {
    classic: "",
    // Wallet Dark: a small-caps text action.
    dark: cn(
      DARK_LABEL_CLASS,
      "border-0 px-[2px] py-[6px] text-[10.5px] whitespace-nowrap",
      tone === "danger" ? "text-destructive" : tone === "accent" ? "text-[var(--c-accent)]" : "text-foreground/60",
    ),
    // Wallet Soft: a small pill.
    soft: cn(
      "rounded-full border-0 px-[12px] py-[7px] text-[12px] font-medium whitespace-nowrap",
      tone === "danger"
        ? "bg-[var(--c-expense-tint)] text-destructive"
        : tone === "accent"
          ? "bg-primary text-primary-foreground"
          : "bg-card text-foreground/70 shadow-[0_2px_8px_rgba(0,0,0,.06)]",
    ),
  };
  if (family !== "classic") {
    return (
      <Button variant="plain" size="plain" title={title} onClick={onClick} disabled={busy} aria-busy={busy} className={looks[family]}>
        <BusyLabel busy={busy}>{children}</BusyLabel>
      </Button>
    );
  }
  return (
    <Button
      variant="plain"
      size="plain"
      title={title}
      onClick={onClick}
      disabled={busy}
      aria-busy={busy}
      className={cn(
        "rounded-[9px] border px-[10px] py-[6px] text-[11.5px] font-bold whitespace-nowrap",
        tone === "danger" && "border-destructive/30 text-destructive",
        tone === "accent" && "border-primary/35 text-primary",
        tone === "normal" && "border-[rgb(var(--ink-rgb)/.12)] text-foreground/70",
      )}
    >
      <BusyLabel busy={busy}>{children}</BusyLabel>
    </Button>
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

/* ------------------------------------------------------------------ *
 * Buttons and choice controls the screens used to style inline.
 * ------------------------------------------------------------------ */

type ActionTone = "primary" | "outline" | "danger";

/**
 * A full-size action. Classic keeps the bundle's 14px-radius blocks;
 * Wallet Dark uses its 56px accent pill with the arrow for the primary
 * action and hairline pills otherwise; Wallet Soft uses rounded pills
 * with a coloured shadow for the primary action and white ones otherwise.
 */
export function ActionButton({
  children,
  onClick,
  tone = "primary",
  busy = false,
  disabled = false,
  grow = false,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  tone?: ActionTone;
  busy?: boolean;
  disabled?: boolean;
  /** Take the remaining width in a row (flex: 1) instead of the full width. */
  grow?: boolean;
  type?: "button" | "submit";
}) {
  const family = useFamily();
  const width: CSSProperties = grow ? { flex: 1 } : tone === "primary" ? { width: "100%" } : {};
  const base: CSSProperties = { ...width, opacity: disabled ? 0.5 : 1 };

  let style: CSSProperties;
  if (family === "dark") {
    style = {
      ...base,
      height: tone === "primary" ? 56 : 48,
      borderRadius: 28,
      padding: tone === "primary" ? "0 22px" : "0 20px",
      fontSize: tone === "primary" ? 15 : 13.5,
      fontWeight: 500,
      ...(tone === "primary"
        ? { background: "var(--c-primary)", color: "var(--c-on-primary)" }
        : tone === "danger"
          ? { border: "1px solid rgb(var(--expense-rgb) / .45)", color: "var(--c-expense)" }
          : { border: "1px solid rgb(var(--ink-rgb) / .22)", color: "var(--c-fg)" }),
    };
  } else if (family === "soft") {
    style = {
      ...base,
      height: 52,
      borderRadius: 26,
      padding: "0 22px",
      fontSize: 14,
      fontWeight: 500,
      ...(tone === "primary"
        ? { background: "var(--c-primary)", color: "var(--c-on-primary)", boxShadow: "0 8px 20px rgb(var(--primary-rgb) / .28)" }
        : { background: "var(--row-bg)", color: tone === "danger" ? "var(--c-expense)" : "var(--c-fg)", boxShadow: "var(--row-shadow)" }),
    };
  } else {
    style = {
      ...base,
      textAlign: "center",
      padding: tone === "primary" ? "12px 0" : "12px 16px",
      borderRadius: 14,
      fontSize: 13,
      fontWeight: 700,
      ...(tone === "primary"
        ? { background: "var(--c-primary)", color: "var(--c-on-primary)" }
        : tone === "danger"
          ? { border: "1px solid rgb(var(--expense-rgb) / .35)", color: "var(--c-expense)" }
          : { border: "1px solid rgb(var(--ink-rgb) / .14)", color: "rgb(var(--fg-rgb) / .8)" }),
    };
  }

  const arrow = family === "dark" && tone === "primary" && (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="rtl:-scale-x-100" aria-hidden>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );

  return (
    <Button
      variant="plain"
      size="plain"
      type={type}
      onClick={onClick}
      disabled={disabled || busy}
      aria-busy={busy}
      className={cn("flex items-center", arrow ? "justify-between" : "justify-center")}
      style={style}
    >
      <BusyLabel busy={busy}>{children}</BusyLabel>
      {arrow}
    </Button>
  );
}

/**
 * Two-to-four way switch (withdraw / deposit, all / in / out). Classic draws
 * a row of outlined blocks, Dark a row of text tabs, Soft the design's white
 * pill with the active segment filled.
 */
export function Segmented<K extends string>({
  items,
  value,
  onChange,
}: {
  items: { key: K; label: string }[];
  value: K;
  onChange: (k: K) => void;
}) {
  const family = useFamily();
  if (family === "dark") {
    return (
      <div className="flex" style={{ gap: 22 }}>
        {items.map((it) => (
          <Chip key={it.key} active={it.key === value} onClick={() => onChange(it.key)}>
            {it.label}
          </Chip>
        ))}
      </div>
    );
  }
  if (family === "soft") {
    return (
      <div
        className={cn("grid bg-card", SOFT_SHADOW)}
        style={{ gridTemplateColumns: `repeat(${items.length},1fr)`, padding: 5, borderRadius: 26 }}
      >
        {items.map((it) => (
          <Button
            key={it.key}
            variant="plain"
            size="plain"
            aria-pressed={it.key === value}
            onClick={() => onChange(it.key)}
            style={{
              padding: "10px 0",
              borderRadius: 21,
              fontSize: 13,
              fontWeight: it.key === value ? 500 : 400,
              background: it.key === value ? "var(--c-primary)" : "transparent",
              color: it.key === value ? "var(--c-on-primary)" : "rgb(var(--fg-rgb) / .55)",
            }}
          >
            {it.label}
          </Button>
        ))}
      </div>
    );
  }
  return (
    <div className="flex" style={{ gap: 6 }}>
      {items.map((it) => (
        <Button
          key={it.key}
          variant="plain"
          size="plain"
          aria-pressed={it.key === value}
          onClick={() => onChange(it.key)}
          style={{
            flex: 1,
            textAlign: "center",
            padding: "11px 0",
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 700,
            background: it.key === value ? "var(--c-primary)" : "transparent",
            color: it.key === value ? "var(--c-on-primary)" : "rgb(var(--fg-rgb) / .7)",
            border: `1px solid ${it.key === value ? "var(--c-primary)" : "rgb(var(--ink-rgb) / .14)"}`,
          }}
        >
          {it.label}
        </Button>
      ))}
    </div>
  );
}

/** A full-width option row (e.g. "I paid — they owe me"). */
export function Choice({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  const family = useFamily();
  if (family === "dark") {
    return (
      <Button
        variant="plain"
        size="plain"
        aria-pressed={active}
        onClick={onClick}
        className="flex items-center"
        style={{ gap: 14, padding: "12px 0", fontSize: 15, textAlign: "start", color: active ? "var(--c-fg)" : "rgb(var(--fg-rgb) / .5)" }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            flex: "none",
            background: active ? "var(--c-accent)" : "rgb(var(--ink-rgb) / .25)",
          }}
        />
        {children}
      </Button>
    );
  }
  if (family === "soft") {
    return (
      <Button
        variant="plain"
        size="plain"
        aria-pressed={active}
        onClick={onClick}
        style={{
          padding: "15px 18px",
          borderRadius: 22,
          fontSize: 14,
          fontWeight: 500,
          textAlign: "start",
          background: active ? "var(--c-primary)" : "var(--c-surface)",
          color: active ? "var(--c-on-primary)" : "var(--c-fg)",
          boxShadow: active ? "0 8px 20px rgb(var(--primary-rgb) / .25)" : "0 6px 18px rgba(0,0,0,.05)",
        }}
      >
        {children}
      </Button>
    );
  }
  return (
    <Button
      variant="plain"
      size="plain"
      aria-pressed={active}
      onClick={onClick}
      style={{
        padding: "12px 15px",
        borderRadius: 13,
        fontSize: 13,
        fontWeight: 700,
        textAlign: "start",
        background: active ? "var(--c-primary)" : "transparent",
        color: active ? "var(--c-on-primary)" : "rgb(var(--fg-rgb) / .7)",
        border: `1px solid ${active ? "var(--c-primary)" : "rgb(var(--ink-rgb) / .14)"}`,
      }}
    >
      {children}
    </Button>
  );
}

/** Small section label inside a sheet or card ("Category", "With whom?"). */
export function SubLabel({ children, top = 16 }: { children: ReactNode; top?: number }) {
  const family = useFamily();
  const style: CSSProperties =
    family === "dark"
      ? { ...DARK_LABEL, marginTop: top + 6 }
      : family === "soft"
        ? { fontSize: 15, fontWeight: 600, marginTop: top + 4 }
        : { fontSize: 12, color: "rgb(var(--fg-rgb) / .4)", marginTop: top };
  return <div style={style}>{children}</div>;
}
