import { useNavigate } from "react-router-dom";
import AppShell from "../components/shell/AppShell";
import { Avatar, Card, EmptyNote, SectionTitle } from "../components/ui";
import { useI18n } from "../lib/i18n";
import { useIsDesktop } from "../lib/useMediaQuery";
import { usePeopleBalances, useSettleAllMutation } from "../lib/queries";
import { initials } from "../lib/domain";
import type { PersonBalance } from "../types";

export default function People() {
  const isDesktop = useIsDesktop();
  return <AppShell>{isDesktop ? <DesktopPeople /> : <MobilePeople />}</AppShell>;
}

function useTotals(balances: PersonBalance[] | undefined) {
  const owed = (balances ?? []).filter((b) => b.net_cents > 0).reduce((a, b) => a + b.net_cents, 0);
  const owe = (balances ?? [])
    .filter((b) => b.net_cents < 0)
    .reduce((a, b) => a + Math.abs(b.net_cents), 0);
  return { owed, owe };
}

function balanceColor(net: number): string {
  return net > 0 ? "#3fd39a" : net < 0 ? "#ff7a6b" : "rgba(232,234,236,.45)";
}

function useBalanceSub() {
  const { t } = useI18n();
  return (net: number) => (net > 0 ? t.owes : net < 0 ? t.youOwe : t.settled);
}

/* ------------------------------------------------------------------ *
 * Wallet Web.dc.html — people screen
 * ------------------------------------------------------------------ */

function DesktopPeople() {
  const { t, group, money } = useI18n();
  const { data: balances, isLoading } = usePeopleBalances();
  const settleAll = useSettleAllMutation();
  const { owed, owe } = useTotals(balances);
  const sub = useBalanceSub();

  return (
    <div className="flex flex-col fade-in" style={{ gap: 18 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 14 }}>
        <div
          style={{ padding: 20, borderRadius: 20, background: "#0e1110", border: "1px solid rgba(63,211,154,.25)" }}
        >
          <div style={{ fontSize: 11.5, color: "rgba(232,234,236,.45)" }}>{t.owedToMe}</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#3fd39a", marginTop: 8 }}>{group(owed)}</div>
        </div>
        <div
          style={{ padding: 20, borderRadius: 20, background: "#0e1110", border: "1px solid rgba(255,122,107,.25)" }}
        >
          <div style={{ fontSize: 11.5, color: "rgba(232,234,236,.45)" }}>{t.iOwe}</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#ff7a6b", marginTop: 8 }}>{group(owe)}</div>
        </div>
      </div>

      <Card style={{ padding: 22 }}>
        <SectionTitle>{t.people}</SectionTitle>
        {isLoading && <EmptyNote pad={24}>{t.loading}</EmptyNote>}
        <div className="flex flex-col" style={{ marginTop: 8 }}>
          {(balances ?? []).map((p) => {
            const color = balanceColor(p.net_cents);
            return (
              <div
                key={p.person_id}
                className="flex items-center"
                style={{ gap: 13, padding: "14px 0", borderBottom: "1px solid rgba(255,255,255,.05)" }}
              >
                <Avatar color={color}>{initials(p.name)}</Avatar>
                <div className="min-w-0 flex-1">
                  <div className="truncate" style={{ fontSize: 14, fontWeight: 700 }}>
                    {p.name}
                  </div>
                  <div style={{ fontSize: 11.5, color: "rgba(232,234,236,.42)", marginTop: 2 }}>
                    {sub(p.net_cents)}
                  </div>
                </div>
                <div style={{ fontSize: 14.5, fontWeight: 700, color }}>
                  {p.net_cents === 0 ? t.settled : money(p.net_cents, true)}
                </div>
                {p.open_debt_count > 0 && (
                  <button
                    type="button"
                    onClick={() => settleAll.mutate(p.person_id)}
                    style={{
                      padding: "8px 13px",
                      borderRadius: 10,
                      border: "1px solid rgba(255,255,255,.14)",
                      fontSize: 12,
                      fontWeight: 700,
                      color: "rgba(232,234,236,.8)",
                    }}
                  >
                    {t.settleUp}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Toman Tracker App.dc.html — people screen
 * ------------------------------------------------------------------ */

function MobilePeople() {
  const { t, group, money } = useI18n();
  const { data: balances } = usePeopleBalances();
  const { owed, owe } = useTotals(balances);
  const sub = useBalanceSub();
  const navigate = useNavigate();

  return (
    <div className="fade-in" style={{ padding: "10px 22px 0" }}>
      <div style={{ fontSize: 19, fontWeight: 700 }}>{t.people}</div>

      <div className="flex" style={{ gap: 10, marginTop: 14 }}>
        <div
          style={{
            flex: 1,
            padding: 13,
            borderRadius: 16,
            background: "#101a16",
            border: "1px solid rgba(15,155,110,.22)",
          }}
        >
          <div style={{ fontSize: 11.5, color: "rgba(232,234,236,.5)" }}>{t.owedToMe}</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: "#3fd39a", marginTop: 3 }}>{group(owed)}</div>
        </div>
        <div
          style={{
            flex: 1,
            padding: 13,
            borderRadius: 16,
            background: "#1a1214",
            border: "1px solid rgba(255,122,107,.22)",
          }}
        >
          <div style={{ fontSize: 11.5, color: "rgba(232,234,236,.5)" }}>{t.iOwe}</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: "#ff7a6b", marginTop: 3 }}>{group(owe)}</div>
        </div>
      </div>

      <div className="flex flex-col" style={{ gap: 8, marginTop: 16 }}>
        {(balances ?? []).map((p) => {
          const color = balanceColor(p.net_cents);
          return (
            <div
              key={p.person_id}
              onClick={() => navigate(`/people/${p.person_id}`)}
              className="flex cursor-pointer items-center"
              style={{ gap: 12, padding: 13, borderRadius: 16, background: "#101318" }}
            >
              <Avatar size={34} color={color} background="#1a201e">
                {initials(p.name)}
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="truncate" style={{ fontSize: 13.5, fontWeight: 700 }}>
                  {p.name}
                </div>
                <div style={{ fontSize: 11, color: "rgba(232,234,236,.4)", marginTop: 2 }}>
                  {sub(p.net_cents)}
                </div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color }}>
                {p.net_cents === 0 ? t.settled : money(p.net_cents, true)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { balanceColor, useBalanceSub };
