import { useState } from "react";
import { Input as UiInput } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import AppShell from "../components/shell/AppShell";
import { Card, Chip, EmptyNote, SectionTitle } from "@/components/primitives";
import { TxRowDesktop, TxRowMobile } from "../components/TxRow";
import { RangeFilters, useChipData, useFilters } from "../components/ActivityFilters";
import { useI18n } from "../lib/i18n";
import { useIsDesktop } from "@/hooks/use-media-query";
import { useAccounts, useSmsPending } from "../lib/queries";
import { useFamily } from "../lib/theme";
import { DarkActivity } from "../designs/dark/DarkScreens";
import { SoftActivity } from "../designs/soft/SoftScreens";

export default function Activity() {
  const isDesktop = useIsDesktop();
  const family = useFamily();
  if (family === "dark") return <AppShell><DarkActivity /></AppShell>;
  if (family === "soft") return <AppShell><SoftActivity /></AppShell>;
  return <AppShell>{isDesktop ? <DesktopActivity /> : <MobileActivity />}</AppShell>;
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
          <UiInput
            className="h-auto md:text-xs"
            value={f.search}
            onChange={(e) => f.setSearch(e.target.value)}
            placeholder={t.search}
            style={{
              padding: "7px 13px",
              borderRadius: 99,
              background: "transparent",
              border: "1px solid rgb(var(--ink-rgb) / .14)",
              color: "var(--c-fg)",
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
            background: "var(--c-primary-tint)",
            border: "1px solid rgb(var(--primary-rgb) / .35)",
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: 99, background: "var(--c-primary)" }} />
          <span style={{ fontSize: 11.5, color: "var(--c-income)", fontWeight: 700 }}>
            {t.inbox} {pending?.length ? digits(pending.length) : ""}
          </span>
        </Link>
      </div>

      <div className="flex" style={{ gap: 6, padding: "12px 22px 0" }}>
        {typeChips.map((c) => (
          <Button variant="plain" size="plain"
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
              background: f.direction === c.key ? "var(--c-primary)" : "transparent",
              color: f.direction === c.key ? "var(--c-on-primary)" : "rgb(var(--fg-rgb) / .7)",
              border: `1px solid ${f.direction === c.key ? "var(--c-primary)" : "rgb(var(--ink-rgb) / .14)"}`,
            }}
          >
            {c.label}
          </Button>
        ))}
      </div>

      <div
        className="flex overflow-x-auto no-scrollbar"
        style={{ gap: 6, padding: "10px 22px 0" }}
      >
        {catChips.map((c) => (
          <Button variant="plain" size="plain"
            key={String(c.key)}
            type="button"
            onClick={() => f.setCategoryId(c.key)}
            className="flex-none"
            style={{
              padding: "7px 12px",
              borderRadius: 99,
              fontSize: 11.5,
              background: f.categoryId === c.key ? "var(--c-primary)" : "transparent",
              color: f.categoryId === c.key ? "var(--c-on-primary)" : "rgb(var(--fg-rgb) / .7)",
              border: `1px solid ${f.categoryId === c.key ? "var(--c-primary)" : "rgb(var(--ink-rgb) / .14)"}`,
              whiteSpace: "nowrap",
            }}
          >
            {c.label}
          </Button>
        ))}
      </div>

      <div style={{ padding: "12px 22px 0" }}>
        <Chip active={showFilters || f.rangeActive} onClick={() => setShowFilters(!showFilters)}>
          {t.filters}
        </Chip>
        {(showFilters || f.rangeActive) && <RangeFilters f={f} />}
      </div>

      <div style={{ padding: "14px 22px 0" }}>
        <div style={{ fontSize: 11, color: "rgb(var(--fg-rgb) / .35)" }}>
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
