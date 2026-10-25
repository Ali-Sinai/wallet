import { useState, type CSSProperties, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { EmptyNote } from "@/components/primitives";
import { useIsDesktop } from "@/hooks/use-media-query";
import DebtRow from "../../components/DebtRow";
import { RangeFilters, useChipData, useFilters } from "../../components/ActivityFilters";
import { useI18n } from "../../lib/i18n";
import { useModals } from "../../lib/modals";
import { useBudgets, useCategories, usePeopleBalances, useSmsPending, useTransactions } from "../../lib/queries";
import { categoryName, dayTick, initials, sliceLabel } from "../../lib/domain";
import { useBucketChips, type ReportData, type Bucket } from "../../lib/reportData";
import type { Transaction } from "../../types";
import { Icon, P, useHomeData, useSplitPicker, useTxView, type PersonView } from "../shared";
import { MONO, label, muted } from "./DarkShell";
import { PillButton } from "../buttons";
import { DarkTitle as ScreenTitle } from "../Page";
import SpendLineChart from "../../components/SpendLineChart";

/* ------------------------------------------------------------------ *
 * Wallet Dark.dc.html screens. The design draws Home and People; the
 * rest of the app follows the same rules: no cards, hairline-free
 * lists, thin oversized numbers, mono amounts, one accent for money
 * out and for whatever the screen wants tapped.
 * ------------------------------------------------------------------ */

/** Phone gutters from the design; on desktop the shell already pads. */
function useGutter() {
  return useIsDesktop() ? 0 : 28;
}

function Section({ title, right, children, top = 40 }: { title: string; right?: ReactNode; children: ReactNode; top?: number }) {
  return (
    <div style={{ paddingTop: top }}>
      <div className="flex items-baseline justify-between">
        <span style={label}>{title}</span>
        {right}
      </div>
      <div style={{ paddingTop: 8 }}>{children}</div>
    </div>
  );
}

function SeeAll({ to }: { to: string }) {
  const { t } = useI18n();
  return (
    <Link to={to} style={{ fontSize: 12, color: muted }}>
      {t.seeAll}
    </Link>
  );
}

/** Big thin number, scaled down on narrow phones so long amounts still fit. */
function BigNumber({ children, size = 56, color }: { children: ReactNode; size?: number; color?: string }) {
  return (
    <div
      style={{
        fontSize: `clamp(${Math.round(size * 0.62)}px, ${size / 3.9}vw, ${size}px)`,
        fontWeight: 300,
        letterSpacing: "-.03em",
        lineHeight: 1,
        color,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </div>
  );
}

export function DarkTxRow({ tx, onClick }: { tx: Transaction; onClick?: () => void }) {
  const { openDetail } = useModals();
  const view = useTxView()(tx);
  const color = view.out ? "var(--c-expense)" : "var(--c-income)";
  return (
    <div
      onClick={onClick ?? (() => openDetail(tx))}
      className="flex cursor-pointer items-center"
      style={{ gap: 18, padding: "15px 0" }}
    >
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, flex: "none" }} />
      <div className="flex min-w-0 flex-1 flex-col" style={{ gap: 3 }}>
        <span className="truncate" style={{ fontSize: 15 }}>
          {view.title}
        </span>
        <span className="truncate" style={{ fontSize: 12, color: muted }}>
          {view.sub}
        </span>
      </div>
      <div className="flex flex-none flex-col items-end" style={{ gap: 3 }}>
        <span style={{ fontFamily: MONO, fontSize: 14, color }}>{view.amount}</span>
        <span style={{ fontFamily: MONO, fontSize: 10.5, color: "rgb(var(--fg-rgb) / .3)" }}>{view.date}</span>
      </div>
    </div>
  );
}

function useDarkSplitPicker() {
  return useSplitPicker((tx, pick) => <DarkTxRow tx={tx} onClick={pick} />);
}

/* ------------------------------------------------------------------ *
 * Home
 * ------------------------------------------------------------------ */

export function DarkHome() {
  const { t, fa, money, short, digits, percent } = useI18n();
  const wide = useIsDesktop();
  const gutter = useGutter();
  const navigate = useNavigate();
  const { openAdd } = useModals();
  const { dashboard, breakdown, isLoading } = useHomeData();
  const { data: categories } = useCategories();
  const { data: pending } = useSmsPending();
  const { data: recent } = useTransactions({ limit: wide ? 8 : 5 });
  const { openPicker, picker } = useDarkSplitPicker();

  if (isLoading || !dashboard) return <EmptyNote>{t.loading}</EmptyNote>;

  const pendingCount = pending?.length ?? 0;
  const actions: { key: string; text: string; icon: ReactNode; onClick: () => void; badge?: number }[] = [
    { key: "add", text: t.addShort, icon: <Icon d={P.plus} color="var(--c-accent)" />, onClick: openAdd },
    { key: "split", text: t.splitShort, icon: <Icon d={P.split} />, onClick: openPicker },
    { key: "sms", text: t.smsShort, icon: <Icon d={P.sms} />, onClick: () => navigate("/inbox"), badge: pendingCount },
    { key: "reports", text: t.reports, icon: <Icon d={P.chart} />, onClick: () => navigate("/reports") },
  ];

  const bars = dashboard.daily_spend;
  const maxBar = Math.max(1, ...bars.map((b) => b.amount_cents));

  const balance = (
    <div style={{ paddingTop: wide ? 24 : 40 }}>
      <div style={label}>{t.balanceToman}</div>
      <div style={{ marginTop: 12 }}>
        <BigNumber size={wide ? 72 : 56}>{money(dashboard.net_cents)}</BigNumber>
      </div>
      <div className="flex" style={{ gap: 28, marginTop: 20, fontFamily: MONO, fontSize: 13 }}>
        <span style={{ color: "var(--c-income)" }}>
          +{short(dashboard.total_in_cents)} <span style={{ color: muted }}>{t.in}</span>
        </span>
        <span style={{ color: "var(--c-expense)" }}>
          −{short(dashboard.total_out_cents)} <span style={{ color: muted }}>{t.out}</span>
        </span>
      </div>
    </div>
  );

  const actionRow = (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", marginTop: 44, maxWidth: wide ? 420 : undefined }}>
      {actions.map((a) => (
        <Button
          key={a.key}
          variant="plain"
          size="plain"
          onClick={a.onClick}
          className="flex flex-col items-start"
          style={{ gap: 10, fontSize: 12, color: "rgb(var(--fg-rgb) / .67)" }}
        >
          {a.icon}
          <span>
            {a.text}
            {a.badge ? <span style={{ color: "var(--c-accent)", fontFamily: MONO }}> {digits(a.badge)}</span> : null}
          </span>
        </Button>
      ))}
    </div>
  );

  const list = (
    <Section title={t.today} right={<SeeAll to="/activity" />} top={wide ? 24 : 40}>
      {pendingCount > 0 && (
        <Link to="/inbox" className="flex items-center" style={{ gap: 18, padding: "15px 0" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--c-accent)", flex: "none" }} />
          <span className="flex-1" style={{ fontSize: 15 }}>
            {digits(pendingCount)} {t.newSms}
          </span>
          <Icon size={16} d={P.chev} color="rgb(var(--fg-rgb) / .3)" flip />
        </Link>
      )}
      {(recent ?? []).map((tx) => (
        <DarkTxRow key={tx.id} tx={tx} />
      ))}
      {recent?.length === 0 && <EmptyNote pad={24}>{t.nothingYet}</EmptyNote>}
    </Section>
  );

  const spend = (
    <Section title={t.dailySpend}>
      <SpendLineChart bars={bars.map((b) => ({ ...b, label: dayTick(b.label) }))} max={maxBar} />
    </Section>
  );

  const cats = (
    <Section title={t.breakdown}>
      {breakdown.map((c) => (
        <div key={c.category_id ?? "none"} className="flex items-center" style={{ gap: 18, padding: "12px 0" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.color, flex: "none" }} />
          <span className="flex-1 truncate" style={{ fontSize: 14 }}>
            {sliceLabel(c, categories, fa, t.uncategorized)}
          </span>
          <span style={{ fontFamily: MONO, fontSize: 12, color: muted }}>{percent(c.percentage)}</span>
          <span style={{ fontFamily: MONO, fontSize: 13, minWidth: 64, textAlign: "end" }}>{short(c.amount_cents)}</span>
        </div>
      ))}
    </Section>
  );

  return (
    <div className="fade-in" style={{ padding: `0 ${gutter}px` }}>
      {wide ? (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.1fr) minmax(0,1fr)", gap: 72 }}>
          <div>
            {balance}
            {actionRow}
            {spend}
            {cats}
          </div>
          <div>{list}</div>
        </div>
      ) : (
        <>
          {balance}
          {actionRow}
          {list}
        </>
      )}
      {picker}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Activity
 * ------------------------------------------------------------------ */

/** Mono text tabs with an accent underline — the design's take on chips. */
function TextTabs<K extends string | number>({
  items,
  value,
  onChange,
  scroll = false,
}: {
  items: { key: K; label: string }[];
  value: K;
  onChange: (k: K) => void;
  scroll?: boolean;
}) {
  return (
    <div className={scroll ? "flex overflow-x-auto no-scrollbar" : "flex flex-wrap"} style={{ gap: 22 }}>
      {items.map((it) => {
        const active = it.key === value;
        return (
          <Button
            key={String(it.key)}
            variant="plain"
            size="plain"
            onClick={() => onChange(it.key)}
            className="flex-none"
            style={{
              ...label,
              padding: "6px 0",
              whiteSpace: "nowrap",
              color: active ? "var(--c-fg)" : "rgb(var(--fg-rgb) / .4)",
              borderBottom: `1.5px solid ${active ? "var(--c-accent)" : "transparent"}`,
            }}
          >
            {it.label}
          </Button>
        );
      })}
    </div>
  );
}

const iconButton: CSSProperties = { color: "var(--c-fg)", display: "flex" };

export function DarkActivity() {
  const { t, digits } = useI18n();
  const gutter = useGutter();
  const { openAdd } = useModals();
  const f = useFilters();
  const [showFilters, setShowFilters] = useState(false);
  const { typeChips, catChips } = useChipData();
  const rows = f.query.data ?? [];

  return (
    <div className="fade-in" style={{ padding: `0 ${gutter}px` }}>
      <ScreenTitle
        title={t.activity}
        right={
          <Button variant="plain" size="plain" onClick={openAdd} aria-label={t.add} style={iconButton}>
            <Icon size={22} d={P.plus} />
          </Button>
        }
      />

      <div className="flex items-center" style={{ gap: 12, marginTop: 36, borderBottom: "1px solid rgb(var(--ink-rgb) / .14)" }}>
        <Icon size={18} d={P.search} color={muted} />
        <input
          value={f.search}
          onChange={(e) => f.setSearch(e.target.value)}
          placeholder={t.search}
          className="min-w-0 flex-1 bg-transparent outline-none"
          style={{ padding: "12px 0", fontSize: 15, color: "var(--c-fg)" }}
        />
      </div>

      <div className="flex items-center justify-between" style={{ marginTop: 22, gap: 16 }}>
        <TextTabs items={typeChips} value={f.direction} onChange={f.setDirection} />
        <Button
          variant="plain"
          size="plain"
          onClick={() => setShowFilters(!showFilters)}
          style={{ ...label, color: showFilters || f.rangeActive ? "var(--c-accent)" : "rgb(var(--fg-rgb) / .4)" }}
        >
          {t.filters}
        </Button>
      </div>
      <div style={{ marginTop: 10 }}>
        <TextTabs items={catChips} value={f.categoryId} onChange={f.setCategoryId} scroll />
      </div>
      {(showFilters || f.rangeActive) && <RangeFilters f={f} />}

      <Section title={`${digits(rows.length)} ${t.of} ${t.activity}`} top={32}>
        {f.query.isLoading && <EmptyNote>{t.loading}</EmptyNote>}
        {!f.query.isLoading && rows.length === 0 && <EmptyNote>{t.empty}</EmptyNote>}
        {rows.map((tx) => (
          <DarkTxRow key={tx.id} tx={tx} />
        ))}
      </Section>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * People (drawn in the design) and one person
 * ------------------------------------------------------------------ */

function netColor(net: number) {
  return net > 0 ? "var(--c-income)" : net < 0 ? "var(--c-expense)" : "rgb(var(--fg-rgb) / .4)";
}

export function DarkPeople() {
  const { t, group, money } = useI18n();
  const wide = useIsDesktop();
  const gutter = useGutter();
  const navigate = useNavigate();
  const { data: balances, isLoading } = usePeopleBalances();
  const { openPicker, picker } = useDarkSplitPicker();

  const owed = (balances ?? []).filter((b) => b.net_cents > 0).reduce((a, b) => a + b.net_cents, 0);
  const owe = (balances ?? []).filter((b) => b.net_cents < 0).reduce((a, b) => a - b.net_cents, 0);
  const sub = (net: number) => (net > 0 ? t.owes : net < 0 ? t.youOwe : t.settled);

  return (
    <div className="fade-in flex flex-col" style={{ padding: `0 ${gutter}px`, minHeight: "100%", maxWidth: wide ? 720 : undefined }}>
      <ScreenTitle
        title={t.people}
        right={
          <Link to="/settings" aria-label={t.settings} style={iconButton}>
            <Icon size={22} d={P.plus} />
          </Link>
        }
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, paddingTop: 56 }}>
        <div className="flex flex-col" style={{ gap: 10 }}>
          <span style={label}>{t.owedToMe}</span>
          <BigNumber size={32}>{group(owed)}</BigNumber>
        </div>
        <div className="flex flex-col" style={{ gap: 10 }}>
          <span style={label}>{t.iOwe}</span>
          <BigNumber size={32} color="var(--c-expense)">
            {group(owe)}
          </BigNumber>
        </div>
      </div>

      <Section title={t.ledger} top={52}>
        {isLoading && <EmptyNote pad={24}>{t.loading}</EmptyNote>}
        {(balances ?? []).map((p) => (
          <div
            key={p.person_id}
            onClick={() => navigate(`/people/${p.person_id}`)}
            className="flex cursor-pointer items-center"
            style={{ gap: 18, padding: "17px 0" }}
          >
            <span style={{ width: 28, fontFamily: MONO, fontSize: 13, color: muted, flex: "none" }}>{initials(p.name)}</span>
            <div className="flex min-w-0 flex-1 flex-col" style={{ gap: 3 }}>
              <span className="truncate" style={{ fontSize: 15 }}>
                {p.name}
              </span>
              <span style={{ fontSize: 12, color: muted }}>{sub(p.net_cents)}</span>
            </div>
            <span style={{ fontFamily: MONO, fontSize: 14, color: netColor(p.net_cents) }}>
              {p.net_cents === 0 ? "0" : money(p.net_cents, true)}
            </span>
            <Icon size={16} d={P.chev} color="rgb(var(--fg-rgb) / .27)" flip />
          </div>
        ))}
      </Section>

      <div className="flex-1" style={{ minHeight: 32 }} />
      <div style={{ paddingBottom: 12 }}>
        <PillButton onClick={openPicker}>{t.splitBill}</PillButton>
      </div>
      {picker}
    </div>
  );
}

export function DarkPerson({ person, openDebts, shared, settleAll }: PersonView) {
  const { t, money } = useI18n();
  const wide = useIsDesktop();
  const gutter = useGutter();
  const navigate = useNavigate();

  if (!person) return <EmptyNote>{t.loading}</EmptyNote>;
  const sub = person.net_cents > 0 ? t.owes : person.net_cents < 0 ? t.youOwe : t.settled;

  return (
    <div className="fade-in" style={{ padding: `0 ${gutter}px`, maxWidth: wide ? 720 : undefined }}>
      <ScreenTitle
        title={person.name}
        left={
          <Button variant="plain" size="plain" onClick={() => navigate("/people")} aria-label={t.people} style={iconButton}>
            <Icon size={22} d={P.back} flip />
          </Button>
        }
      />

      <div style={{ paddingTop: 44 }}>
        <div style={label}>{sub}</div>
        <div style={{ marginTop: 12 }}>
          <BigNumber color={netColor(person.net_cents)}>
            {person.net_cents === 0 ? t.settled : money(person.net_cents, true)}
          </BigNumber>
        </div>
      </div>

      {person.open_debt_count > 0 && (
        <div style={{ marginTop: 32 }}>
          <PillButton
            onClick={() => settleAll.mutate(person.person_id)}
            disabled={settleAll.isPending}
            busy={settleAll.isPending}
          >
            {t.settleUp}
          </PillButton>
        </div>
      )}

      <Section title={t.debts}>
        <div className="flex flex-col" style={{ gap: 8 }}>
          {openDebts.map((debt) => (
            <DebtRow key={debt.id} debt={debt} />
          ))}
          {openDebts.length === 0 && <EmptyNote pad={20}>{t.settled}</EmptyNote>}
        </div>
      </Section>

      <Section title={t.ledger}>
        {(shared ?? []).map((tx) => (
          <DarkTxRow key={tx.id} tx={tx} />
        ))}
        {shared?.length === 0 && <EmptyNote pad={20}>{t.empty}</EmptyNote>}
      </Section>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Reports — not drawn in the design; built from its parts
 * ------------------------------------------------------------------ */

function Line({ left, right, color }: { left: ReactNode; right: ReactNode; color?: string }) {
  return (
    <div className="flex items-center" style={{ gap: 18, padding: "12px 0" }}>
      {color && <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, flex: "none" }} />}
      <span className="min-w-0 flex-1 truncate" style={{ fontSize: 14 }}>
        {left}
      </span>
      <span style={{ fontFamily: MONO, fontSize: 13 }}>{right}</span>
    </div>
  );
}

function ThinMeter({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ height: 2, background: "var(--c-bar-idle)", marginTop: 2 }}>
      <div style={{ height: "100%", width: `${Math.min(100, Math.max(0, pct))}%`, background: color }} />
    </div>
  );
}

export function DarkReports({
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
  const { t, fa, group, short, percent, digits } = useI18n();
  const wide = useIsDesktop();
  const gutter = useGutter();
  const chips = useBucketChips();
  const { data: categories } = useCategories();
  const { data: budgets } = useBudgets();
  const ie = data.incomeExpense;
  const ratio = ie && ie.income_cents > 0 ? (ie.expense_cents / ie.income_cents) * 100 : 0;

  const sections = (
    <>
      <Section title={t.breakdown}>
        {data.slices.map((c) => (
          <Line
            key={c.category_id ?? "none"}
            color={c.color}
            left={sliceLabel(c, categories, fa, t.uncategorized)}
            right={
              <>
                <span style={{ color: muted }}>{percent(c.percentage)}</span>&nbsp;&nbsp;{short(c.amount_cents)}
              </>
            }
          />
        ))}
        {data.slices.length === 0 && <EmptyNote pad={20}>{t.empty}</EmptyNote>}
      </Section>

      {ie && (
        <Section title={t.incomeVsExpense}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 8 }}>
            <div className="flex flex-col" style={{ gap: 8 }}>
              <span style={{ fontSize: 12, color: muted }}>{t.income}</span>
              <BigNumber size={30} color="var(--c-income)">
                {group(ie.income_cents)}
              </BigNumber>
            </div>
            <div className="flex flex-col" style={{ gap: 8 }}>
              <span style={{ fontSize: 12, color: muted }}>{t.expense}</span>
              <BigNumber size={30} color="var(--c-expense)">
                {group(ie.expense_cents)}
              </BigNumber>
            </div>
          </div>
          <div className="flex justify-between" style={{ fontFamily: MONO, fontSize: 12, color: muted, marginTop: 18 }}>
            <span>
              {t.expense} / {t.income}
            </span>
            <span>{percent(ratio)}</span>
          </div>
          <ThinMeter pct={ratio} color={ratio > 100 ? "var(--c-expense)" : "var(--c-accent)"} />
        </Section>
      )}

      {(budgets ?? []).length > 0 && (
        <Section title={t.budgets}>
          {(budgets ?? []).map((b) => {
            const category = categories?.find((c) => c.id === b.category_id);
            const used = data.slices.find((s) => s.category_id === b.category_id)?.amount_cents ?? 0;
            const pct = b.limit_cents > 0 ? (used / b.limit_cents) * 100 : 0;
            return (
              <div key={b.id} style={{ padding: "10px 0" }}>
                <Line left={categoryName(category, fa, "—")} right={`${short(used)} / ${short(b.limit_cents)}`} />
                <ThinMeter pct={pct} color={pct > 100 ? "var(--c-expense)" : "var(--c-fg)"} />
              </div>
            );
          })}
        </Section>
      )}

      {data.momo.length > 0 && (
        <Section title={t.vsLastMonth}>
          {data.momo.map((m) => (
            <Line
              key={m.category_id ?? "none"}
              left={sliceLabel(m, categories, fa, t.uncategorized)}
              right={
                <>
                  <span style={{ color: muted }}>{short(m.current_cents)}</span>&nbsp;&nbsp;
                  <span
                    style={{
                      color:
                        m.delta_percentage === null ? muted : m.delta_percentage > 0 ? "var(--c-expense)" : "var(--c-income)",
                    }}
                  >
                    {m.delta_percentage === null
                      ? "—"
                      : `${m.delta_percentage > 0 ? "+" : "−"}${digits(Math.abs(m.delta_percentage))}${fa ? "٪" : "%"}`}
                  </span>
                </>
              }
            />
          ))}
        </Section>
      )}

      {data.byAccount.length > 0 && (
        <Section title={t.byAccount}>
          {data.byAccount.map((a) => (
            <Line
              key={a.account_id}
              left={a.label}
              right={
                <>
                  <span style={{ color: "var(--c-income)" }}>+{short(a.total_in_cents)}</span>&nbsp;&nbsp;
                  <span style={{ color: "var(--c-expense)" }}>−{short(a.total_out_cents)}</span>
                </>
              }
            />
          ))}
        </Section>
      )}
    </>
  );

  return (
    <div className="fade-in" style={{ padding: `0 ${gutter}px` }}>
      {!wide && <ScreenTitle title={t.statistics} />}

      <div style={{ paddingTop: wide ? 24 : 44 }}>
        <div className="flex items-baseline justify-between">
          <span style={label}>
            {t.spent} · {chips.find((c) => c.key === bucket)?.label}
          </span>
          <a
            href={`${import.meta.env.VITE_API_BASE_URL ?? ""}/api/transactions/export.csv`}
            style={{ ...label, color: "var(--c-accent)" }}
          >
            {t.exportCsv}
          </a>
        </div>
        <div style={{ marginTop: 12 }}>
          <BigNumber size={wide ? 72 : 56}>{group(data.total)}</BigNumber>
        </div>
        <div style={{ fontFamily: MONO, fontSize: 13, color: muted, marginTop: 16 }}>{t.avgPrefix + short(data.avg)}</div>
      </div>

      <div className="flex items-center justify-between" style={{ marginTop: 32, gap: 16 }}>
        <TextTabs items={chips} value={bucket} onChange={setBucket} />
        <Button
          variant="plain"
          size="plain"
          onClick={() => setGross(!gross)}
          aria-pressed={gross}
          style={{ ...label, color: gross ? "var(--c-accent)" : "rgb(var(--fg-rgb) / .4)" }}
        >
          {t.gross}
        </Button>
      </div>

      <SpendLineChart bars={data.bars} max={data.max} />

      {wide ? <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 72 }}>{sections}</div> : sections}
    </div>
  );
}
