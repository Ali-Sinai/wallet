import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import AppShell from "../components/shell/AppShell";
import { Card, CardTitle, Meter } from "../components/ui";
import { api, withQuery } from "../lib/api";
import { useI18n } from "../lib/i18n";
import { useIsDesktop } from "../lib/useMediaQuery";
import { useBudgets, useCategories, useDashboard, useSmsPending, useTransactions } from "../lib/queries";
import { categoryColor, categoryName, dayTick, jalaliMonthLabel, sliceLabel } from "../lib/domain";
import { Wordmark } from "../components/shell/TopBar";
import MobileSmsCard from "../components/MobileSmsCard";
import { TxRowMobile } from "../components/TxRow";
import type { CategorySlice } from "../types";
import type { ReactNode } from "react";

const PERIOD = "month" as const;

function useDashboardData() {
  const { data: dashboard, isLoading } = useDashboard(PERIOD, false);
  const { data: breakdown } = useQuery({
    queryKey: ["reports", "category-breakdown", PERIOD, false],
    queryFn: () =>
      api.get<CategorySlice[]>(withQuery("/reports/category-breakdown", { period: PERIOD, gross: false })),
  });
  return { dashboard, breakdown, isLoading };
}

export default function Dashboard() {
  const isDesktop = useIsDesktop();
  return <AppShell>{isDesktop ? <DesktopDashboard /> : <MobileHome />}</AppShell>;
}

/* ------------------------------------------------------------------ *
 * Wallet Web.dc.html — dashboard screen
 * ------------------------------------------------------------------ */

function DesktopDashboard() {
  const { t, fa, digits, group, money, short, percent, localize } = useI18n();
  const { dashboard, breakdown, isLoading } = useDashboardData();
  const { data: categories } = useCategories();
  const navigate = useNavigate();

  if (isLoading || !dashboard) {
    return <div className="py-10 text-center text-sm" style={{ color: "rgba(232,234,236,.45)" }}>{t.loading}</div>;
  }

  const bars = dashboard.daily_spend;
  const maxBar = Math.max(1, ...bars.map((b) => b.amount_cents));
  const avg = bars.length ? bars.reduce((a, b) => a + b.amount_cents, 0) / bars.length : 0;
  const slices = breakdown ?? [];

  return (
    <div className="flex flex-col fade-in" style={{ gap: 18 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 14 }}>
        <div
          style={{
            padding: 20,
            borderRadius: 20,
            background: "linear-gradient(155deg,#12241d,#0b120f)",
            border: "1px solid rgba(15,155,110,.3)",
          }}
        >
          <div style={{ fontSize: 11.5, letterSpacing: ".6px", color: "rgba(232,234,236,.45)" }}>
            {t.balance}
          </div>
          <div className="flex items-baseline" style={{ gap: 6, marginTop: 8 }}>
            <span style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-1px", lineHeight: 1 }}>
              {money(dashboard.net_cents)}
            </span>
            <span style={{ fontSize: 13, color: "rgba(232,234,236,.45)" }}>{t.tomanShort}</span>
          </div>
          <div style={{ fontSize: 11.5, color: "rgba(232,234,236,.42)", marginTop: 8 }}>
            {(dashboard.net_cents >= 0 ? "+" : "−") + short(dashboard.net_cents)} {t.netThisMonth}
          </div>
        </div>

        <StatCard
          label={t.in}
          value={group(dashboard.total_in_cents)}
          color="#3fd39a"
          sub={`${digits(dashboard.deposit_count)} ${t.deposits}`}
        />
        <StatCard
          label={t.out}
          value={group(dashboard.total_out_cents)}
          color="#ff7a6b"
          sub={`${digits(dashboard.withdrawal_count)} ${t.withdrawals}`}
        />
      </div>

      <Card style={{ padding: 22 }}>
        <div className="flex items-baseline justify-between">
          <CardTitle>{t.dailySpend}</CardTitle>
          <div style={{ fontSize: 12, color: "rgba(232,234,236,.45)" }}>{t.avgPrefix + short(avg)}</div>
        </div>
        <div className="flex items-end" style={{ gap: 7, height: 150, marginTop: 18 }}>
          {bars.map((b, i) => (
            <div
              key={`${b.label}-${i}`}
              className="flex flex-col items-center justify-end"
              style={{ flex: 1, gap: 6, height: "100%" }}
              title={`${b.label} · ${group(b.amount_cents)}`}
            >
              <div
                style={{
                  width: "100%",
                  borderRadius: "5px 5px 0 0",
                  background: b.amount_cents > maxBar * 0.7 ? "#0f9b6e" : "#1f2b27",
                  height: `${Math.max(6, (b.amount_cents / maxBar) * 100)}%`,
                }}
              />
              <div style={{ fontSize: 9.5, color: "rgba(232,234,236,.3)" }}>{localize(dayTick(b.label))}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card style={{ padding: 22 }}>
        <div className="flex items-baseline justify-between">
          <CardTitle>{t.breakdown}</CardTitle>
          <button type="button" onClick={() => navigate("/reports")} style={{ fontSize: 12, color: "#0f9b6e" }}>
            {t.reportsLink}
          </button>
        </div>
        <div className="flex overflow-hidden" style={{ height: 11, borderRadius: 4, marginTop: 16 }}>
          {slices.map((c) => (
            <div key={c.category_id ?? "none"} style={{ width: `${c.percentage}%`, background: c.color }} />
          ))}
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
            gap: "10px 22px",
            marginTop: 16,
          }}
        >
          {slices.map((c) => (
            <div key={c.category_id ?? "none"} className="flex items-center" style={{ gap: 9, fontSize: 12.5 }}>
              <span
                className="flex-none"
                style={{ width: 9, height: 9, borderRadius: 3, background: c.color }}
              />
              <span className="flex-1 truncate" style={{ color: "rgba(232,234,236,.75)" }}>
                {sliceLabel(c, categories, fa, t.uncategorized)}
              </span>
              <span style={{ color: "rgba(232,234,236,.5)" }}>{percent(c.percentage)}</span>
              <span style={{ color: "rgba(232,234,236,.35)" }}>{short(c.amount_cents)}</span>
            </div>
          ))}
        </div>
      </Card>

      <BudgetsCard slices={slices} columns />
    </div>
  );
}

function StatCard({ label, value, color, sub }: { label: string; value: string; color: string; sub: string }) {
  return (
    <Card style={{ padding: 20 }}>
      <div style={{ fontSize: 11.5, color: "rgba(232,234,236,.45)" }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color, marginTop: 8 }}>{value}</div>
      <div style={{ fontSize: 11.5, color: "rgba(232,234,236,.35)", marginTop: 8 }}>{sub}</div>
    </Card>
  );
}

/** Shared by the dashboard and the reports screen. */
export function BudgetsCard({
  slices,
  columns = false,
  bare = false,
}: {
  slices: CategorySlice[];
  /** Web dashboard lays budgets out in auto-fit columns. */
  columns?: boolean;
  /** Phone reports screen shows them as a bare section, no card chrome. */
  bare?: boolean;
}) {
  const { t, fa, short } = useI18n();
  const { data: budgets } = useBudgets();
  const { data: categories } = useCategories();

  const rows = (budgets ?? []).map((b) => {
    const category = categories?.find((c) => c.id === b.category_id);
    const used = slices.find((s) => s.category_id === b.category_id)?.amount_cents ?? 0;
    const pct = b.limit_cents > 0 ? (used / b.limit_cents) * 100 : 0;
    return {
      id: b.id,
      label: categoryName(category, fa, "—"),
      text: `${short(used)} / ${short(b.limit_cents)}`,
      width: `${Math.min(100, pct)}%`,
      color: pct > 100 ? "#ff7a6b" : categoryColor(category),
    };
  });

  if (rows.length === 0) return null;

  const list = (
    <div
      style={
        columns
          ? {
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))",
              gap: "16px 26px",
              marginTop: 16,
            }
          : { display: "flex", flexDirection: "column", gap: bare ? 12 : 14, marginTop: bare ? 12 : 16 }
      }
    >
      {rows.map((r) => (
        <div key={r.id}>
          <div
            className="flex justify-between"
            style={{ fontSize: bare ? 12 : 12.5, color: "rgba(232,234,236,.72)" }}
          >
            <span>{r.label}</span>
            <span>{r.text}</span>
          </div>
          <Meter width={r.width} color={r.color} height={bare ? 6 : 7} />
        </div>
      ))}
    </div>
  );

  if (bare) {
    return (
      <>
        <div style={{ fontSize: 11.5, color: "rgba(232,234,236,.4)" }}>{t.budgets}</div>
        {list}
      </>
    );
  }

  return (
    <Card style={{ padding: 22 }}>
      <CardTitle>{t.budgets}</CardTitle>
      {list}
    </Card>
  );
}

/* ------------------------------------------------------------------ *
 * Toman Tracker App.dc.html — home screen
 * ------------------------------------------------------------------ */

function MobileHome() {
  const { t, fa, lang, money, short } = useI18n();
  const { dashboard, breakdown, isLoading } = useDashboardData();
  const { data: categories } = useCategories();
  const { data: pending } = useSmsPending();
  const hasSms = (pending?.length ?? 0) > 0;

  if (isLoading || !dashboard) {
    return <div className="py-10 text-center text-sm" style={{ color: "rgba(232,234,236,.45)" }}>{t.loading}</div>;
  }

  const bars = dashboard.daily_spend;
  const maxBar = Math.max(1, ...bars.map((b) => b.amount_cents));
  const avg = bars.length ? bars.reduce((a, b) => a + b.amount_cents, 0) / bars.length : 0;
  const slices = breakdown ?? [];

  return (
    <div className="fade-in">
      <div style={{ padding: "8px 22px 0" }}>
        <Wordmark size={22} />
        <div style={{ fontSize: 11, color: "rgba(232,234,236,.45)", marginTop: 3 }}>
          {jalaliMonthLabel(lang)}
        </div>
      </div>

      <div
        style={{
          margin: "14px 22px 0",
          padding: 18,
          borderRadius: 22,
          background: "linear-gradient(155deg,#12241d 0%,#0b120f 70%)",
          border: "1px solid rgba(15,155,110,.28)",
        }}
      >
        <div style={{ fontSize: 11.5, color: "rgba(232,234,236,.45)" }}>{t.balance}</div>
        <div className="flex items-baseline" style={{ gap: 7, marginTop: 6 }}>
          <span style={{ fontSize: 36, fontWeight: 700, letterSpacing: "-.5px", lineHeight: 1.05 }}>
            {money(dashboard.net_cents)}
          </span>
          <span style={{ fontSize: 14, color: "rgba(232,234,236,.45)" }}>{t.tomanShort}</span>
        </div>
        <div className="flex" style={{ gap: 10, marginTop: 14 }}>
          <MiniStat label={t.in} value={short(dashboard.total_in_cents)} color="#3fd39a" />
          <MiniStat label={t.out} value={short(dashboard.total_out_cents)} color="#ff7a6b" />
        </div>
      </div>

      {hasSms ? (
        <div style={{ margin: "14px 22px 0" }}>
          <MobileSmsCard attempt={pending![0]} count={pending!.length} variant="highlight" />
        </div>
      ) : (
        <>
          <MobileSection>
            <div className="flex items-baseline justify-between">
              <div style={{ fontSize: 11.5, color: "rgba(232,234,236,.4)" }}>{t.dailySpend}</div>
              <div style={{ fontSize: 11.5, color: "rgba(232,234,236,.55)" }}>{t.avgPrefix + short(avg)}</div>
            </div>
            <div className="flex items-end" style={{ gap: 5, height: 62, marginTop: 11 }}>
              {bars.map((b, i) => (
                <div
                  key={`${b.label}-${i}`}
                  style={{
                    flex: 1,
                    borderRadius: "3px 3px 0 0",
                    height: `${Math.max(6, (b.amount_cents / maxBar) * 100)}%`,
                    background: b.amount_cents > maxBar * 0.7 ? "#0f9b6e" : "#1f2b27",
                  }}
                />
              ))}
            </div>
          </MobileSection>

          <MobileSection>
            <div className="flex items-baseline justify-between">
              <div style={{ fontSize: 11.5, color: "rgba(232,234,236,.4)" }}>{t.categories}</div>
              <Link to="/reports" style={{ fontSize: 11.5, color: "#0f9b6e" }}>
                {t.reportsLink}
              </Link>
            </div>
            <div className="flex overflow-hidden" style={{ height: 9, borderRadius: 3, marginTop: 10 }}>
              {slices.map((c) => (
                <div key={c.category_id ?? "none"} style={{ width: `${c.percentage}%`, background: c.color }} />
              ))}
            </div>
            <div
              className="flex flex-wrap"
              style={{ gap: "5px 14px", marginTop: 9, fontSize: 11.5, color: "rgba(232,234,236,.65)" }}
            >
              {slices.map((c) => (
                <span key={c.category_id ?? "none"}>{sliceLabel(c, categories, fa, t.uncategorized)}</span>
              ))}
            </div>
          </MobileSection>
        </>
      )}

      <RecentList />
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ flex: 1, background: "rgba(255,255,255,.04)", borderRadius: 13, padding: "10px 12px" }}>
      <div style={{ fontSize: 11.5, color: "rgba(232,234,236,.5)" }}>{label}</div>
      <div style={{ fontSize: 15.5, fontWeight: 700, color, marginTop: 2 }}>{value}</div>
    </div>
  );
}

function MobileSection({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        margin: "16px 22px 0",
        paddingTop: 13,
        borderTop: "1px solid rgba(255,255,255,.08)",
      }}
    >
      {children}
    </div>
  );
}

function RecentList() {
  const { t } = useI18n();
  const { data: transactions } = useTransactions({ limit: 4 });
  const { data: categories } = useCategories();

  return (
    <MobileSection>
      <div className="flex items-baseline justify-between">
        <div style={{ fontSize: 11.5, color: "rgba(232,234,236,.4)" }}>{t.recent}</div>
        <Link to="/activity" style={{ fontSize: 11.5, color: "#0f9b6e" }}>
          {t.all}
        </Link>
      </div>
      <div className="flex flex-col" style={{ marginTop: 4 }}>
        {(transactions ?? []).slice(0, 4).map((tx) => (
          <TxRowMobile key={tx.id} tx={tx} categories={categories} withAccount={false} />
        ))}
      </div>
    </MobileSection>
  );
}
