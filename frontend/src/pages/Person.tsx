import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AppShell from "../components/shell/AppShell";
import { Avatar, Card, EmptyNote, Input, MiniButton } from "../components/ui";
import { useI18n } from "../lib/i18n";
import { useIsDesktop } from "../lib/useMediaQuery";
import {
  usePeopleBalances,
  usePersonDebts,
  useSettleAllMutation,
  useSettleDebtMutation,
  useTransactions,
} from "../lib/queries";
import { initials, signedCents, txTitle } from "../lib/domain";
import { balanceColor, useBalanceSub } from "./People";
import type { Debt } from "../types";

export default function Person() {
  const { id } = useParams();
  const personId = Number(id);
  const isDesktop = useIsDesktop();
  const { t, money, localize } = useI18n();
  const navigate = useNavigate();

  const { data: balances } = usePeopleBalances();
  const { data: debts } = usePersonDebts(personId);
  const { data: shared } = useTransactions({ person_id: personId });
  const settleAll = useSettleAllMutation();
  const sub = useBalanceSub();

  const person = balances?.find((b) => b.person_id === personId);
  const color = balanceColor(person?.net_cents ?? 0);
  const openDebts = (debts ?? []).filter((d) => d.amount_cents - d.amount_settled_cents > 0);

  const body = !person ? (
    <EmptyNote>{t.loading}</EmptyNote>
  ) : (
    <>
      <button type="button" onClick={() => navigate("/people")} style={{ fontSize: 12, color: "#0f9b6e" }}>
        ‹ {t.people}
      </button>

      <div className="flex items-center" style={{ gap: 14, marginTop: 14 }}>
        <Avatar size={52} color={color}>
          {initials(person.name)}
        </Avatar>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{person.name}</div>
          <div style={{ fontSize: 11.5, color: "rgba(232,234,236,.45)", marginTop: 2 }}>
            {sub(person.net_cents)}
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: 16,
          padding: 18,
          borderRadius: 20,
          background: "linear-gradient(155deg,#12241d 0%,#0b120f 70%)",
          border: "1px solid rgba(15,155,110,.25)",
        }}
      >
        <div style={{ fontSize: 11.5, color: "rgba(232,234,236,.45)" }}>{sub(person.net_cents)}</div>
        <div style={{ fontSize: 30, fontWeight: 700, marginTop: 4, color }}>
          {person.net_cents === 0 ? t.settled : money(person.net_cents, true)}
        </div>
        {person.open_debt_count > 0 && (
          <button
            type="button"
            onClick={() => settleAll.mutate(person.person_id)}
            style={{
              width: "100%",
              textAlign: "center",
              padding: "11px 0",
              borderRadius: 13,
              background: "#0f9b6e",
              color: "#04120c",
              fontSize: 13,
              fontWeight: 700,
              marginTop: 14,
            }}
          >
            {t.settleUp}
          </button>
        )}
      </div>

      <div style={{ marginTop: 18, paddingTop: 13, borderTop: "1px solid rgba(255,255,255,.08)" }}>
        <div style={{ fontSize: 11.5, color: "rgba(232,234,236,.4)" }}>{t.debts}</div>
        <div className="flex flex-col" style={{ gap: 8, marginTop: 10 }}>
          {openDebts.map((debt) => (
            <DebtRow key={debt.id} debt={debt} />
          ))}
          {openDebts.length === 0 && <EmptyNote pad={24}>{t.settled}</EmptyNote>}
        </div>
      </div>

      <div style={{ marginTop: 18, paddingTop: 13, borderTop: "1px solid rgba(255,255,255,.08)" }}>
        <div style={{ fontSize: 11.5, color: "rgba(232,234,236,.4)" }}>{t.ledger}</div>
        <div className="flex flex-col" style={{ marginTop: 4 }}>
          {(shared ?? []).map((tx) => {
            const signed = signedCents(tx);
            return (
              <div
                key={tx.id}
                className="flex items-center"
                style={{ gap: 12, padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,.05)" }}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate" style={{ fontSize: 13, fontWeight: 700 }}>
                    {txTitle(tx, t.transaction)}
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(232,234,236,.35)", marginTop: 2 }}>
                    {localize(tx.occurred_at_jalali)}
                  </div>
                </div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: signed < 0 ? "#ff7a6b" : "#3fd39a" }}>
                  {money(signed, true)}
                </div>
              </div>
            );
          })}
          {shared?.length === 0 && <EmptyNote pad={24}>{t.empty}</EmptyNote>}
        </div>
      </div>
    </>
  );

  return (
    <AppShell>
      {isDesktop ? (
        <Card className="fade-in" style={{ padding: 22 }}>
          {body}
        </Card>
      ) : (
        <div className="fade-in" style={{ padding: "10px 22px 0" }}>
          {body}
        </div>
      )}
    </AppShell>
  );
}

/** One open debt, with the API's partial-settlement amount. */
function DebtRow({ debt }: { debt: Debt }) {
  const { t, group, money } = useI18n();
  const settle = useSettleDebtMutation();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");

  const remaining = debt.amount_cents - debt.amount_settled_cents;
  const owedToMe = debt.direction === "owed_to_me";
  const color = owedToMe ? "#3fd39a" : "#ff7a6b";

  return (
    <div style={{ padding: "12px 14px", borderRadius: 15, background: "rgba(255,255,255,.04)" }}>
      <div className="flex items-center" style={{ gap: 11 }}>
        <div className="min-w-0 flex-1">
          <div style={{ fontSize: 13, fontWeight: 700, color }}>
            {owedToMe ? t.owedToMeShort : t.iOweShort} · {money(remaining)}
          </div>
          <div style={{ fontSize: 11, color: "rgba(232,234,236,.4)", marginTop: 2 }}>
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
          <button
            type="button"
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
            style={{
              flex: "none",
              padding: "10px 16px",
              borderRadius: 12,
              background: "#0f9b6e",
              color: "#04120c",
              fontSize: 12.5,
              fontWeight: 700,
            }}
          >
            {t.settle}
          </button>
        </div>
      )}

      {settle.isError && (
        <div style={{ color: "#ff7a6b", fontSize: 11.5, marginTop: 8 }}>
          {(settle.error as Error).message}
        </div>
      )}
    </div>
  );
}
