import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Overlay, OverlayHeader, EmptyNote } from "@/components/primitives";
import { api, withQuery } from "../lib/api";
import { useI18n } from "../lib/i18n";
import { useModals } from "../lib/modals";
import { useAccounts, useByAccount, useCategories, useDashboard, useTransactions } from "../lib/queries";
import { categoryColor, categoryName, txTitle } from "../lib/domain";
import type { CategorySlice, Debt, PersonBalance, Transaction } from "../types";

/* ------------------------------------------------------------------ *
 * Pieces the Wallet Dark and Wallet Soft screens share. Both designs
 * draw line icons on a 24px grid, so one Icon + path table serves both.
 * ------------------------------------------------------------------ */

export const P = {
  plus: "M12 5v14M5 12h14",
  split: "M12 21v-8M12 13L5 5M12 13l7-8M5 5h4M5 5v4M19 5h-4M19 5v4",
  sms: "M4 6h16v10H8l-4 4z",
  chart: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  home: "M3 11l9-7 9 7v9H3z",
  list: "M4 6h16M4 12h16M4 18h16",
  back: "M15 5l-7 7 7 7",
  chev: "M9 5l7 7-7 7",
  arrow: "M5 12h14M13 6l6 6-6 6",
  bell: "M6 16V11a6 6 0 0112 0v5l1.5 2h-15zM10 21h4",
  share: "M12 15V3M7 8l5-5 5 5M5 13v7h14v-7",
  up: "M7 17L17 7M9 7h8v8",
  down: "M17 7L7 17M15 17H7V9",
  wallet: "M3 7h18v12H3zM3 7l2-3h12l2 3M16 13h2",
  search: "M11 4a7 7 0 100 14 7 7 0 000-14zM20 20l-4-4",
} as const;

export function Icon({
  d,
  size = 24,
  color = "currentColor",
  w = 1.6,
  fill = "none",
  flip = false,
  children,
}: {
  d?: string;
  size?: number;
  color?: string;
  w?: number;
  fill?: string;
  /** Mirror direction-bearing icons (back, chevron, arrow) in RTL. */
  flip?: boolean;
  children?: ReactNode;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke={color}
      strokeWidth={w}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={flip ? "rtl:-scale-x-100" : undefined}
      style={{ flex: "none" }}
      aria-hidden
    >
      {d && <path d={d} />}
      {children}
    </svg>
  );
}

export function PeopleIcon({ size = 24, color = "currentColor", w = 1.6 }: { size?: number; color?: string; w?: number }) {
  return (
    <Icon size={size} color={color} w={w}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6M16 4.5a3.5 3.5 0 010 7M18 14c2.2.6 3.5 2.8 3.5 6" />
    </Icon>
  );
}

export function PersonIcon({ size = 24, color = "currentColor", w = 1.6 }: { size?: number; color?: string; w?: number }) {
  return (
    <Icon size={size} color={color} w={w}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
    </Icon>
  );
}

export function GearIcon({ size = 24, color = "currentColor", w = 1.6 }: { size?: number; color?: string; w?: number }) {
  return (
    <Icon size={size} color={color} w={w}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" />
    </Icon>
  );
}

/** This month's dashboard numbers plus its category slices — the home screens' data. */
export function useHomeData() {
  const { data: dashboard, isLoading } = useDashboard("month", false);
  const { data: breakdown } = useQuery({
    queryKey: ["reports", "category-breakdown", "month", false],
    queryFn: () =>
      api.get<CategorySlice[]>(withQuery("/reports/category-breakdown", { period: "month", gross: false })),
  });
  return { dashboard, breakdown: breakdown ?? [], isLoading };
}

/** Title / meta / colours for one transaction row, shared by both designs' lists. */
export function useTxView() {
  const { t, fa, money, localize } = useI18n();
  const { data: categories } = useCategories();
  const { data: accounts } = useAccounts();

  return (tx: Transaction) => {
    const category = categories?.find((c) => c.id === tx.category_id);
    const account = accounts?.find((a) => a.id === tx.account_id);
    const out = tx.direction === "withdrawal";
    const catLabel = categoryName(category, fa, t.uncategorized);
    const accountName = account ? (fa ? account.name_fa : account.name_en) || account.bank_name : "";
    return {
      title: txTitle(tx, t.transaction),
      category: catLabel,
      sub: accountName ? `${catLabel} · ${accountName}` : catLabel,
      date: localize(tx.occurred_at_jalali),
      amount: money(out ? -tx.amount_cents : tx.amount_cents, true),
      out,
      color: categoryColor(category),
    };
  };
}

/** Per-account balance cards (all-time in − out), led by an all-accounts total. */
export function useAccountCards() {
  const { t } = useI18n();
  const { data: rows } = useByAccount("all", false);
  const { data: accounts } = useAccounts();

  const cards = (rows ?? []).map((r) => {
    const account = accounts?.find((a) => a.id === r.account_id);
    const flow = r.total_in_cents + r.total_out_cents;
    return {
      key: String(r.account_id),
      label: r.label,
      balance: r.total_in_cents - r.total_out_cents,
      last4: account?.last4 ?? "",
      spentShare: flow > 0 ? r.total_out_cents / flow : 0,
    };
  });
  const totalIn = (rows ?? []).reduce((a, r) => a + r.total_in_cents, 0);
  const totalOut = (rows ?? []).reduce((a, r) => a + r.total_out_cents, 0);
  const total = {
    key: "all",
    label: t.allAccounts,
    balance: totalIn - totalOut,
    last4: "",
    spentShare: totalIn + totalOut > 0 ? totalOut / (totalIn + totalOut) : 0,
  };
  return cards.length > 1 ? [total, ...cards] : cards.length ? cards : [total];
}

export function useGreeting() {
  const { t } = useI18n();
  const h = new Date().getHours();
  return h < 12 ? t.goodMorning : h < 18 ? t.goodAfternoon : t.goodEvening;
}

/**
 * Both designs offer "Split a bill" without a transaction in hand; splitting
 * in this app always starts from an expense, so this asks which one first.
 */
export function useSplitPicker(render: (tx: Transaction, pick: () => void) => ReactNode) {
  const [open, setOpen] = useState(false);
  const element = open ? <SplitPicker onClose={() => setOpen(false)} render={render} /> : null;
  return { openPicker: () => setOpen(true), picker: element };
}

function SplitPicker({
  onClose,
  render,
}: {
  onClose: () => void;
  render: (tx: Transaction, pick: () => void) => ReactNode;
}) {
  const { t } = useI18n();
  const { openSplit } = useModals();
  const { data, isLoading } = useTransactions({ direction: "withdrawal", limit: 30 });
  const rows = (data ?? []).filter((tx) => !tx.is_shared);

  return (
    <Overlay onClose={onClose} maxWidth={460}>
      <OverlayHeader title={t.splitBill} onClose={onClose} closeLabel={t.close} />
      <div style={{ fontSize: 17, fontWeight: 600, marginTop: 10 }}>{t.pickToSplit}</div>
      <div className="flex flex-col" style={{ gap: 8, marginTop: 14 }}>
        {isLoading && <EmptyNote pad={24}>{t.loading}</EmptyNote>}
        {!isLoading && rows.length === 0 && <EmptyNote pad={24}>{t.nothingToSplit}</EmptyNote>}
        {rows.map((tx) => (
          <div key={tx.id}>
            {render(tx, () => {
              onClose();
              openSplit(tx);
            })}
          </div>
        ))}
      </div>
    </Overlay>
  );
}

/** Smooth path through points (Catmull-Rom → cubic Bézier), for Soft's statistics line. */
export function smoothPath(pts: [number, number][]): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M${pts[0][0]} ${pts[0][1]}`;
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0]} ${c1[1]} ${c2[0]} ${c2[1]} ${p2[0]} ${p2[1]}`;
  }
  return d;
}

/** What the person screen hands to each design's version of it. */
export interface PersonView {
  person: PersonBalance | undefined;
  openDebts: Debt[];
  shared: Transaction[] | undefined;
  settleAll: { mutate: (personId: number) => void; isPending: boolean };
}
