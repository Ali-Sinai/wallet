import { Button } from "@/components/ui/button";
import { useNavigate, useParams } from "react-router-dom";
import AppShell from "../components/shell/AppShell";
import { Avatar, BusyLabel, Card, EmptyNote } from "@/components/primitives";
import DebtRow from "../components/DebtRow";
import { useI18n } from "../lib/i18n";
import { useIsDesktop } from "@/hooks/use-media-query";
import { usePeopleBalances, usePersonDebts, useSettleAllMutation, useTransactions } from "../lib/queries";
import { initials, signedCents, txTitle } from "../lib/domain";
import { balanceColor, useBalanceSub } from "./People";
import { useFamily } from "../lib/theme";
import { DarkPerson } from "../designs/dark/DarkScreens";
import { SoftPerson } from "../designs/soft/SoftScreens";

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
  const family = useFamily();

  if (family !== "classic") {
    const view = { person, openDebts, shared, settleAll };
    return <AppShell>{family === "dark" ? <DarkPerson {...view} /> : <SoftPerson {...view} />}</AppShell>;
  }

  const body = !person ? (
    <EmptyNote>{t.loading}</EmptyNote>
  ) : (
    <>
      <Button variant="plain" size="plain" onClick={() => navigate("/people")} style={{ fontSize: 12, color: "var(--c-primary)" }}>
        ‹ {t.people}
      </Button>

      <div className="flex items-center" style={{ gap: 14, marginTop: 14 }}>
        <Avatar size={52} color={color}>
          {initials(person.name)}
        </Avatar>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{person.name}</div>
          <div style={{ fontSize: 11.5, color: "rgb(var(--fg-rgb) / .45)", marginTop: 2 }}>
            {sub(person.net_cents)}
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: 16,
          padding: 18,
          borderRadius: 20,
          background: "linear-gradient(155deg,var(--c-primary-tint-2) 0%,var(--c-hero-to) 70%)",
          border: "1px solid rgb(var(--primary-rgb) / .25)",
        }}
      >
        <div style={{ fontSize: 11.5, color: "rgb(var(--fg-rgb) / .45)" }}>{sub(person.net_cents)}</div>
        <div style={{ fontSize: 30, fontWeight: 700, marginTop: 4, color }}>
          {person.net_cents === 0 ? t.settled : money(person.net_cents, true)}
        </div>
        {person.open_debt_count > 0 && (
          <Button variant="plain" size="plain"
            onClick={() => settleAll.mutate(person.person_id)}
            disabled={settleAll.isPending}
            aria-busy={settleAll.isPending}
            style={{
              width: "100%",
              textAlign: "center",
              padding: "11px 0",
              borderRadius: 13,
              background: "var(--c-primary)",
              color: "var(--c-on-primary)",
              fontSize: 13,
              fontWeight: 700,
              marginTop: 14,
            }}
          >
            <BusyLabel busy={settleAll.isPending}>{t.settleUp}</BusyLabel>
          </Button>
        )}
      </div>

      <div style={{ marginTop: 18, paddingTop: 13, borderTop: "1px solid rgb(var(--ink-rgb) / .08)" }}>
        <div style={{ fontSize: 11.5, color: "rgb(var(--fg-rgb) / .4)" }}>{t.debts}</div>
        <div className="flex flex-col" style={{ gap: 8, marginTop: 10 }}>
          {openDebts.map((debt) => (
            <DebtRow key={debt.id} debt={debt} />
          ))}
          {openDebts.length === 0 && <EmptyNote pad={24}>{t.settled}</EmptyNote>}
        </div>
      </div>

      <div style={{ marginTop: 18, paddingTop: 13, borderTop: "1px solid rgb(var(--ink-rgb) / .08)" }}>
        <div style={{ fontSize: 11.5, color: "rgb(var(--fg-rgb) / .4)" }}>{t.ledger}</div>
        <div className="flex flex-col" style={{ marginTop: 4 }}>
          {(shared ?? []).map((tx) => {
            const signed = signedCents(tx);
            return (
              <div
                key={tx.id}
                className="flex items-center"
                style={{ gap: 12, padding: "12px 0", borderBottom: "1px solid rgb(var(--ink-rgb) / .05)" }}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate" style={{ fontSize: 13, fontWeight: 700 }}>
                    {txTitle(tx, t.transaction)}
                  </div>
                  <div style={{ fontSize: 11, color: "rgb(var(--fg-rgb) / .35)", marginTop: 2 }}>
                    {localize(tx.occurred_at_jalali)}
                  </div>
                </div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: signed < 0 ? "var(--c-expense)" : "var(--c-income)" }}>
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
