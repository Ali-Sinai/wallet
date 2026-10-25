import { useState } from "react";
import { Button } from "@/components/ui/button";
import { BusyLabel, Input, MiniButton } from "@/components/primitives";
import { useI18n } from "../lib/i18n";
import { useSettleDebtMutation } from "../lib/queries";
import type { Debt } from "../types";

/** One open debt, with the API's partial-settlement amount. */
export default function DebtRow({ debt }: { debt: Debt }) {
  const { t, group, money } = useI18n();
  const settle = useSettleDebtMutation();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");

  const remaining = debt.amount_cents - debt.amount_settled_cents;
  const owedToMe = debt.direction === "owed_to_me";
  const color = owedToMe ? "var(--c-income)" : "var(--c-expense)";

  return (
    <div style={{ padding: "12px 14px", borderRadius: 15, background: "rgb(var(--ink-rgb) / .04)" }}>
      <div className="flex items-center" style={{ gap: 11 }}>
        <div className="min-w-0 flex-1">
          <div style={{ fontSize: 13, fontWeight: 700, color }}>
            {owedToMe ? t.owedToMeShort : t.iOweShort} · {money(remaining)}
          </div>
          <div style={{ fontSize: 11, color: "rgb(var(--fg-rgb) / .4)", marginTop: 2 }}>
            {t.remainingLabel} {group(remaining)} / {group(debt.amount_cents)}
          </div>
        </div>
        <MiniButton tone="accent" onClick={() => setOpen(!open)}>
          {t.settle}
        </MiniButton>
      </div>

      {open && (
        <div className="flex items-center" style={{ gap: 8, marginTop: 10 }}>
          <Input
            type="number"
            dir="ltr"
            value={amount}
            onChange={setAmount}
            placeholder={String(Math.round(remaining / 100))}
          />
          <Button variant="plain" size="plain"
            onClick={() => {
              const cents = amount ? Math.round(Number(amount) * 100) : remaining;
              if (cents <= 0 || cents > remaining) return;
              settle.mutate(
                { debtId: debt.id, amountCents: cents },
                {
                  onSuccess: () => {
                    setAmount("");
                    setOpen(false);
                  },
                },
              );
            }}
            disabled={settle.isPending}
            aria-busy={settle.isPending}
            style={{
              flex: "none",
              padding: "10px 16px",
              borderRadius: 12,
              background: "var(--c-primary)",
              color: "var(--c-on-primary)",
              fontSize: 12.5,
              fontWeight: 700,
            }}
          >
            <BusyLabel busy={settle.isPending}>{t.settle}</BusyLabel>
          </Button>
        </div>
      )}

      {settle.isError && (
        <div style={{ color: "var(--c-expense)", fontSize: 11.5, marginTop: 8 }}>
          {(settle.error as Error).message}
        </div>
      )}
    </div>
  );
}
