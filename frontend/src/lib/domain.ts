import type { Account, Category, Transaction } from "../types";

/** The design draws signed amounts; the API stores a positive amount + direction. */
export function signedCents(tx: Pick<Transaction, "amount_cents" | "direction">): number {
  return tx.direction === "withdrawal" ? -tx.amount_cents : tx.amount_cents;
}

export function categoryName(category: Category | undefined, fa: boolean, fallback: string): string {
  if (!category) return fallback;
  return (fa ? category.name_fa : category.name_en) || category.name_fa || category.name_en;
}

export const NO_CATEGORY_COLOR = "#5a6663";

export function categoryColor(category: Category | undefined): string {
  return category?.color || NO_CATEGORY_COLOR;
}

export function accountLabel(
  account: Account | undefined,
  fa: boolean,
  digits: (s: string | number) => string,
): string {
  if (!account) return "—";
  const name = (fa ? account.name_fa : account.name_en) || account.bank_name;
  return account.last4 ? `${name} ····${digits(account.last4)}` : name;
}

/** Two-character avatar initials, working for both Persian and Latin names. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  if (parts.length === 1) return parts[0].slice(0, 2);
  return parts[0][0] + parts[1][0];
}

export function txTitle(tx: Transaction, fallback: string): string {
  return tx.merchant_text || tx.note || fallback;
}

/**
 * Category breakdown slices carry a server-rendered Persian label; prefer the
 * category's own name for the active language when we can resolve it.
 */
export function sliceLabel(
  slice: { category_id: number | null; label: string },
  categories: Category[] | undefined,
  fa: boolean,
  uncategorized?: string,
): string {
  if (slice.category_id === null) return uncategorized ?? slice.label;
  const category = categories?.find((c) => c.id === slice.category_id);
  return category ? categoryName(category, fa, slice.label) : slice.label;
}

/** "شهریور ۱۴۰۵" / "Shahrivar 1405" for the phone layout's header. */
export function jalaliMonthLabel(lang: "fa" | "en"): string {
  const locale = lang === "fa" ? "fa-IR-u-ca-persian" : "en-US-u-ca-persian";
  try {
    return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(new Date());
  } catch {
    return "";
  }
}

/** The backend labels daily bars "۳ شهریور"; the chart axis wants just the day. */
export function dayTick(label: string): string {
  return label.split(" ")[0] ?? label;
}

/**
 * The API serialises UTC datetimes without an offset ("2026-09-11T17:14:57").
 * `new Date()` would read that as local time, so pin it to UTC first.
 */
export function parseApiDate(iso: string): Date {
  return new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : `${iso}Z`);
}
