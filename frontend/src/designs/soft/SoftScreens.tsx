import { useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { EmptyNote } from "@/components/primitives";
import { useIsDesktop } from "@/hooks/use-media-query";
import DebtRow from "../../components/DebtRow";
import { RangeFilters, useChipData, useFilters } from "../../components/ActivityFilters";
import { BudgetsCard, ByAccountCard, IncomeExpenseCard, MonthOverMonthCard } from "../../components/ReportCards";
import { useAuth } from "../../lib/auth";
import { useI18n } from "../../lib/i18n";
import { useModals } from "../../lib/modals";
import { useCategories, usePeopleBalances, useSmsPending, useTransactions } from "../../lib/queries";
import { initials, sliceLabel } from "../../lib/domain";
import { useBucketChips, type Bucket, type ReportData } from "../../lib/reportData";
import type { Transaction } from "../../types";
import {
  Icon,
  P,
  useAccountCards,
  useGreeting,
  useHomeData,
  useSplitPicker,
  useTxView,
  type PersonView,
} from "../shared";
import { RoundBtn, softMuted, softShadow, whiteCard } from "./SoftShell";
import { TotalBar } from "../buttons";
import { SoftTitle as Header } from "../Page";
import SpendLineChart from "../../components/SpendLineChart";

/* ------------------------------------------------------------------ *
 * Wallet Soft.dc.html screens. Home and Statistics follow the design
 * closely; Activity, People and a person reuse its pieces (round
 * buttons, white rows, segmented control, the total bar).
 * ------------------------------------------------------------------ */

const tint = (color: string) => `color-mix(in srgb, ${color} 14%, var(--c-surface))`;

function Avatar({ text, color, size = 46 }: { text: string; color: string; size?: number }) {
  return (
    <div
      className="flex flex-none items-center justify-center"
      style={{ width: size, height: size, borderRadius: "50%", background: tint(color), color, fontSize: size > 44 ? 15 : 14, fontWeight: 600 }}
    >
      {text}
    </div>
  );
}

export function SoftTxRow({ tx, onClick }: { tx: Transaction; onClick?: () => void }) {
  const { openDetail } = useModals();
  const view = useTxView()(tx);
  return (
    <div
      onClick={onClick ?? (() => openDetail(tx))}
      className="flex cursor-pointer items-center"
      style={{ gap: 14, padding: 14, ...whiteCard }}
    >
      <Avatar text={Array.from(view.title)[0] ?? "·"} color={view.color} />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate" style={{ fontSize: 15, fontWeight: 600 }}>
          {view.title}
        </span>
        <span className="truncate" style={{ fontSize: 12, color: softMuted }}>
          {view.date} · {view.category}
        </span>
      </div>
      <span style={{ fontSize: 14, fontWeight: 600, color: view.out ? "var(--c-fg)" : "var(--c-income)" }}>{view.amount}</span>
    </div>
  );
}

function useSoftSplitPicker() {
  return useSplitPicker((tx, pick) => <SoftTxRow tx={tx} onClick={pick} />);
}

function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between" style={{ padding: "22px 4px 12px" }}>
      <span style={{ fontSize: 17, fontWeight: 600 }}>{children}</span>
      {right}
    </div>
  );
}

function SeeAll({ to }: { to: string }) {
  const { t } = useI18n();
  return (
    <Link to={to} style={{ fontSize: 12.5, color: softMuted }}>
      {t.seeAll}
    </Link>
  );
}

/** The design's Income / Expense chips: tinted icon circle + value + label. */
function StatChip({ label, value, color, d }: { label: string; value: string; color: string; d: string }) {
  return (
    <div className="flex items-center" style={{ gap: 12, padding: 12, ...whiteCard }}>
      <div className="flex flex-none items-center justify-center" style={{ width: 40, height: 40, borderRadius: "50%", background: tint(color) }}>
        <Icon d={d} size={18} color={color} w={2} />
      </div>
      <div className="flex min-w-0 flex-col">
        <span className="truncate" style={{ fontSize: 14, fontWeight: 600, color }}>
          {value}
        </span>
        <span style={{ fontSize: 12, color: softMuted }}>{label}</span>
      </div>
    </div>
  );
}

/** Week / Month / Year pill control; the active segment takes the accent. */
function Segmented<K extends string>({ items, value, onChange }: { items: { key: K; label: string }[]; value: K; onChange: (k: K) => void }) {
  return (
    <div
      style={{
        padding: 5,
        borderRadius: 26,
        background: "var(--c-surface)",
        display: "grid",
        gridTemplateColumns: `repeat(${items.length},1fr)`,
        fontSize: 13,
        textAlign: "center",
      }}
    >
      {items.map((it) => (
        <Button
          key={it.key}
          variant="plain"
          size="plain"
          onClick={() => onChange(it.key)}
          style={{
            padding: "10px 0",
            borderRadius: 21,
            background: value === it.key ? "var(--c-primary)" : "transparent",
            color: value === it.key ? "var(--c-on-primary)" : softMuted,
            fontWeight: value === it.key ? 500 : 400,
          }}
        >
          {it.label}
        </Button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Home — the swipeable bank-card stack
 * ------------------------------------------------------------------ */

function CardStack() {
  const { t, money, digits } = useI18n();
  const cards = useAccountCards();
  const n = cards.length;
  const [card, setCard] = useState(0);
  const [dx, setDx] = useState(0);
  const [drag, setDrag] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [reset, setReset] = useState(-1);
  const x0 = useRef(0);
  const current = card % Math.max(1, n);

  const advance = (dir: number) => {
    if (leaving || n < 2) {
      setDrag(false);
      setDx(0);
      return;
    }
    setLeaving(true);
    setDrag(false);
    setDx(dir * 420);
    setTimeout(() => {
      setCard((prev) => {
        setReset(prev % n);
        return (prev + 1) % n;
      });
      setDx(0);
      setLeaving(false);
      requestAnimationFrame(() => requestAnimationFrame(() => setReset(-1)));
    }, 320);
  };
  const goTo = (i: number) => {
    if (i === current || leaving) return;
    const steps = (i - current + n) % n;
    for (let s = 0; s < steps; s++) setTimeout(() => advance(-1), s * 380);
  };
  const ease = "transform .35s cubic-bezier(.2,.8,.2,1), opacity .35s ease";
  const fills = ["var(--soft-card-1)", "var(--soft-card-2)", "var(--soft-card-3)"];

  return (
    <>
      <div
        onPointerDown={(e) => {
          if (leaving) return;
          x0.current = e.clientX;
          e.currentTarget.setPointerCapture(e.pointerId);
          setDrag(true);
        }}
        onPointerMove={(e) => {
          if (drag) setDx(e.clientX - x0.current);
        }}
        onPointerUp={() => {
          if (!drag) return;
          if (Math.abs(dx) > 70) advance(dx > 0 ? 1 : -1);
          else {
            setDrag(false);
            setDx(0);
          }
        }}
        onPointerCancel={() => {
          setDrag(false);
          setDx(0);
        }}
        style={{ position: "relative", height: 212, marginTop: 22, touchAction: "pan-y", userSelect: "none", cursor: n > 1 ? "grab" : "default" }}
      >
        {cards.map((c, i) => {
          const rel = (i - current + n) % n;
          const top = rel === 0;
          const transform = top ? `translateX(${dx}px) rotate(${dx / 22}deg)` : `translateY(${rel * 14}px) scale(${1 - rel * 0.06})`;
          const opacity = top ? Math.max(0, 1 - Math.abs(dx) / 380) : rel === 1 ? 0.75 : rel === 2 ? 0.45 : 0;
          return (
            <div
              key={c.key}
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: 0,
                height: 182,
                borderRadius: 30,
                background: fills[i % 3],
                color: "#fff",
                overflow: "hidden",
                boxShadow: "0 10px 22px rgba(0,0,0,.16)",
                transformOrigin: "50% 100%",
                transform,
                opacity,
                zIndex: n - rel,
                transition: i === reset || (top && drag) ? "none" : ease,
              }}
            >
              <div style={{ position: "absolute", width: 190, height: 190, insetInlineEnd: -60, top: -70, borderRadius: "50%", border: "34px solid rgba(255,255,255,.07)" }} />
              <div style={{ position: "absolute", width: 120, height: 120, insetInlineStart: -40, bottom: -60, borderRadius: "50%", background: "rgba(255,255,255,.05)" }} />
              <div className="flex flex-col" style={{ position: "relative", padding: "22px 24px", height: "100%", boxSizing: "border-box" }}>
                <div className="flex items-center justify-between">
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{c.label}</span>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,.6)" }}>{t.currency}</span>
                </div>
                <span style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-.01em", marginTop: 12 }}>{money(c.balance)}</span>
                <div style={{ height: 5, borderRadius: 3, background: "rgba(255,255,255,.15)", marginTop: 14, overflow: "hidden" }}>
                  <div style={{ width: `${Math.round(c.spentShare * 100)}%`, height: "100%", borderRadius: 3, background: "var(--soft-bar)" }} />
                </div>
                <span dir="ltr" style={{ marginTop: "auto", fontSize: 13, letterSpacing: ".2em", color: "rgba(255,255,255,.75)", textAlign: "start" }}>
                  {c.last4 ? `•••• ${digits(c.last4)}` : "•••• ••••"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      {n > 1 && (
        <div className="flex justify-center" style={{ gap: 6, marginTop: 6 }}>
          {cards.map((c, i) => (
            <div
              key={c.key}
              onClick={() => goTo(i)}
              style={{ height: 6, width: i === current ? 20 : 6, borderRadius: 3, background: i === current ? "var(--c-primary)" : "rgb(var(--ink-rgb) / .18)", cursor: "pointer", transition: "width .25s" }}
            />
          ))}
        </div>
      )}
    </>
  );
}

export function SoftHome() {
  const { t, short, digits } = useI18n();
  const wide = useIsDesktop();
  const greeting = useGreeting();
  const { user } = useAuth();
  const { dashboard } = useHomeData();
  const { data: pending } = useSmsPending();
  const { data: recent } = useTransactions({ limit: wide ? 7 : 4 });
  const pendingCount = pending?.length ?? 0;

  const head = (
    <div className="flex items-center justify-between" style={{ paddingTop: 12 }}>
      <div className="flex flex-col" style={{ gap: 2 }}>
        <span style={{ fontSize: 12, color: softMuted }}>{greeting}</span>
        <span style={{ fontSize: 20, fontWeight: 600 }}>{user?.username}</span>
      </div>
      {!wide && (
        <RoundBtn to="/inbox" label={t.inbox} badge={pendingCount}>
          <Icon d={P.bell} size={20} w={1.8} />
        </RoundBtn>
      )}
    </div>
  );

  const chips = dashboard && (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
      <StatChip label={t.income} value={`+${short(dashboard.total_in_cents)}`} color="var(--c-income)" d={P.up} />
      <StatChip label={t.expense} value={`−${short(dashboard.total_out_cents)}`} color="#e8892a" d={P.down} />
    </div>
  );

  const list = (
    <>
      <SectionTitle right={<SeeAll to="/activity" />}>{t.transactions}</SectionTitle>
      <div className="flex flex-col" style={{ gap: 12 }}>
        {pendingCount > 0 && (
          <Link to="/inbox" className="flex items-center" style={{ gap: 14, padding: 14, ...whiteCard, color: "var(--c-fg)" }}>
            <div className="flex flex-none items-center justify-center" style={{ width: 46, height: 46, borderRadius: "50%", background: "var(--c-primary)" }}>
              <Icon d={P.sms} size={20} color="var(--c-on-primary)" w={1.8} />
            </div>
            <span className="flex-1" style={{ fontSize: 15, fontWeight: 600 }}>
              {digits(pendingCount)} {t.newSms}
            </span>
            <Icon d={P.chev} size={18} color={softMuted} flip />
          </Link>
        )}
        {(recent ?? []).map((tx) => (
          <SoftTxRow key={tx.id} tx={tx} />
        ))}
        {recent?.length === 0 && <EmptyNote pad={24}>{t.nothingYet}</EmptyNote>}
      </div>
    </>
  );

  if (wide) {
    return (
      <div className="fade-in" style={{ display: "grid", gridTemplateColumns: "minmax(0,420px) minmax(0,1fr)", gap: 40 }}>
        <div>
          {head}
          <CardStack />
          {chips}
        </div>
        <div>{list}</div>
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ padding: "0 20px" }}>
      {head}
      <CardStack />
      {chips}
      {list}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Statistics (the reports screen)
 * ------------------------------------------------------------------ */

export function SoftReports({ bucket, setBucket, data }: { bucket: Bucket; setBucket: (b: Bucket) => void; data: ReportData }) {
  const { t, fa, group, short, percent } = useI18n();
  const wide = useIsDesktop();
  const navigate = useNavigate();
  const chips = useBucketChips();
  const { data: categories } = useCategories();
  const top = data.slices.slice(0, 3);

  const shareStyle: CSSProperties = {
    width: 46,
    height: 46,
    borderRadius: "50%",
    background: "var(--c-surface)",
    boxShadow: "0 6px 18px rgba(0,0,0,.06)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--c-fg)",
  };

  const chart = (
    <>
      <Header
        left={
          !wide && (
            <RoundBtn onClick={() => navigate("/")} label={t.backToDash}>
              <Icon d={P.back} size={20} w={2} flip />
            </RoundBtn>
          )
        }
        title={t.statistics}
        right={
          <a href={`${import.meta.env.VITE_API_BASE_URL ?? ""}/api/transactions/export.csv`} aria-label={t.exportCsv} title={t.exportCsv} style={shareStyle}>
            <Icon d={P.share} size={20} w={1.8} />
          </a>
        }
      />
      <div className="flex flex-col items-center" style={{ paddingTop: 26 }}>
        <span style={{ fontSize: 30, fontWeight: 600 }}>{group(data.total)}</span>
        <span style={{ fontSize: 12, color: softMuted }}>
          {t.spent} · {chips.find((c) => c.key === bucket)?.label}
        </span>
      </div>
      <div style={{ marginTop: 22 }}>
        <Segmented items={chips} value={bucket} onChange={setBucket} />
      </div>
      <SpendLineChart bars={data.bars} max={data.max} />
    </>
  );

  const topList = (
    <>
      <SectionTitle>{t.topSpending}</SectionTitle>
      <div className="flex flex-col" style={{ gap: 12 }}>
        {top.map((c) => {
          const name = sliceLabel(c, categories, fa, t.uncategorized);
          return (
            <div key={c.category_id ?? "none"} className="flex items-center" style={{ gap: 14, padding: 14, ...whiteCard }}>
              <Avatar text={Array.from(name)[0] ?? "·"} color={c.color} />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate" style={{ fontSize: 15, fontWeight: 600 }}>
                  {name}
                </span>
                <span style={{ fontSize: 12, color: softMuted }}>{percent(c.percentage)}</span>
              </div>
              <span style={{ fontSize: 14, fontWeight: 600 }}>−{short(c.amount_cents)}</span>
            </div>
          );
        })}
        {top.length === 0 && <EmptyNote pad={24}>{t.empty}</EmptyNote>}
      </div>
    </>
  );

  const cards = (
    <div style={{ display: "grid", gridTemplateColumns: wide ? "repeat(auto-fit,minmax(280px,1fr))" : "1fr", gap: 14, marginTop: 22 }}>
      <IncomeExpenseCard data={data.incomeExpense} />
      <BudgetsCard slices={data.slices} />
      <MonthOverMonthCard rows={data.momo} />
      <ByAccountCard rows={data.byAccount} />
    </div>
  );

  if (wide) {
    return (
      <div className="fade-in">
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.4fr) minmax(0,1fr)", gap: 40 }}>
          <div>{chart}</div>
          <div>{topList}</div>
        </div>
        {cards}
      </div>
    );
  }
  return (
    <div className="fade-in" style={{ padding: "0 20px" }}>
      {chart}
      {topList}
      {cards}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Activity
 * ------------------------------------------------------------------ */

export function SoftActivity() {
  const { t, digits } = useI18n();
  const wide = useIsDesktop();
  const { openAdd } = useModals();
  const f = useFilters();
  const [showFilters, setShowFilters] = useState(false);
  const { typeChips, catChips } = useChipData();
  const rows = f.query.data ?? [];
  const typeItems = typeChips.map((c) => ({ key: c.key as string, label: c.label }));

  return (
    <div className="fade-in" style={{ padding: wide ? 0 : "0 20px", maxWidth: wide ? 820 : undefined, width: "100%", marginInline: "auto" }}>
      <Header
        title={t.activity}
        right={
          <RoundBtn onClick={openAdd} label={t.add}>
            <Icon d={P.plus} size={20} w={2} />
          </RoundBtn>
        }
      />

      <div className="flex items-center" style={{ gap: 10, marginTop: 22, padding: "0 18px", height: 50, borderRadius: 25, background: "var(--c-surface)", boxShadow: softShadow }}>
        <Icon d={P.search} size={18} color={softMuted} w={1.8} />
        <input
          value={f.search}
          onChange={(e) => f.setSearch(e.target.value)}
          placeholder={t.search}
          className="min-w-0 flex-1 bg-transparent outline-none"
          style={{ fontSize: 14, color: "var(--c-fg)" }}
        />
        <Button
          variant="plain"
          size="plain"
          onClick={() => setShowFilters(!showFilters)}
          style={{ fontSize: 12.5, fontWeight: 500, color: showFilters || f.rangeActive ? "var(--c-primary)" : softMuted }}
        >
          {t.filters}
        </Button>
      </div>
      {(showFilters || f.rangeActive) && <RangeFilters f={f} />}

      <div style={{ marginTop: 14 }}>
        <Segmented items={typeItems} value={f.direction} onChange={(k) => f.setDirection(k as typeof f.direction)} />
      </div>

      <div className="flex overflow-x-auto no-scrollbar" style={{ gap: 8, marginTop: 12, paddingBottom: 4 }}>
        {catChips.map((c) => {
          const active = f.categoryId === c.key;
          return (
            <Button
              key={String(c.key)}
              variant="plain"
              size="plain"
              onClick={() => f.setCategoryId(c.key)}
              className="flex-none"
              style={{
                padding: "8px 14px",
                borderRadius: 99,
                fontSize: 12.5,
                whiteSpace: "nowrap",
                background: active ? "var(--c-primary)" : "var(--c-surface)",
                color: active ? "var(--c-on-primary)" : softMuted,
                boxShadow: active ? "none" : softShadow,
              }}
            >
              {c.label}
            </Button>
          );
        })}
      </div>

      <SectionTitle right={<span style={{ fontSize: 12.5, color: softMuted }}>{digits(rows.length)}</span>}>{t.transactions}</SectionTitle>
      <div className="flex flex-col" style={{ gap: 12 }}>
        {f.query.isLoading && <EmptyNote>{t.loading}</EmptyNote>}
        {!f.query.isLoading && rows.length === 0 && <EmptyNote>{t.empty}</EmptyNote>}
        {rows.map((tx) => (
          <SoftTxRow key={tx.id} tx={tx} />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * People and one person
 * ------------------------------------------------------------------ */

function netColor(net: number) {
  return net > 0 ? "var(--c-income)" : net < 0 ? "var(--c-expense)" : softMuted;
}

export function SoftPeople() {
  const { t, money, short } = useI18n();
  const wide = useIsDesktop();
  const navigate = useNavigate();
  const { data: balances, isLoading } = usePeopleBalances();
  const { openPicker, picker } = useSoftSplitPicker();

  const owed = (balances ?? []).filter((b) => b.net_cents > 0).reduce((a, b) => a + b.net_cents, 0);
  const owe = (balances ?? []).filter((b) => b.net_cents < 0).reduce((a, b) => a - b.net_cents, 0);
  const sub = (net: number) => (net > 0 ? t.owes : net < 0 ? t.youOwe : t.settled);

  return (
    <div className="fade-in flex flex-col" style={{ padding: wide ? 0 : "0 20px", minHeight: "100%", maxWidth: wide ? 720 : undefined, width: "100%", marginInline: "auto" }}>
      <Header
        title={t.people}
        right={
          <RoundBtn to="/settings" label={t.settings}>
            <Icon d={P.plus} size={20} w={2} />
          </RoundBtn>
        }
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 22 }}>
        <StatChip label={t.owedToMe} value={short(owed)} color="var(--c-income)" d={P.up} />
        <StatChip label={t.iOwe} value={short(owe)} color="#e8892a" d={P.down} />
      </div>

      <SectionTitle>{t.ledger}</SectionTitle>
      <div className="flex flex-col" style={{ gap: 10 }}>
        {isLoading && <EmptyNote pad={24}>{t.loading}</EmptyNote>}
        {(balances ?? []).map((p) => (
          <div
            key={p.person_id}
            onClick={() => navigate(`/people/${p.person_id}`)}
            className="flex cursor-pointer items-center"
            style={{ gap: 14, padding: "14px 16px", ...whiteCard }}
          >
            <Avatar text={initials(p.name)} color={netColor(p.net_cents)} size={44} />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate" style={{ fontSize: 15, fontWeight: 600 }}>
                {p.name}
              </span>
              <span style={{ fontSize: 12, color: softMuted }}>{sub(p.net_cents)}</span>
            </div>
            <span style={{ fontSize: 14, fontWeight: 600, color: netColor(p.net_cents) }}>
              {p.net_cents === 0 ? t.settled : money(p.net_cents, true)}
            </span>
          </div>
        ))}
      </div>

      <div className="flex-1" style={{ minHeight: 24 }} />
      <div style={{ paddingTop: 12 }}>
        <TotalBar label={t.balance} value={money(owed - owe, true)} action={t.splitBill} onAction={openPicker} />
      </div>
      {picker}
    </div>
  );
}

export function SoftPerson({ person, openDebts, shared, settleAll }: PersonView) {
  const { t, money } = useI18n();
  const wide = useIsDesktop();
  const navigate = useNavigate();

  if (!person) return <EmptyNote>{t.loading}</EmptyNote>;
  const sub = person.net_cents > 0 ? t.owes : person.net_cents < 0 ? t.youOwe : t.settled;

  return (
    <div className="fade-in" style={{ padding: wide ? 0 : "0 20px", maxWidth: wide ? 720 : undefined, width: "100%", marginInline: "auto" }}>
      <Header
        left={
          <RoundBtn onClick={() => navigate("/people")} label={t.people}>
            <Icon d={P.back} size={20} w={2} flip />
          </RoundBtn>
        }
        title={t.people}
      />

      <div className="flex flex-col items-center" style={{ paddingTop: 26, gap: 4 }}>
        <Avatar text={initials(person.name)} color={netColor(person.net_cents)} size={64} />
        <span style={{ fontSize: 24, fontWeight: 600, marginTop: 10 }}>{person.name}</span>
        <span style={{ fontSize: 12, color: softMuted }}>{sub}</span>
        <span style={{ fontSize: 30, fontWeight: 600, marginTop: 8, color: netColor(person.net_cents) }}>
          {person.net_cents === 0 ? t.settled : money(person.net_cents, true)}
        </span>
      </div>

      {person.open_debt_count > 0 && (
        <div style={{ marginTop: 20 }}>
          <TotalBar
            label={sub}
            value={money(Math.abs(person.net_cents))}
            action={t.settleUp}
            onAction={() => settleAll.mutate(person.person_id)}
            busy={settleAll.isPending}
          />
        </div>
      )}

      <SectionTitle>{t.debts}</SectionTitle>
      <div className="soft-card flex flex-col" style={{ gap: 10, padding: 10, ...whiteCard }}>
        {openDebts.map((debt) => (
          <DebtRow key={debt.id} debt={debt} />
        ))}
        {openDebts.length === 0 && <EmptyNote pad={20}>{t.settled}</EmptyNote>}
      </div>

      <SectionTitle>{t.ledger}</SectionTitle>
      <div className="flex flex-col" style={{ gap: 12 }}>
        {(shared ?? []).map((tx) => (
          <SoftTxRow key={tx.id} tx={tx} />
        ))}
        {shared?.length === 0 && <EmptyNote pad={20}>{t.empty}</EmptyNote>}
      </div>
    </div>
  );
}
