import { useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../components/shell/AppShell";
import { Card, Chip, EmptyNote, Field, Input, SectionTitle, Select } from "../components/ui";
import { TxRowDesktop, TxRowMobile } from "../components/TxRow";
import { useI18n } from "../lib/i18n";
import { useIsDesktop } from "../lib/useMediaQuery";
import { useAccounts, useCategories, useSmsPending, useTransactions } from "../lib/queries";
import { accountLabel, categoryName } from "../lib/domain";
import type { Direction } from "../types";

type TypeFilter = Direction | "all";

const EMPTY_RANGE = { dateFrom: "", dateTo: "", amountMin: "", amountMax: "", accountId: "" };

function useFilters() {
  const [direction, setDirection] = useState<TypeFilter>("all");
  const [categoryId, setCategoryId] = useState<number | "all">("all");
  const [search, setSearch] = useState("");
  const [range, setRange] = useState({ ...EMPTY_RANGE });

  const query = useTransactions({
    direction: direction === "all" ? undefined : direction,
    category_id: categoryId === "all" ? undefined : categoryId,
    search: search || undefined,
    date_from: range.dateFrom ? new Date(range.dateFrom).toISOString() : undefined,
    date_to: range.dateTo ? new Date(range.dateTo).toISOString() : undefined,
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
function RangeFilters({ f }: { f: ReturnType<typeof useFilters> }) {
  const { t, fa, digits } = useI18n();
  const { data: accounts } = useAccounts();

  return (
    <div
      className="flex flex-col"
      style={{ gap: 10, marginTop: 12, padding: 14, borderRadius: 16, background: "rgba(255,255,255,.04)" }}
    >
      <div className="flex flex-wrap" style={{ gap: 10 }}>
        <Field label={t.fromDate}>
          <Input
            type="date"
            dir="ltr"
            value={f.range.dateFrom}
            onChange={(v) => f.setRange({ ...f.range, dateFrom: v })}
          />
        </Field>
        <Field label={t.toDate}>
          <Input
            type="date"
            dir="ltr"
            value={f.range.dateTo}
            onChange={(v) => f.setRange({ ...f.range, dateTo: v })}
          />
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
      <button
        type="button"
        onClick={f.clearRange}
        className="self-start"
        style={{ fontSize: 12, color: "#0f9b6e", fontWeight: 700 }}
      >
        {t.clearFilters}
      </button>
    </div>
  );
}

export default function Activity() {
  const isDesktop = useIsDesktop();
  return <AppShell>{isDesktop ? <DesktopActivity /> : <MobileActivity />}</AppShell>;
}

function useChipData() {
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

/* ------------------------------------------------------------------ *
 * Wallet Web.dc.html — activity screen
 * ------------------------------------------------------------------ */

function DesktopActivity() {
  const { t } = useI18n();
  const f = useFilters();
  const [showFilters, setShowFilters] = useState(false);
  const { typeChips, catChips, categories } = useChipData();
  const { data: accounts } = useAccounts();
  const rows = f.query.data ?? [];

  return (
    <Card className="fade-in" style={{ padding: 22 }}>
      <div className="flex flex-wrap items-center justify-between" style={{ gap: 12 }}>
        <SectionTitle>{t.activity}</SectionTitle>
        <div className="flex flex-wrap items-center" style={{ gap: 6 }}>
          <input
            value={f.search}
            onChange={(e) => f.setSearch(e.target.value)}
            placeholder={t.search}
            style={{
              padding: "7px 13px",
              borderRadius: 99,
              background: "transparent",
              border: "1px solid rgba(255,255,255,.14)",
              color: "#e8eaec",
              fontSize: 12,
              outline: "none",
              width: 170,
            }}
          />
          {typeChips.map((c) => (
            <Chip key={c.key} active={f.direction === c.key} onClick={() => f.setDirection(c.key)}>
              {c.label}
            </Chip>
          ))}
          <Chip active={showFilters || f.rangeActive} onClick={() => setShowFilters(!showFilters)}>
            {t.filters}
          </Chip>
        </div>
      </div>

      {(showFilters || f.rangeActive) && <RangeFilters f={f} />}

      <div className="flex flex-wrap" style={{ gap: 6, marginTop: 14 }}>
        {catChips.map((c) => (
          <Chip
            key={String(c.key)}
            active={f.categoryId === c.key}
            onClick={() => f.setCategoryId(c.key)}
            className="px-[12px] py-[7px]"
          >
            {c.label}
          </Chip>
        ))}
      </div>

      <div className="flex flex-col" style={{ marginTop: 8 }}>
        {f.query.isLoading && <EmptyNote>{t.loading}</EmptyNote>}
        {!f.query.isLoading && rows.length === 0 && <EmptyNote>{t.empty}</EmptyNote>}
        {rows.map((tx) => (
          <TxRowDesktop key={tx.id} tx={tx} categories={categories} accounts={accounts} />
        ))}
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ *
 * Toman Tracker App.dc.html — activity screen
 * ------------------------------------------------------------------ */

function MobileActivity() {
  const { t, digits } = useI18n();
  const f = useFilters();
  const [showFilters, setShowFilters] = useState(false);
  const { typeChips, catChips, categories } = useChipData();
  const { data: pending } = useSmsPending();
  const rows = f.query.data ?? [];

  return (
    <div className="fade-in">
      <div className="flex items-center justify-between" style={{ padding: "10px 22px 0" }}>
        <div style={{ fontSize: 19, fontWeight: 700 }}>{t.activity}</div>
        <Link
          to="/inbox"
          className="flex items-center"
          style={{
            gap: 7,
            padding: "6px 11px",
            borderRadius: 99,
            background: "#101a16",
            border: "1px solid rgba(15,155,110,.35)",
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: 99, background: "#0f9b6e" }} />
          <span style={{ fontSize: 11.5, color: "#3fd39a", fontWeight: 700 }}>
            {t.inbox} {pending?.length ? digits(pending.length) : ""}
          </span>
        </Link>
      </div>

      <div className="flex" style={{ gap: 6, padding: "12px 22px 0" }}>
        {typeChips.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => f.setDirection(c.key)}
            style={{
              flex: 1,
              textAlign: "center",
              padding: "8px 0",
              borderRadius: 11,
              fontSize: 12.5,
              fontWeight: 700,
              background: f.direction === c.key ? "#0f9b6e" : "transparent",
              color: f.direction === c.key ? "#04120c" : "rgba(232,234,236,.7)",
              border: `1px solid ${f.direction === c.key ? "#0f9b6e" : "rgba(255,255,255,.14)"}`,
            }}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div
        className="flex overflow-x-auto no-scrollbar"
        style={{ gap: 6, padding: "10px 22px 0" }}
      >
        {catChips.map((c) => (
          <button
            key={String(c.key)}
            type="button"
            onClick={() => f.setCategoryId(c.key)}
            className="flex-none"
            style={{
              padding: "7px 12px",
              borderRadius: 99,
              fontSize: 11.5,
              background: f.categoryId === c.key ? "#0f9b6e" : "transparent",
              color: f.categoryId === c.key ? "#04120c" : "rgba(232,234,236,.7)",
              border: `1px solid ${f.categoryId === c.key ? "#0f9b6e" : "rgba(255,255,255,.14)"}`,
              whiteSpace: "nowrap",
            }}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div style={{ padding: "12px 22px 0" }}>
        <Chip active={showFilters || f.rangeActive} onClick={() => setShowFilters(!showFilters)}>
          {t.filters}
        </Chip>
        {(showFilters || f.rangeActive) && <RangeFilters f={f} />}
      </div>

      <div style={{ padding: "14px 22px 0" }}>
        <div style={{ fontSize: 11, color: "rgba(232,234,236,.35)" }}>
          {digits(rows.length)} {t.of} {t.activity}
        </div>
        {rows.length === 0 && !f.query.isLoading && <EmptyNote>{t.empty}</EmptyNote>}
        <div className="flex flex-col" style={{ marginTop: 4 }}>
          {rows.map((tx) => (
            <TxRowMobile key={tx.id} tx={tx} categories={categories} withAccount={false} />
          ))}
        </div>
      </div>
    </div>
  );
}
