import { useI18n } from "./i18n";
import {
  useByAccount,
  useCategoryBreakdown,
  useIncomeVsExpense,
  useMonthOverMonth,
  useSpendOverTime,
} from "./queries";
import type { Period } from "../types";

export type Bucket = "daily" | "weekly" | "monthly";

/** The design's Daily / Weekly / Monthly chips over the API's period+group_by. */
const BUCKETS: Record<Bucket, { period: Period; group_by: "day" | "month" }> = {
  daily: { period: "week", group_by: "day" },
  weekly: { period: "month", group_by: "day" },
  monthly: { period: "all", group_by: "month" },
};

export function useReportData(bucket: Bucket, gross: boolean) {
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

export type ReportData = ReturnType<typeof useReportData>;

export function useBucketChips() {
  const { t } = useI18n();
  return [
    { key: "daily" as const, label: t.daily },
    { key: "weekly" as const, label: t.weekly },
    { key: "monthly" as const, label: t.monthly },
  ];
}

