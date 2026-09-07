import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import Header from "../components/Header";
import { api, withQuery } from "../lib/api";
import { formatToman, toPersianDigits } from "../lib/money";
import type { CategorySlice, Period } from "../types";

const PERIODS: { key: Period; label: string }[] = [
  { key: "week", label: "هفتگی" },
  { key: "month", label: "ماهانه" },
  { key: "all", label: "همه" },
];

interface Point {
  label: string;
  amount_cents: number;
}

interface AccountBreakdown {
  account_id: number;
  label: string;
  total_in_cents: number;
  total_out_cents: number;
}

interface MonthDelta {
  category_id: number | null;
  label: string;
  current_cents: number;
  previous_cents: number;
  delta_percentage: number | null;
}

export default function Reports() {
  const [period, setPeriod] = useState<Period>("month");

  const { data: spendOverTime } = useQuery({
    queryKey: ["reports", "spend-over-time", period],
    queryFn: () =>
      api.get<Point[]>(withQuery("/reports/spend-over-time", { period, group_by: period === "all" ? "month" : "day" })),
  });
  const { data: categoryBreakdown } = useQuery({
    queryKey: ["reports", "category-breakdown", period],
    queryFn: () => api.get<CategorySlice[]>(withQuery("/reports/category-breakdown", { period })),
  });
  const { data: byAccount } = useQuery({
    queryKey: ["reports", "by-account", period],
    queryFn: () => api.get<AccountBreakdown[]>(withQuery("/reports/by-account", { period })),
  });
  const { data: momo } = useQuery({
    queryKey: ["reports", "month-over-month"],
    queryFn: () => api.get<MonthDelta[]>("/reports/month-over-month"),
  });

  return (
    <div className="max-w-lg mx-auto pb-24">
      <Header title="گزارش" />
      <div className="px-4 mt-4 flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div className="flex gap-1.5">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={`px-3.5 py-2 rounded-pill text-xs font-bold border ${
                  period === p.key ? "bg-accent text-[#04120c] border-accent" : "border-border text-text/70"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <a
            href={withQuery("/api/transactions/export.csv", {})}
            className="text-xs text-accent font-bold"
            download
          >
            دریافت CSV
          </a>
        </div>

        <div className="p-4.5 rounded-card bg-card border border-border">
          <div className="text-[13.5px] font-bold">روند هزینه</div>
          <div style={{ height: 170, marginTop: 16 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={spendOverTime}>
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "rgba(232,234,236,.4)" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: "#101318", border: "1px solid rgba(255,255,255,.1)", borderRadius: 12 }}
                  formatter={(v: number) => formatToman(v)}
                />
                <Bar dataKey="amount_cents" radius={[6, 6, 0, 0]} fill="#0f9b6e" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-4.5 rounded-card bg-card border border-border">
          <div className="text-[13.5px] font-bold">تفکیک دسته‌ها</div>
          <div className="flex flex-col gap-2.5 mt-4">
            {categoryBreakdown?.map((c) => (
              <div key={c.category_id ?? "none"}>
                <div className="flex justify-between text-xs text-text/75">
                  <span>{c.label}</span>
                  <span>{formatToman(c.amount_cents)}</span>
                </div>
                <div className="h-1.5 rounded-pill bg-white/[.07] mt-1.5 overflow-hidden">
                  <div className="h-full" style={{ width: `${c.percentage}%`, background: c.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {momo && momo.length > 0 && (
          <div className="p-4.5 rounded-card bg-card border border-border">
            <div className="text-[13.5px] font-bold">تغییر نسبت به ماه قبل</div>
            <div className="flex flex-col gap-2 mt-3">
              {momo.map((m) => (
                <div key={m.category_id ?? "none"} className="flex justify-between text-xs">
                  <span className="text-text/75">{m.label}</span>
                  <span className="text-mutedSoft">{formatToman(m.current_cents)}</span>
                  <span className={m.delta_percentage === null ? "text-mutedSoft" : m.delta_percentage > 0 ? "text-expense" : "text-income"}>
                    {m.delta_percentage === null ? "—" : `${m.delta_percentage > 0 ? "+" : ""}${toPersianDigits(String(m.delta_percentage))}٪`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {byAccount && byAccount.length > 0 && (
          <div className="p-4.5 rounded-card bg-card border border-border">
            <div className="text-[13.5px] font-bold">تفکیک حساب‌ها</div>
            <div className="flex flex-col gap-2.5 mt-3">
              {byAccount.map((a) => (
                <div key={a.account_id} className="flex justify-between items-center text-xs">
                  <span className="text-text/75">{a.label}</span>
                  <span className="text-income">{formatToman(a.total_in_cents)}</span>
                  <span className="text-expense">{formatToman(a.total_out_cents)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
