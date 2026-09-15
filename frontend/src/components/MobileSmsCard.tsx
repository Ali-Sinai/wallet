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
import { BusyLabel, Chip } from "@/components/primitives";
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
  const color = attempt.direction === "withdrawal" ? "#ff7a6b" : "#3fd39a";
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
      <div style={{ fontSize: 11, color: "rgba(232,234,236,.42)", marginBottom: 6 }}>
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
          background: "#0f9b6e",
          color: "#04120c",
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
          border: "1px solid rgba(255,255,255,.14)",
          fontSize: highlight ? 13 : 12.5,
          color: "rgba(232,234,236,.8)",
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
          border: "1px solid rgba(255,255,255,.14)",
          fontSize: highlight ? 13 : 12.5,
          color: "rgba(232,234,236,.5)",
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
        color: "rgba(232,234,236,.55)",
        lineHeight: 1.5,
        borderInlineStart: "2px solid rgba(63,211,154,.4)",
        paddingInlineStart: 10,
        marginTop: highlight ? 8 : 0,
      }}
    >
      {title}
    </div>
  );

  if (highlight) {
    return (
      <div
        className="sheet-up"
        style={{
          padding: 16,
          borderRadius: 20,
          background: "#101a16",
          border: "1px solid rgba(15,155,110,.35)",
        }}
      >
        <div className="flex items-center justify-between">
          <div style={{ fontSize: 11.5, color: "#3fd39a", fontWeight: 700 }}>{t.detected}</div>
          <div style={{ fontSize: 11, color: "rgba(232,234,236,.4)" }}>
            {count ? `${digits(count)} ${t.pending}` : ""}
          </div>
        </div>
        {rawText}
        <div className="flex items-baseline" style={{ gap: 6, marginTop: 11 }}>
          <span style={{ fontSize: 24, fontWeight: 700, color }}>{amountText}</span>
          <span style={{ fontSize: 12, color: "rgba(232,234,236,.45)" }}>{meta}</span>
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
        background: "#101a16",
        border: "1px solid rgba(15,155,110,.28)",
      }}
    >
      {rawText}
      <div className="flex items-baseline justify-between" style={{ marginTop: 10 }}>
        <div className="min-w-0">
          <div className="truncate" style={{ fontSize: 13.5, fontWeight: 700 }}>
            {title}
          </div>
          <div style={{ fontSize: 11, color: "rgba(232,234,236,.42)", marginTop: 2 }}>{meta}</div>
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
