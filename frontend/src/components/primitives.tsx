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

/* ------------------------------------------------------------------ *
 * App primitives, built on the shadcn / Persian Labs components in
 * components/ui. Every literal here comes straight out of the design
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
    <div onClick={onClick} className={cn("rounded-card bg-card border border-line", className)} style={style}>
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
          : "bg-transparent text-foreground/70 border-white/14",
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
        tone === "danger" ? "border-destructive/35 text-destructive" : "border-white/14",
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
    <div className="rounded-pill overflow-hidden" style={{ height, background: "rgba(255,255,255,.07)", marginTop: 7 }}>
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
    <div className="text-center text-[13px]" style={{ padding: `${pad}px 0`, color: "rgba(232,234,236,.35)" }}>
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
  const onOpenChange = (open: boolean) => {
    if (!open) onClose();
  };

  if (isDesktop) {
    return (
      <DialogPrimitive.Root open onOpenChange={onOpenChange}>
        <DialogPortal>
          <DialogBackdrop className="z-40 bg-[rgba(4,6,5,.7)] backdrop-blur-none" />
          <DialogViewport className="z-40 flex items-center justify-center p-6">
            <DialogPrimitive.Popup
              className="w-full overflow-y-auto rounded-modal bg-cardAlt fade-in outline-none"
              style={{ maxWidth, maxHeight: "86vh", padding: 26, border: "1px solid rgba(255,255,255,.09)" }}
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
        backdropClassName="bg-[rgba(4,6,5,.66)] backdrop-blur-none"
        className="max-w-none rounded-t-sheet border-white/9 bg-cardAlt shadow-none before:hidden"
        style={{ maxHeight: sheetMaxHeight }}
      >
        <DrawerPanel className="no-scrollbar" style={{ padding: "20px 22px 26px" }}>
          {children}
        </DrawerPanel>
      </DrawerPopup>
    </Drawer>
  );
}

export function OverlayHeader({ title, onClose, closeLabel }: { title: string; onClose: () => void; closeLabel: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="text-[11.5px] md:text-xs" style={{ color: "rgba(232,234,236,.4)" }}>
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
  "h-auto w-full rounded-[12px] border-white/9 bg-white/5 px-[13px] py-[10px] text-[13px] md:text-[13px] text-foreground dark:bg-white/5";

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
    <UiInput
      type={type}
      dir={dir}
      inputMode={type === "number" ? "decimal" : undefined}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={FIELD_CLASS}
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
  return (
    <NativeSelect
      value={value}
      onChange={(e) => onChange(e.target.value)}
      wrapperClassName="w-full"
      className={cn(FIELD_CLASS, "ps-[13px] pe-9 leading-none shadow-none dark:hover:bg-white/5")}
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
        tone === "normal" && "border-white/12 text-foreground/70",
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
