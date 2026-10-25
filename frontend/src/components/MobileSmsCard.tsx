import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useI18n } from "../lib/i18n";
import { useModals } from "../lib/modals";
import { api } from "../lib/api";
import {
  useAccounts,
  useCategories,
  useConfirmSmsMutation,
  useIgnoreSmsMutation,
} from "../lib/queries";
import { accountLabel, categoryName } from "../lib/domain";
import { ActionButton, BusyLabel, Chip, DARK_LABEL } from "@/components/primitives";
import { useFamily } from "../lib/theme";
import type { SmsAttempt, Transaction } from "../types";

/**
 * The "detected from SMS" card from Toman Tracker App.dc.html.
 * `highlight` is the home-screen treatment, `list` the inbox rows.
 */
export default function MobileSmsCard({
  attempt,
  count,
  variant,
}: {
  attempt: SmsAttempt;
  count?: number;
  variant: "highlight" | "list";
}) {
  const { t, fa, digits, money } = useI18n();
  const { data: categories } = useCategories();
  const { data: accounts } = useAccounts();
  const confirm = useConfirmSmsMutation();
  const ignore = useIgnoreSmsMutation();
  const { openSplit } = useModals();
  const [picked, setPicked] = useState<number | null>(null);
  const [accountId, setAccountId] = useState<number | null>(null);
  const [splitting, setSplitting] = useState(false);
  const family = useFamily();

  // Messages that name no card (transfers, most of Blu's wording) parse fine
  // but leave the server nothing to file them under. One account needs no
  // asking; several do.
  const needsAccount = !attempt.account_last4 && (accounts?.length ?? 0) > 1;
  const chosenAccountId = needsAccount ? (accountId ?? accounts?.[0]?.id ?? null) : null;

  const signed =
    attempt.amount_cents === null
      ? 0
      : attempt.direction === "withdrawal"
        ? -attempt.amount_cents
        : attempt.amount_cents;
  const color = attempt.direction === "withdrawal" ? "var(--c-expense)" : "var(--c-income)";
  const amountText = attempt.amount_cents === null ? "—" : money(signed, true);
  const meta =
    (attempt.direction === "withdrawal" ? t.withdraw : t.deposit) +
    (attempt.account_last4 ? ` · ····${digits(attempt.account_last4)}` : "");
  const title = attempt.merchant || attempt.sender;

  async function confirmThenSplit() {
    setSplitting(true);
    try {
      const res = await confirm.mutateAsync({
        id: attempt.id,
        categoryId: picked,
        accountId: chosenAccountId,
      });
      const txId = (res as { transaction_id?: number }).transaction_id;
      if (!txId) return;
      const tx = await api.get<Transaction>(`/transactions/${txId}`);
      openSplit(tx);
    } finally {
      setSplitting(false);
    }
  }

  const highlight = variant === "highlight";
  const confirming = confirm.isPending && !splitting;
  const busy = confirm.isPending || splitting || ignore.isPending;

  const accountPicker = needsAccount ? (
    <div style={{ marginTop: highlight ? 12 : 10 }}>
      <div style={{ fontSize: 11, color: "rgb(var(--fg-rgb) / .42)", marginBottom: 6 }}>
        {t.account}
      </div>
      <div className="flex flex-wrap" style={{ gap: highlight ? 7 : 6 }}>
        {accounts?.map((a) => (
          <Chip
            key={a.id}
            active={chosenAccountId === a.id}
            onClick={() => setAccountId(a.id)}
            className={highlight ? "px-[12px] py-[7px]" : "px-[11px] py-[6px] text-[11.5px]!"}
          >
            {accountLabel(a, fa, digits)}
          </Chip>
        ))}
      </div>
    </div>
  ) : null;

  const actions = (
    <div className="flex" style={{ gap: highlight ? 8 : 7, marginTop: highlight ? 14 : 12 }}>
      <Button variant="plain" size="plain"
        onClick={() =>
          confirm.mutate({ id: attempt.id, categoryId: picked, accountId: chosenAccountId })
        }
        disabled={busy}
        aria-busy={confirming}
        style={{
          flex: 1,
          textAlign: "center",
          padding: highlight ? "11px 0" : "10px 0",
          borderRadius: highlight ? 13 : 12,
          background: "var(--c-primary)",
          color: "var(--c-on-primary)",
          fontSize: highlight ? 13 : 12.5,
          fontWeight: 700,
        }}
      >
        <BusyLabel busy={confirming}>{t.confirm}</BusyLabel>
      </Button>
      <Button variant="plain" size="plain"
        onClick={confirmThenSplit}
        disabled={busy}
        aria-busy={splitting}
        style={{
          flex: "none",
          padding: highlight ? "11px 14px" : "10px 13px",
          borderRadius: highlight ? 13 : 12,
          border: "1px solid rgb(var(--ink-rgb) / .14)",
          fontSize: highlight ? 13 : 12.5,
          color: "rgb(var(--fg-rgb) / .8)",
        }}
      >
        <BusyLabel busy={splitting}>{t.split}</BusyLabel>
      </Button>
      <Button variant="plain" size="plain"
        onClick={() => ignore.mutate(attempt.id)}
        disabled={busy}
        aria-busy={ignore.isPending}
        style={{
          flex: "none",
          padding: highlight ? "11px 14px" : "10px 13px",
          borderRadius: highlight ? 13 : 12,
          border: "1px solid rgb(var(--ink-rgb) / .14)",
          fontSize: highlight ? 13 : 12.5,
          color: "rgb(var(--fg-rgb) / .5)",
        }}
      >
        <BusyLabel busy={ignore.isPending}>{t.ignore}</BusyLabel>
      </Button>
    </div>
  );

  const rawText = (
    <div
      style={{
        fontSize: 12,
        color: "rgb(var(--fg-rgb) / .55)",
        lineHeight: 1.5,
        borderInlineStart: "2px solid rgb(var(--income-rgb) / .4)",
        paddingInlineStart: 10,
        marginTop: highlight ? 8 : 0,
      }}
    >
      {title}
    </div>
  );

  if (family !== "classic") {
    // Wallet Dark: a hairline-topped ledger block; Wallet Soft: a white card.
    const dark = family === "dark";
    return (
      <div
        className="soft-card"
        style={
          dark
            ? { paddingTop: 18, paddingBottom: 6, borderTop: "1px solid rgb(var(--ink-rgb) / .12)" }
            : { padding: 16, borderRadius: 22, background: "var(--c-surface)", boxShadow: "0 6px 18px rgba(0,0,0,.05)" }
        }
      >
        <div className="flex items-center justify-between" style={{ gap: 12 }}>
          <span style={dark ? DARK_LABEL : { fontSize: 12, color: "rgb(var(--fg-rgb) / .55)" }}>{attempt.sender}</span>
          <span style={dark ? { ...DARK_LABEL, color: "var(--c-accent)" } : { fontSize: 12, fontWeight: 500, color: "var(--c-primary)" }}>
            {t.detected}
          </span>
        </div>
        <div className="flex items-center" style={{ gap: 14, marginTop: 12 }}>
          {!dark && (
            <div
              className="flex flex-none items-center justify-center"
              style={{ width: 46, height: 46, borderRadius: "50%", background: `color-mix(in srgb, ${color} 14%, var(--c-surface))`, color, fontWeight: 600 }}
            >
              {Array.from(title)[0] ?? "·"}
            </div>
          )}
          {dark && <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, flex: "none" }} />}
          <div className="min-w-0 flex-1">
            <div className="truncate" style={{ fontSize: 15, fontWeight: dark ? 400 : 600 }}>
              {title}
            </div>
            <div style={{ fontSize: 12, color: "rgb(var(--fg-rgb) / .45)", marginTop: 2 }}>{meta}</div>
          </div>
          <span style={{ fontSize: dark ? 15 : 16, fontWeight: dark ? 400 : 600, color, fontFamily: dark ? "var(--app-mono)" : undefined }}>
            {amountText}
          </span>
        </div>
        <div className="flex flex-wrap" style={{ gap: dark ? "4px 18px" : 8, marginTop: 14 }}>
          {categories?.slice(0, 6).map((c) => (
            <Chip key={c.id} active={picked === c.id} onClick={() => setPicked(c.id)} className="px-[12px] py-[7px]">
              {categoryName(c, fa, "")}
            </Chip>
          ))}
        </div>
        {accountPicker}
        <div className="flex" style={{ gap: 8, marginTop: 16 }}>
          <ActionButton
            grow
            busy={confirming}
            disabled={busy}
            onClick={() => confirm.mutate({ id: attempt.id, categoryId: picked, accountId: chosenAccountId })}
          >
            {t.confirm}
          </ActionButton>
          <ActionButton tone="outline" busy={splitting} disabled={busy} onClick={confirmThenSplit}>
            {t.split}
          </ActionButton>
          <ActionButton tone="outline" busy={ignore.isPending} disabled={busy} onClick={() => ignore.mutate(attempt.id)}>
            {t.ignore}
          </ActionButton>
        </div>
      </div>
    );
  }

  if (highlight) {
    return (
      <div
        className="sheet-up"
        style={{
          padding: 16,
          borderRadius: 20,
          background: "var(--c-primary-tint)",
          border: "1px solid rgb(var(--primary-rgb) / .35)",
        }}
      >
        <div className="flex items-center justify-between">
          <div style={{ fontSize: 11.5, color: "var(--c-income)", fontWeight: 700 }}>{t.detected}</div>
          <div style={{ fontSize: 11, color: "rgb(var(--fg-rgb) / .4)" }}>
            {count ? `${digits(count)} ${t.pending}` : ""}
          </div>
        </div>
        {rawText}
        <div className="flex items-baseline" style={{ gap: 6, marginTop: 11 }}>
          <span style={{ fontSize: 24, fontWeight: 700, color }}>{amountText}</span>
          <span style={{ fontSize: 12, color: "rgb(var(--fg-rgb) / .45)" }}>{meta}</span>
        </div>
        <div className="flex flex-wrap" style={{ gap: 7, marginTop: 12 }}>
          {categories?.slice(0, 6).map((c) => (
            <Chip
              key={c.id}
              active={picked === c.id}
              onClick={() => setPicked(c.id)}
              className="px-[12px] py-[7px]"
            >
              {categoryName(c, fa, "")}
            </Chip>
          ))}
        </div>
        {accountPicker}
        {actions}
      </div>
    );
  }

  return (
    <div
      style={{
        padding: 15,
        borderRadius: 18,
        background: "var(--c-primary-tint)",
        border: "1px solid rgb(var(--primary-rgb) / .28)",
      }}
    >
      {rawText}
      <div className="flex items-baseline justify-between" style={{ marginTop: 10 }}>
        <div className="min-w-0">
          <div className="truncate" style={{ fontSize: 13.5, fontWeight: 700 }}>
            {title}
          </div>
          <div style={{ fontSize: 11, color: "rgb(var(--fg-rgb) / .42)", marginTop: 2 }}>{meta}</div>
        </div>
        <div className="flex-none" style={{ fontSize: 18, fontWeight: 700, color }}>
          {amountText}
        </div>
      </div>
      <div className="flex flex-wrap" style={{ gap: 6, marginTop: 10 }}>
        {categories?.slice(0, 6).map((c) => (
          <Chip
            key={c.id}
            active={picked === c.id}
            onClick={() => setPicked(c.id)}
            className="px-[11px] py-[6px] text-[11.5px]!"
          >
            {categoryName(c, fa, "")}
          </Chip>
        ))}
      </div>
      {accountPicker}
      {actions}
    </div>
  );
}
