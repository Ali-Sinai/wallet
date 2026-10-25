import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { BusyLabel } from "@/components/primitives";
import { Icon, P } from "./shared";

/* Call-to-action shapes from the two designs, shared by their screens and the split sheet. */

const softMuted = "rgb(var(--fg-rgb) / .55)";

/** Wallet Dark: accent fill, label on one side, arrow on the other. */
export function PillButton({ children, onClick, disabled, busy }: { children: ReactNode; onClick: () => void; disabled?: boolean; busy?: boolean }) {
  return (
    <Button
      variant="plain"
      size="plain"
      onClick={onClick}
      disabled={disabled}
      aria-busy={busy}
      className="flex w-full items-center justify-between"
      style={{
        background: "var(--c-primary)",
        color: "var(--c-on-primary)",
        height: 56,
        borderRadius: 28,
        padding: "0 22px",
        fontSize: 15,
        fontWeight: 500,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <BusyLabel busy={!!busy}>{children}</BusyLabel>
      <Icon size={20} d={P.arrow} color="var(--c-on-primary)" w={1.6} flip />
    </Button>
  );
}

/** Wallet Soft: the split-bill screen's bottom bar: a total on one side, the accent action on the other. */
export function TotalBar({
  label,
  value,
  action,
  onAction,
  busy,
  disabled,
}: {
  label: string;
  value: string;
  action: string;
  onAction: () => void;
  busy?: boolean;
  disabled?: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between"
      style={{ padding: "16px 16px 16px 24px", borderRadius: 30, background: "var(--c-surface)", boxShadow: "0 10px 30px rgba(0,0,0,.08)", gap: 12 }}
    >
      <div className="flex min-w-0 flex-col">
        <span style={{ fontSize: 12, color: softMuted }}>{label}</span>
        <span className="truncate" style={{ fontSize: 18, fontWeight: 600 }}>
          {value}
        </span>
      </div>
      <Button
        variant="plain"
        size="plain"
        onClick={onAction}
        disabled={busy || disabled}
        aria-busy={busy}
        style={{
          height: 52,
          padding: "0 26px",
          borderRadius: 26,
          background: "var(--c-primary)",
          color: "var(--c-on-primary)",
          fontSize: 14,
          fontWeight: 500,
          flex: "none",
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <BusyLabel busy={!!busy}>{action}</BusyLabel>
      </Button>
    </div>
  );
}
