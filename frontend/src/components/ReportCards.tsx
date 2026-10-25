import { Card, CardTitle, Meter } from "@/components/primitives";
import { useI18n } from "../lib/i18n";
import { useBudgets, useCategories } from "../lib/queries";
import { categoryColor, categoryName, sliceLabel } from "../lib/domain";
import type { ReportData } from "../lib/reportData";
import type { CategorySlice } from "../types";

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
      color: pct > 100 ? "var(--c-expense)" : categoryColor(category),
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
            style={{ fontSize: bare ? 12 : 12.5, color: "rgb(var(--fg-rgb) / .72)" }}
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
        <div style={{ fontSize: 11.5, color: "rgb(var(--fg-rgb) / .4)" }}>{t.budgets}</div>
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
 * Cards for the report endpoints the design never drew.
 * ------------------------------------------------------------------ */

/** income-vs-expense: two totals plus the share of income that was spent. */
export function IncomeExpenseCard({ data, bare = false }: { data: ReportData["incomeExpense"]; bare?: boolean }) {
  const { t, group, percent } = useI18n();
  if (!data) return null;

  const ratio = data.income_cents > 0 ? (data.expense_cents / data.income_cents) * 100 : 0;
  const body = (
    <>
      <div className="flex" style={{ gap: 10, marginTop: bare ? 12 : 16 }}>
        <div style={{ flex: 1, padding: "12px 14px", borderRadius: 14, background: "rgb(var(--ink-rgb) / .04)" }}>
          <div style={{ fontSize: 11, color: "rgb(var(--fg-rgb) / .45)" }}>{t.income}</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--c-income)", marginTop: 3 }}>
            {group(data.income_cents)}
          </div>
        </div>
        <div style={{ flex: 1, padding: "12px 14px", borderRadius: 14, background: "rgb(var(--ink-rgb) / .04)" }}>
          <div style={{ fontSize: 11, color: "rgb(var(--fg-rgb) / .45)" }}>{t.expense}</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--c-expense)", marginTop: 3 }}>
            {group(data.expense_cents)}
          </div>
        </div>
      </div>
      <div className="flex justify-between" style={{ fontSize: 11.5, color: "rgb(var(--fg-rgb) / .45)", marginTop: 14 }}>
        <span>{t.expense} / {t.income}</span>
        <span>{percent(ratio)}</span>
      </div>
      <Meter width={`${Math.min(100, ratio)}%`} color={ratio > 100 ? "var(--c-expense)" : "var(--c-primary)"} height={bare ? 6 : 7} />
    </>
  );

  if (bare) {
    return (
      <>
        <div style={{ fontSize: 11.5, color: "rgb(var(--fg-rgb) / .4)" }}>{t.incomeVsExpense}</div>
        {body}
      </>
    );
  }
  return (
    <Card style={{ padding: 22 }}>
      <CardTitle>{t.incomeVsExpense}</CardTitle>
      {body}
    </Card>
  );
}

/** month-over-month: this month's spend per category against last month's. */
export function MonthOverMonthCard({ rows, bare = false }: { rows: ReportData["momo"]; bare?: boolean }) {
  const { t, fa, digits, short } = useI18n();
  const { data: categories } = useCategories();
  if (rows.length === 0) return null;

  const body = (
    <div className="flex flex-col" style={{ gap: 9, marginTop: bare ? 12 : 16 }}>
      {rows.map((m) => (
        <div key={m.category_id ?? "none"} className="flex items-center" style={{ gap: 10, fontSize: 12.5 }}>
          <span className="min-w-0 flex-1 truncate" style={{ color: "rgb(var(--fg-rgb) / .75)" }}>
            {sliceLabel(m, categories, fa, t.uncategorized)}
          </span>
          <span style={{ color: "rgb(var(--fg-rgb) / .5)" }}>{short(m.current_cents)}</span>
          <span
            style={{
              minWidth: 52,
              textAlign: "end",
              fontWeight: 700,
              color:
                m.delta_percentage === null
                  ? "rgb(var(--fg-rgb) / .35)"
                  : m.delta_percentage > 0
                    ? "var(--c-expense)"
                    : "var(--c-income)",
            }}
          >
            {m.delta_percentage === null
              ? "—"
              : `${m.delta_percentage > 0 ? "+" : "−"}${digits(Math.abs(m.delta_percentage))}${fa ? "٪" : "%"}`}
          </span>
        </div>
      ))}
    </div>
  );

  if (bare) {
    return (
      <>
        <div style={{ fontSize: 11.5, color: "rgb(var(--fg-rgb) / .4)" }}>{t.vsLastMonth}</div>
        {body}
      </>
    );
  }
  return (
    <Card style={{ padding: 22 }}>
      <CardTitle>{t.vsLastMonth}</CardTitle>
      {body}
    </Card>
  );
}

/** by-account: money in and out per account. */
export function ByAccountCard({ rows, bare = false }: { rows: ReportData["byAccount"]; bare?: boolean }) {
  const { t, group } = useI18n();
  if (rows.length === 0) return null;

  const body = (
    <div className="flex flex-col" style={{ gap: 11, marginTop: bare ? 12 : 16 }}>
      {rows.map((a) => (
        <div key={a.account_id}>
          <div className="flex justify-between" style={{ fontSize: 12.5, color: "rgb(var(--fg-rgb) / .75)" }}>
            <span className="truncate">{a.label}</span>
            <span>
              <span style={{ color: "var(--c-income)" }}>{group(a.total_in_cents)}</span>
              <span style={{ color: "rgb(var(--fg-rgb) / .3)" }}> · </span>
              <span style={{ color: "var(--c-expense)" }}>{group(a.total_out_cents)}</span>
            </span>
          </div>
          <Meter
            width={`${
              a.total_in_cents + a.total_out_cents > 0
                ? (a.total_out_cents / (a.total_in_cents + a.total_out_cents)) * 100
                : 0
            }%`}
            color="var(--c-expense)"
            height={bare ? 6 : 7}
          />
        </div>
      ))}
    </div>
  );

  if (bare) {
    return (
      <>
        <div style={{ fontSize: 11.5, color: "rgb(var(--fg-rgb) / .4)" }}>{t.byAccount}</div>
        {body}
      </>
    );
  }
  return (
    <Card style={{ padding: 22 }}>
      <CardTitle>{t.byAccount}</CardTitle>
      {body}
    </Card>
  );
}
