export type Direction = "deposit" | "withdrawal";
export type TxSource = "sms" | "manual" | "split_settlement";
export type ParseStatus = "parsed" | "unparsed";
export type DebtStatus = "open" | "partial" | "settled";
export type DebtDirection = "owed_to_me" | "i_owe";
export type SplitMode = "i_paid" | "they_paid";
export type Period = "today" | "week" | "month" | "custom" | "all";

export interface Account {
  id: number;
  name_fa: string;
  name_en: string;
  bank_name: string;
  last4: string;
  is_active: boolean;
}

export interface Category {
  id: number;
  name_fa: string;
  name_en: string;
  icon: string;
  color: string;
  parent_id: number | null;
  sort_order: number;
}

export interface Transaction {
  id: number;
  amount_cents: number;
  direction: Direction;
  account_id: number;
  occurred_at: string;
  occurred_at_jalali: string;
  category_id: number | null;
  note: string | null;
  source: TxSource;
  merchant_text: string | null;
  is_shared: boolean;
}

export interface Person {
  id: number;
  name: string;
  contact_note: string | null;
}

export interface PersonBalance {
  person_id: number;
  name: string;
  net_cents: number;
  open_debt_count: number;
}

export interface Debt {
  id: number;
  person_id: number;
  direction: DebtDirection;
  amount_cents: number;
  amount_settled_cents: number;
  status: DebtStatus;
  split_share_id: number;
}

export interface Budget {
  id: number;
  category_id: number;
  limit_cents: number;
  month_jalali: string | null;
}

export interface SmsAttempt {
  id: number;
  sender: string;
  parse_status: ParseStatus;
  matched_pattern_id: number | null;
  amount_cents: number | null;
  direction: Direction | null;
  account_last4: string | null;
  occurred_at: string | null;
  merchant: string | null;
  received_at: string;
}

export interface SmsPattern {
  id: number;
  name: string;
  sender_match: string;
  body_regex: string;
  amount_unit: "rial" | "toman";
  enabled: boolean;
}

export interface KeywordRule {
  id: number;
  keyword: string;
  direction: Direction;
}

export interface DashboardOut {
  total_in_cents: number;
  total_out_cents: number;
  net_cents: number;
  biggest_expense_cents: number;
  transaction_count: number;
  deposit_count: number;
  withdrawal_count: number;
  outstanding_debts_owed_to_me_cents: number;
  daily_spend: { label: string; amount_cents: number }[];
  gross_mode: boolean;
}

export interface CategorySlice {
  category_id: number | null;
  label: string;
  color: string;
  amount_cents: number;
  percentage: number;
}
