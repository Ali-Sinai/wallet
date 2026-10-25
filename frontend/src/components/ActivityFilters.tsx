import { useState } from "react";
import { addDays, startOfDay } from "@/lib/persian-date";
import { DateField } from "@/components/DateFields";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/primitives";
import { useI18n } from "../lib/i18n";
import { useAccounts, useCategories, useTransactions } from "../lib/queries";
import { accountLabel, categoryName } from "../lib/domain";
import type { Direction } from "../types";
import { useFamily } from "../lib/theme";

export type TypeFilter = Direction | "all";

const EMPTY_RANGE = {
  dateFrom: null as Date | null,
  dateTo: null as Date | null,
  amountMin: "",
  amountMax: "",
  accountId: "",
};

export function useFilters() {
  const [direction, setDirection] = useState<TypeFilter>("all");
  const [categoryId, setCategoryId] = useState<number | "all">("all");
  const [search, setSearch] = useState("");
  const [range, setRange] = useState({ ...EMPTY_RANGE });

  const query = useTransactions({
    direction: direction === "all" ? undefined : direction,
    category_id: categoryId === "all" ? undefined : categoryId,
    search: search || undefined,
    // Whole local days: from the start of "from" up to (not including) the
    // day after "to", since the API's date_to is exclusive.
    date_from: range.dateFrom ? startOfDay(range.dateFrom).toISOString() : undefined,
    date_to: range.dateTo ? addDays(startOfDay(range.dateTo), 1).toISOString() : undefined,
    amount_min: range.amountMin ? Math.round(Number(range.amountMin) * 100) : undefined,
    amount_max: range.amountMax ? Math.round(Number(range.amountMax) * 100) : undefined,
    account_id: range.accountId ? Number(range.accountId) : undefined,
  });

  const rangeActive = Object.values(range).some(Boolean);

  return {
    direction,
    setDirection,
    categoryId,
    setCategoryId,
    search,
    setSearch,
    range,
    setRange,
    rangeActive,
    clearRange: () => setRange({ ...EMPTY_RANGE }),
    query,
  };
}

/** Date / amount / account filters — API-supported, absent from the design. */
export function RangeFilters({ f }: { f: ReturnType<typeof useFilters> }) {
  const { t, fa, digits } = useI18n();
  const { data: accounts } = useAccounts();
  const family = useFamily();
  const box =
    family === "dark"
      ? { gap: 16, marginTop: 18, paddingTop: 6 }
      : family === "soft"
        ? { gap: 12, marginTop: 14, padding: 18, borderRadius: 22, background: "var(--c-surface)", boxShadow: "0 6px 18px rgba(0,0,0,.05)" }
        : { gap: 10, marginTop: 12, padding: 14, borderRadius: 16, background: "rgb(var(--ink-rgb) / .04)" };

  return (
    <div className="soft-card flex flex-col" style={box}>
      <div className="flex flex-wrap" style={{ gap: 10 }}>
        <Field label={t.fromDate}>
          <DateField value={f.range.dateFrom} onChange={(v) => f.setRange({ ...f.range, dateFrom: v })} />
        </Field>
        <Field label={t.toDate}>
          <DateField value={f.range.dateTo} onChange={(v) => f.setRange({ ...f.range, dateTo: v })} />
        </Field>
      </div>
      <div className="flex flex-wrap" style={{ gap: 10 }}>
        <Field label={t.minAmount}>
          <Input
            type="number"
            dir="ltr"
            value={f.range.amountMin}
            onChange={(v) => f.setRange({ ...f.range, amountMin: v })}
          />
        </Field>
        <Field label={t.maxAmount}>
          <Input
            type="number"
            dir="ltr"
            value={f.range.amountMax}
            onChange={(v) => f.setRange({ ...f.range, amountMax: v })}
          />
        </Field>
      </div>
      <Field label={t.account}>
        <Select
          value={f.range.accountId}
          onChange={(v) => f.setRange({ ...f.range, accountId: v })}
          options={[
            { value: "", label: t.allFilter },
            ...(accounts ?? []).map((a) => ({ value: String(a.id), label: accountLabel(a, fa, digits) })),
          ]}
        />
      </Field>
      <Button variant="plain" size="plain"
        onClick={f.clearRange}
        className="self-start"
        style={{ fontSize: 12, color: "var(--c-primary)", fontWeight: 700 }}
      >
        {t.clearFilters}
      </Button>
    </div>
  );
}

export function useChipData() {
  const { t, fa } = useI18n();
  const { data: categories } = useCategories();
  const typeChips: { key: TypeFilter; label: string }[] = [
    { key: "all", label: t.allFilter },
    { key: "deposit", label: t.inn },
    { key: "withdrawal", label: t.outFilter },
  ];
  const catChips: { key: number | "all"; label: string }[] = [
    { key: "all", label: t.allCats },
    ...(categories ?? []).map((c) => ({ key: c.id as number | "all", label: categoryName(c, fa, "") })),
  ];
  return { typeChips, catChips, categories };
}
