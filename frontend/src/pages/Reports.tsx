import { useState } from "react";
import { Button } from "@/components/ui/button";
import AppShell from "../components/shell/AppShell";
import { Card, CardTitle, Chip, Meter, SectionTitle } from "@/components/primitives";
import { BudgetsCard, ByAccountCard, IncomeExpenseCard, MonthOverMonthCard } from "../components/ReportCards";
import { useI18n } from "../lib/i18n";
import { useIsDesktop } from "@/hooks/use-media-query";
import { sliceLabel } from "../lib/domain";
import { useCategories } from "../lib/queries";
import { useBucketChips, useReportData, type Bucket, type ReportData } from "../lib/reportData";
import { useFamily } from "../lib/theme";
import SpendLineChart from "../components/SpendLineChart";
import { DarkReports } from "../designs/dark/DarkScreens";
import { SoftReports } from "../designs/soft/SoftScreens";

export default function Reports() {
  const isDesktop = useIsDesktop();
  const [bucket, setBucket] = useState<Bucket>("monthly");
  const [gross, setGross] = useState(false);
  const data = useReportData(bucket, gross);
  const family = useFamily();

  if (family === "dark") {
    return (
      <AppShell>
        <DarkReports bucket={bucket} setBucket={setBucket} gross={gross} setGross={setGross} data={data} />
      </AppShell>
    );
  }
  if (family === "soft") {
    return (
      <AppShell>
        <SoftReports bucket={bucket} setBucket={setBucket} data={data} />
      </AppShell>
    );
  }

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
  data: ReportData;
}) {
  const { t, fa, short, localize } = useI18n();
  const { data: categories } = useCategories();
  const chips = useBucketChips();
  const [chart, setChart] = useState<ChartKind>("line");

  return (
    <div className="flex flex-col fade-in" style={{ gap: 18 }}>
      <Card style={{ padding: 22 }}>
        <div className="flex flex-wrap items-center justify-between" style={{ gap: 12 }}>
          <SectionTitle>{t.reports}</SectionTitle>
          <div className="flex items-center" style={{ gap: 6 }}>
            <a
              href={`${import.meta.env.VITE_API_BASE_URL ?? ""}/api/transactions/export.csv`}
              style={{ fontSize: 12, color: "var(--c-primary)", fontWeight: 700, marginInlineEnd: 6 }}
            >
              {t.exportCsv}
            </a>
            <ChartSwitch value={chart} onChange={setChart} />
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

        {chart === "line" && <SpendLineChart bars={data.bars} max={data.max} />}
        {chart === "bars" && (
          <div className="flex items-end" style={{ gap: 8, height: 170, marginTop: 20 }}>
            {data.bars.map((b, i) => (
              <div
                key={`${b.label}-${i}`}
                className="flex flex-col items-center justify-end"
                style={{ flex: 1, gap: 7, height: "100%" }}
              >
                <div style={{ fontSize: 10, color: "rgb(var(--fg-rgb) / .4)" }}>{short(b.amount_cents)}</div>
                <div
                  style={{
                    width: "100%",
                    borderRadius: "6px 6px 0 0",
                    background: b.amount_cents === data.max ? "var(--c-primary)" : "var(--c-bar-idle)",
                    height: `${Math.max(8, (b.amount_cents / data.max) * 100)}%`,
                  }}
                />
                <div style={{ fontSize: 10.5, color: "rgb(var(--fg-rgb) / .35)" }}>{localize(b.label)}</div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 18 }}>
        <Card style={{ padding: 22 }}>
          <CardTitle>{t.breakdown}</CardTitle>
          <div className="flex flex-col" style={{ gap: 11, marginTop: 16 }}>
            {data.slices.map((c) => (
              <div key={c.category_id ?? "none"}>
                <div className="flex justify-between" style={{ fontSize: 12.5, color: "rgb(var(--fg-rgb) / .75)" }}>
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
  data: ReportData;
}) {
  const { t, fa, group, short, localize } = useI18n();
  const { data: categories } = useCategories();
  const chips = useBucketChips();
  const [chart, setChart] = useState<ChartKind>("line");

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
              background: bucket === c.key ? "var(--c-primary)" : "transparent",
              color: bucket === c.key ? "var(--c-on-primary)" : "rgb(var(--fg-rgb) / .7)",
              border: `1px solid ${bucket === c.key ? "var(--c-primary)" : "rgb(var(--ink-rgb) / .14)"}`,
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
          background: "var(--c-surface-2)",
          border: "1px solid rgb(var(--ink-rgb) / .06)",
        }}
      >
        <div className="flex items-baseline justify-between">
          <div style={{ fontSize: 24, fontWeight: 700 }}>{group(data.total)}</div>
          <div style={{ fontSize: 11.5, color: "rgb(var(--fg-rgb) / .45)" }}>{t.avgPrefix + short(data.avg)}</div>
        </div>
        <div className="flex justify-end" style={{ marginTop: 10 }}>
          <ChartSwitch value={chart} onChange={setChart} />
        </div>
        {chart === "line" && <SpendLineChart bars={data.bars} max={data.max} />}
        {chart === "bars" && (
          <div className="flex items-end" style={{ gap: 5, height: 76, marginTop: 14 }}>
            {data.bars.map((b, i) => (
              <div
                key={`${b.label}-${i}`}
                title={localize(b.label)}
                style={{
                  flex: 1,
                  borderRadius: "3px 3px 0 0",
                  height: `${Math.max(8, (b.amount_cents / data.max) * 100)}%`,
                  background: b.amount_cents === data.max ? "var(--c-primary)" : "var(--c-bar-idle)",
                }}
              />
            ))}
          </div>
        )}
      </div>

      <div style={{ marginTop: 16, paddingTop: 13, borderTop: "1px solid rgb(var(--ink-rgb) / .08)" }}>
        <div style={{ fontSize: 11.5, color: "rgb(var(--fg-rgb) / .4)" }}>{t.breakdown}</div>
        <div className="flex flex-col" style={{ gap: 12, marginTop: 12 }}>
          {data.slices.map((c) => (
            <div key={c.category_id ?? "none"}>
              <div className="flex justify-between" style={{ fontSize: 12.5 }}>
                <span className="flex items-center" style={{ gap: 7 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 3, background: c.color }} />
                  {sliceLabel(c, categories, fa, t.uncategorized)}
                </span>
                <span style={{ color: "rgb(var(--fg-rgb) / .7)", fontWeight: 700 }}>{short(c.amount_cents)}</span>
              </div>
              <Meter width={`${c.percentage}%`} color={c.color} height={6} />
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 18, paddingTop: 13, borderTop: "1px solid rgb(var(--ink-rgb) / .08)" }}>
        <IncomeExpenseCard data={data.incomeExpense} bare />
      </div>

      <div style={{ marginTop: 18, paddingTop: 13, borderTop: "1px solid rgb(var(--ink-rgb) / .08)" }}>
        <BudgetsCard slices={data.slices} bare />
      </div>

      <div style={{ marginTop: 18, paddingTop: 13, borderTop: "1px solid rgb(var(--ink-rgb) / .08)" }}>
        <MonthOverMonthCard rows={data.momo} bare />
      </div>

      <div style={{ marginTop: 18, paddingTop: 13, borderTop: "1px solid rgb(var(--ink-rgb) / .08)" }}>
        <ByAccountCard rows={data.byAccount} bare />
      </div>
    </div>
  );
}

type ChartKind = "line" | "bars";

/** The line chart is the default; the design's original bars stay one tap away. */
function ChartSwitch({ value, onChange }: { value: ChartKind; onChange: (k: ChartKind) => void }) {
  const { t } = useI18n();
  return (
    <div className="flex" style={{ gap: 2, padding: 2, borderRadius: 99, background: "rgb(var(--ink-rgb) / .07)" }}>
      {(
        [
          ["line", t.chartLine],
          ["bars", t.chartBars],
        ] as [ChartKind, string][]
      ).map(([k, label]) => (
        <Button
          key={k}
          variant="plain"
          size="plain"
          onClick={() => onChange(k)}
          aria-pressed={value === k}
          style={{
            padding: "4px 11px",
            borderRadius: 99,
            fontSize: 11.5,
            fontWeight: 700,
            background: value === k ? "var(--c-primary)" : "transparent",
            color: value === k ? "var(--c-on-primary)" : "rgb(var(--fg-rgb) / .55)",
          }}
        >
          {label}
        </Button>
      ))}
    </div>
  );
}
