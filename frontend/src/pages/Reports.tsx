import { useState } from "react";
import { Button } from "@/components/ui/button";
import AppShell from "../components/shell/AppShell";
import { Card, CardTitle, Chip, Meter, SectionTitle } from "@/components/primitives";
import { BudgetsCard } from "./Dashboard";
import { useI18n } from "../lib/i18n";
import { useIsDesktop } from "@/hooks/use-media-query";
import { sliceLabel } from "../lib/domain";
import {
  useByAccount,
  useCategories,
  useCategoryBreakdown,
  useIncomeVsExpense,
  useMonthOverMonth,
  useSpendOverTime,
} from "../lib/queries";
import type { Period } from "../types";

type Bucket = "daily" | "weekly" | "monthly";

/** The design's Daily / Weekly / Monthly chips over the API's period+group_by. */
const BUCKETS: Record<Bucket, { period: Period; group_by: "day" | "month" }> = {
  daily: { period: "week", group_by: "day" },
  weekly: { period: "month", group_by: "day" },
  monthly: { period: "all", group_by: "month" },
};

function useReportData(bucket: Bucket, gross: boolean) {
  const { period, group_by } = BUCKETS[bucket];

  const { data: points } = useSpendOverTime(period, group_by, gross);
  const { data: slices } = useCategoryBreakdown(period, gross);
  const { data: incomeExpense } = useIncomeVsExpense(period, gross);
  const { data: byAccount } = useByAccount(period, gross);
  const { data: momo } = useMonthOverMonth(gross);

  const bars = points ?? [];
  const max = Math.max(1, ...bars.map((b) => b.amount_cents));
  const total = bars.reduce((a, b) => a + b.amount_cents, 0);
  const avg = bars.length ? total / bars.length : 0;

  return { bars, max, total, avg, slices: slices ?? [], incomeExpense, byAccount: byAccount ?? [], momo: momo ?? [] };
}

export default function Reports() {
  const isDesktop = useIsDesktop();
  const [bucket, setBucket] = useState<Bucket>("monthly");
  const [gross, setGross] = useState(false);
  const data = useReportData(bucket, gross);

  return (
    <AppShell>
      {isDesktop ? (
        <DesktopReports bucket={bucket} setBucket={setBucket} gross={gross} setGross={setGross} data={data} />
      ) : (
        <MobileReports bucket={bucket} setBucket={setBucket} data={data} />
      )}
    </AppShell>
  );
}

type Data = ReturnType<typeof useReportData>;

function useBucketChips() {
  const { t } = useI18n();
  return [
    { key: "daily" as const, label: t.daily },
    { key: "weekly" as const, label: t.weekly },
    { key: "monthly" as const, label: t.monthly },
  ];
}

/* ------------------------------------------------------------------ *
 * Wallet Web.dc.html — reports screen
 * ------------------------------------------------------------------ */

function DesktopReports({
  bucket,
  setBucket,
  gross,
  setGross,
  data,
}: {
  bucket: Bucket;
  setBucket: (b: Bucket) => void;
  gross: boolean;
  setGross: (g: boolean) => void;
  data: Data;
}) {
  const { t, fa, short, localize } = useI18n();
  const { data: categories } = useCategories();
  const chips = useBucketChips();

  return (
    <div className="flex flex-col fade-in" style={{ gap: 18 }}>
      <Card style={{ padding: 22 }}>
        <div className="flex flex-wrap items-center justify-between" style={{ gap: 12 }}>
          <SectionTitle>{t.reports}</SectionTitle>
          <div className="flex items-center" style={{ gap: 6 }}>
            <a
              href={`${import.meta.env.VITE_API_BASE_URL ?? ""}/api/transactions/export.csv`}
              style={{ fontSize: 12, color: "#0f9b6e", fontWeight: 700, marginInlineEnd: 6 }}
            >
              {t.exportCsv}
            </a>
            <Chip active={gross} onClick={() => setGross(!gross)} className="px-[14px] py-[7px]">
              {t.gross}
            </Chip>
            {chips.map((c) => (
              <Chip
                key={c.key}
                active={bucket === c.key}
                onClick={() => setBucket(c.key)}
                className="px-[14px] py-[7px]"
              >
                {c.label}
              </Chip>
            ))}
          </div>
        </div>

        <div className="flex items-end" style={{ gap: 8, height: 170, marginTop: 20 }}>
          {data.bars.map((b, i) => (
            <div
              key={`${b.label}-${i}`}
              className="flex flex-col items-center justify-end"
              style={{ flex: 1, gap: 7, height: "100%" }}
            >
              <div style={{ fontSize: 10, color: "rgba(232,234,236,.4)" }}>{short(b.amount_cents)}</div>
              <div
                style={{
                  width: "100%",
                  borderRadius: "6px 6px 0 0",
                  background: b.amount_cents === data.max ? "#0f9b6e" : "#1f2b27",
                  height: `${Math.max(8, (b.amount_cents / data.max) * 100)}%`,
                }}
              />
              <div style={{ fontSize: 10.5, color: "rgba(232,234,236,.35)" }}>{localize(b.label)}</div>
            </div>
          ))}
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 18 }}>
        <Card style={{ padding: 22 }}>
          <CardTitle>{t.breakdown}</CardTitle>
          <div className="flex flex-col" style={{ gap: 11, marginTop: 16 }}>
            {data.slices.map((c) => (
              <div key={c.category_id ?? "none"}>
                <div className="flex justify-between" style={{ fontSize: 12.5, color: "rgba(232,234,236,.75)" }}>
                  <span>{sliceLabel(c, categories, fa, t.uncategorized)}</span>
                  <span>{short(c.amount_cents)}</span>
                </div>
                <Meter width={`${c.percentage}%`} color={c.color} />
              </div>
            ))}
          </div>
        </Card>

        <BudgetsCard slices={data.slices} />
        <IncomeExpenseCard data={data.incomeExpense} />
        <MonthOverMonthCard rows={data.momo} />
        <ByAccountCard rows={data.byAccount} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Toman Tracker App.dc.html — reports screen
 * ------------------------------------------------------------------ */

function MobileReports({
  bucket,
  setBucket,
  data,
}: {
  bucket: Bucket;
  setBucket: (b: Bucket) => void;
  data: Data;
}) {
  const { t, fa, group, short, localize } = useI18n();
  const { data: categories } = useCategories();
  const chips = useBucketChips();

  return (
    <div className="fade-in" style={{ padding: "10px 22px 0" }}>
      <div style={{ fontSize: 19, fontWeight: 700 }}>{t.reports}</div>

      <div className="flex" style={{ gap: 6, marginTop: 14 }}>
        {chips.map((c) => (
          <Button variant="plain" size="plain"
            key={c.key}
            type="button"
            onClick={() => setBucket(c.key)}
            style={{
              flex: 1,
              textAlign: "center",
              padding: "8px 0",
              borderRadius: 11,
              fontSize: 12.5,
              fontWeight: 700,
              background: bucket === c.key ? "#0f9b6e" : "transparent",
              color: bucket === c.key ? "#04120c" : "rgba(232,234,236,.7)",
              border: `1px solid ${bucket === c.key ? "#0f9b6e" : "rgba(255,255,255,.14)"}`,
            }}
          >
            {c.label}
          </Button>
        ))}
      </div>

      <div
        style={{
          marginTop: 16,
          padding: 16,
          borderRadius: 20,
          background: "#101318",
          border: "1px solid rgba(255,255,255,.06)",
        }}
      >
        <div className="flex items-baseline justify-between">
          <div style={{ fontSize: 24, fontWeight: 700 }}>{group(data.total)}</div>
          <div style={{ fontSize: 11.5, color: "rgba(232,234,236,.45)" }}>{t.avgPrefix + short(data.avg)}</div>
        </div>
        <div className="flex items-end" style={{ gap: 5, height: 76, marginTop: 14 }}>
          {data.bars.map((b, i) => (
            <div
              key={`${b.label}-${i}`}
              title={localize(b.label)}
              style={{
                flex: 1,
                borderRadius: "3px 3px 0 0",
                height: `${Math.max(8, (b.amount_cents / data.max) * 100)}%`,
                background: b.amount_cents === data.max ? "#0f9b6e" : "#1f2b27",
              }}
            />
          ))}
        </div>
      </div>

      <div style={{ marginTop: 16, paddingTop: 13, borderTop: "1px solid rgba(255,255,255,.08)" }}>
        <div style={{ fontSize: 11.5, color: "rgba(232,234,236,.4)" }}>{t.breakdown}</div>
        <div className="flex flex-col" style={{ gap: 12, marginTop: 12 }}>
          {data.slices.map((c) => (
            <div key={c.category_id ?? "none"}>
              <div className="flex justify-between" style={{ fontSize: 12.5 }}>
                <span className="flex items-center" style={{ gap: 7 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 3, background: c.color }} />
                  {sliceLabel(c, categories, fa, t.uncategorized)}
                </span>
                <span style={{ color: "rgba(232,234,236,.7)", fontWeight: 700 }}>{short(c.amount_cents)}</span>
              </div>
              <Meter width={`${c.percentage}%`} color={c.color} height={6} />
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 18, paddingTop: 13, borderTop: "1px solid rgba(255,255,255,.08)" }}>
        <IncomeExpenseCard data={data.incomeExpense} bare />
      </div>

      <div style={{ marginTop: 18, paddingTop: 13, borderTop: "1px solid rgba(255,255,255,.08)" }}>
        <BudgetsCard slices={data.slices} bare />
      </div>

      <div style={{ marginTop: 18, paddingTop: 13, borderTop: "1px solid rgba(255,255,255,.08)" }}>
        <MonthOverMonthCard rows={data.momo} bare />
      </div>

      <div style={{ marginTop: 18, paddingTop: 13, borderTop: "1px solid rgba(255,255,255,.08)" }}>
        <ByAccountCard rows={data.byAccount} bare />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Cards for the report endpoints the design never drew.
 * ------------------------------------------------------------------ */

/** income-vs-expense: two totals plus the share of income that was spent. */
export function IncomeExpenseCard({ data, bare = false }: { data: Data["incomeExpense"]; bare?: boolean }) {
  const { t, group, percent } = useI18n();
  if (!data) return null;

  const ratio = data.income_cents > 0 ? (data.expense_cents / data.income_cents) * 100 : 0;
  const body = (
    <>
      <div className="flex" style={{ gap: 10, marginTop: bare ? 12 : 16 }}>
        <div style={{ flex: 1, padding: "12px 14px", borderRadius: 14, background: "rgba(255,255,255,.04)" }}>
          <div style={{ fontSize: 11, color: "rgba(232,234,236,.45)" }}>{t.income}</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#3fd39a", marginTop: 3 }}>
            {group(data.income_cents)}
          </div>
        </div>
        <div style={{ flex: 1, padding: "12px 14px", borderRadius: 14, background: "rgba(255,255,255,.04)" }}>
          <div style={{ fontSize: 11, color: "rgba(232,234,236,.45)" }}>{t.expense}</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: "#ff7a6b", marginTop: 3 }}>
            {group(data.expense_cents)}
          </div>
        </div>
      </div>
      <div className="flex justify-between" style={{ fontSize: 11.5, color: "rgba(232,234,236,.45)", marginTop: 14 }}>
        <span>{t.expense} / {t.income}</span>
        <span>{percent(ratio)}</span>
      </div>
      <Meter width={`${Math.min(100, ratio)}%`} color={ratio > 100 ? "#ff7a6b" : "#0f9b6e"} height={bare ? 6 : 7} />
    </>
  );

  if (bare) {
    return (
      <>
        <div style={{ fontSize: 11.5, color: "rgba(232,234,236,.4)" }}>{t.incomeVsExpense}</div>
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
export function MonthOverMonthCard({ rows, bare = false }: { rows: Data["momo"]; bare?: boolean }) {
  const { t, fa, digits, short } = useI18n();
  const { data: categories } = useCategories();
  if (rows.length === 0) return null;

  const body = (
    <div className="flex flex-col" style={{ gap: 9, marginTop: bare ? 12 : 16 }}>
      {rows.map((m) => (
        <div key={m.category_id ?? "none"} className="flex items-center" style={{ gap: 10, fontSize: 12.5 }}>
          <span className="min-w-0 flex-1 truncate" style={{ color: "rgba(232,234,236,.75)" }}>
            {sliceLabel(m, categories, fa, t.uncategorized)}
          </span>
          <span style={{ color: "rgba(232,234,236,.5)" }}>{short(m.current_cents)}</span>
          <span
            style={{
              minWidth: 52,
              textAlign: "end",
              fontWeight: 700,
              color:
                m.delta_percentage === null
                  ? "rgba(232,234,236,.35)"
                  : m.delta_percentage > 0
                    ? "#ff7a6b"
                    : "#3fd39a",
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
        <div style={{ fontSize: 11.5, color: "rgba(232,234,236,.4)" }}>{t.vsLastMonth}</div>
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
export function ByAccountCard({ rows, bare = false }: { rows: Data["byAccount"]; bare?: boolean }) {
  const { t, group } = useI18n();
  if (rows.length === 0) return null;

  const body = (
    <div className="flex flex-col" style={{ gap: 11, marginTop: bare ? 12 : 16 }}>
      {rows.map((a) => (
        <div key={a.account_id}>
          <div className="flex justify-between" style={{ fontSize: 12.5, color: "rgba(232,234,236,.75)" }}>
            <span className="truncate">{a.label}</span>
            <span>
              <span style={{ color: "#3fd39a" }}>{group(a.total_in_cents)}</span>
              <span style={{ color: "rgba(232,234,236,.3)" }}> · </span>
              <span style={{ color: "#ff7a6b" }}>{group(a.total_out_cents)}</span>
            </span>
          </div>
          <Meter
            width={`${
              a.total_in_cents + a.total_out_cents > 0
                ? (a.total_out_cents / (a.total_in_cents + a.total_out_cents)) * 100
                : 0
            }%`}
            color="#ff7a6b"
            height={bare ? 6 : 7}
          />
        </div>
      ))}
    </div>
  );

  if (bare) {
    return (
      <>
        <div style={{ fontSize: 11.5, color: "rgba(232,234,236,.4)" }}>{t.byAccount}</div>
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
