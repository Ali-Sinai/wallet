import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import Header from "../components/Header";
import SmsPendingList from "../components/SmsPendingList";
import { api, withQuery } from "../lib/api";
import { useDashboard, useUncategorized } from "../lib/queries";
import { formatToman, toPersianDigits } from "../lib/money";
import type { CategorySlice, Period } from "../types";
import { Link } from "react-router-dom";

const PERIODS: { key: Period; label: string }[] = [
  { key: "today", label: "امروز" },
  { key: "week", label: "این هفته" },
  { key: "month", label: "این ماه" },
  { key: "all", label: "همه" },
];

export default function Dashboard() {
  const [period, setPeriod] = useState<Period>("month");
  const [gross, setGross] = useState(false);
  const { data: dashboard, isLoading } = useDashboard(period, gross);
  const { data: uncategorized } = useUncategorized();
  const { data: categoryBreakdown } = useQuery({
    queryKey: ["reports", "category-breakdown", period, gross],
    queryFn: () => api.get<CategorySlice[]>(withQuery("/reports/category-breakdown", { period, gross })),
  });

  return (
    <div className="max-w-lg mx-auto pb-24">
      <Header title="کیف پول" />
      <div className="px-4 mt-4 flex flex-col gap-4">
        <div className="flex gap-1.5 overflow-x-auto">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-3.5 py-2 rounded-pill text-xs font-bold whitespace-nowrap border ${
                period === p.key ? "bg-accent text-[#04120c] border-accent" : "border-border text-text/70"
              }`}
            >
              {p.label}
            </button>
          ))}
          <div className="flex-1" />
          <button
            onClick={() => setGross((g) => !g)}
            className="px-3 py-2 rounded-pill text-xs font-bold border border-border text-text/70 whitespace-nowrap"
          >
            {gross ? "هزینه ناخالص" : "سهم واقعی من"}
          </button>
        </div>

        {uncategorized && uncategorized.length > 0 && (
          <Link
            to="/review"
            className="flex items-center justify-between px-4 py-3 rounded-2xl bg-white/5 border border-border"
          >
            <span className="text-[13px] font-bold">دسته‌بندی نشده</span>
            <span className="px-2 py-1 rounded-pill bg-expense text-[#210805] text-xs font-bold">
              {toPersianDigits(String(uncategorized.length))}
            </span>
          </Link>
        )}

        {isLoading || !dashboard ? (
          <div className="text-center text-muted py-10 text-sm">در حال بارگذاری…</div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3.5">
              <div
                className="col-span-2 p-5 rounded-card bg-gradient-to-br from-[#12241d] to-[#0b120f] border"
                style={{ borderColor: "rgba(15,155,110,.3)" }}
              >
                <div className="text-[11.5px] tracking-wide text-muted">خالص این دوره</div>
                <div className="flex items-baseline gap-1.5 mt-2">
                  <span className="text-[32px] font-bold tracking-tight">{formatToman(dashboard.net_cents)}</span>
                  <span className="text-[13px] text-muted">ت</span>
                </div>
              </div>
              <StatCard label="واریز" value={dashboard.total_in_cents} valueClass="text-income" sub={`${toPersianDigits(String(dashboard.deposit_count))} واریز`} />
              <StatCard label="برداشت" value={dashboard.total_out_cents} valueClass="text-expense" sub={`${toPersianDigits(String(dashboard.withdrawal_count))} برداشت`} />
              <StatCard label="بزرگ‌ترین هزینه" value={dashboard.biggest_expense_cents} sub="" />
              <StatCard label="طلب من" value={dashboard.outstanding_debts_owed_to_me_cents} valueClass="text-income" sub="" />
            </div>

            <div className="p-4.5 rounded-card bg-card border border-border">
              <div className="flex justify-between items-baseline">
                <div className="text-[13.5px] font-bold">هزینه روزانه — ۱۴ روز گذشته</div>
              </div>
              <div style={{ height: 150, marginTop: 14 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dashboard.daily_spend}>
                    <XAxis dataKey="label" tick={{ fontSize: 9, fill: "rgba(232,234,236,.4)" }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: "#101318", border: "1px solid rgba(255,255,255,.1)", borderRadius: 12 }}
                      formatter={(v: number) => formatToman(v)}
                    />
                    <Bar dataKey="amount_cents" radius={[5, 5, 0, 0]} fill="#1f2b27" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {categoryBreakdown && categoryBreakdown.length > 0 && (
              <div className="p-4.5 rounded-card bg-card border border-border">
                <div className="flex justify-between items-baseline">
                  <div className="text-[13.5px] font-bold">تفکیک دسته‌ها</div>
                  <Link to="/reports" className="text-xs text-accent">گزارش ›</Link>
                </div>
                <div className="flex h-2.5 rounded overflow-hidden mt-4">
                  {categoryBreakdown.map((c) => (
                    <div key={c.category_id ?? "none"} style={{ width: `${c.percentage}%`, background: c.color }} />
                  ))}
                </div>
                <div className="grid grid-cols-1 gap-2.5 mt-4">
                  {categoryBreakdown.map((c) => (
                    <div key={c.category_id ?? "none"} className="flex items-center gap-2 text-xs">
                      <span className="w-2 h-2 rounded-sm" style={{ background: c.color }} />
                      <span className="flex-1 text-text/75">{c.label}</span>
                      <span className="text-muted">{toPersianDigits(String(c.percentage))}٪</span>
                      <span className="text-mutedSoft">{formatToman(c.amount_cents)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <SmsPendingList />
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  valueClass,
  sub,
}: {
  label: string;
  value: number;
  valueClass?: string;
  sub: string;
}) {
  return (
    <div className="p-4.5 rounded-card bg-card border border-border">
      <div className="text-[11.5px] text-muted">{label}</div>
      <div className={`text-2xl font-bold mt-2 ${valueClass ?? ""}`}>{formatToman(value)}</div>
      {sub && <div className="text-[11.5px] text-mutedSoft mt-2">{sub}</div>}
    </div>
  );
}
