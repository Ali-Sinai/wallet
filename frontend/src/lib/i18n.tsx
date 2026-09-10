import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Lang = "fa" | "en";

const FAD = "۰۱۲۳۴۵۶۷۸۹";
const STORAGE_KEY = "wallet.lang";

/**
 * String tables lifted from the design bundle (Wallet Web.dc.html + Toman
 * Tracker App.dc.html), plus the handful of keys the real app needs for
 * screens the prototypes don't cover (auth, settings, review).
 */
const STRINGS = {
  fa: {
    appName: "کیف پول",
    langLabel: "فا",
    currency: "تومان",

    dash: "داشبورد",
    activity: "تراکنش‌ها",
    people: "افراد",
    reports: "گزارش",
    inbox: "پیامک‌ها",
    settings: "تنظیمات",
    add: "ثبت دستی",

    navHome: "خانه",
    navActivity: "تراکنش‌ها",
    navPeople: "افراد",
    navReports: "گزارش",

    balance: "خالص این دوره",
    tomanShort: "ت",
    in: "واریز",
    out: "برداشت",
    netThisMonth: "خالص این دوره",
    deposits: "واریز",
    withdrawals: "برداشت",

    detected: "شناسایی شده از پیامک",
    pending: "پیامک",
    confirm: "تأیید",
    split: "تقسیم…",
    ignore: "نادیده",

    dailySpend: "هزینه روزانه — ۱۴ روز گذشته",
    categories: "دسته‌بندی‌ها",
    recent: "آخرین تراکنش‌ها",
    reportsLink: "گزارش ›",
    all: "همه ›",
    avgPrefix: "میانگین ",

    breakdown: "تفکیک دسته‌ها",
    budgets: "بودجه‌ها",
    owedToMe: "طلب من",
    iOwe: "بدهی من",
    settleUp: "تسویه",
    ledger: "ریز حساب",
    owes: "بدهکار به شما",
    youOwe: "بدهی شما",
    settled: "تسویه",
    you: "شما",

    daily: "روزانه",
    weekly: "هفتگی",
    monthly: "ماهانه",
    allFilter: "همه",
    inn: "واریز",
    outFilter: "برداشت",
    allCats: "همه دسته‌ها",

    detail: "جزئیات تراکنش",
    category: "دسته‌بندی",
    account: "حساب",
    date: "تاریخ",
    note: "یادداشت",
    splitBtn: "تقسیم این هزینه",
    delete: "حذف",
    close: "بستن",

    splitTitle: "تقسیم هزینه",
    who: "با چه کسی؟",
    quick: "تقسیم سریع",
    perPerson: "سهم هر نفر",
    save: "ثبت رکوردها",
    iPaid: "من پرداخت کردم، آن‌ها بدهکارند",
    weSplit: "آن‌ها پرداخت کردند، من بدهکارم",
    equal: "برابر",
    customAmounts: "مبلغ دلخواه",
    percentages: "درصد",
    itemized: "آیتمی",
    includeMe: "شامل خودم شود",
    remaining: "باقی‌مانده",
    addItem: "+ افزودن آیتم",
    itemName: "نام آیتم",

    withdraw: "برداشت",
    deposit: "واریز",
    saveTx: "ثبت تراکنش",
    queued: "در صف آفلاین ذخیره شد",

    rules: "قوانین بانک‌ها",
    rulesHint: "کدام پیامک‌ها خوانده شود",
    inboxEmpty: "پیامک تازه‌ای نیست",
    empty: "چیزی پیدا نشد",
    of: "از",
    on: "روشن",
    off: "خاموش",

    uncategorized: "دسته‌بندی نشده",
    allCategorized: "همه چیز دسته‌بندی شده است 🎉",
    reviewHint: "کلید عدد برای انتخاب دسته · فلش‌ها برای جابه‌جایی",
    backToDash: "بازگشت به داشبورد",

    loading: "در حال بارگذاری…",
    offline: "آفلاین — نمایش آخرین داده‌های دریافتی",
    search: "جستجو…",
    login: "ورود",
    logout: "خروج",
    username: "نام کاربری",
    password: "رمز عبور",
    loginFailed: "نام کاربری یا رمز عبور اشتباه است",
    serverError: "خطا در ارتباط با سرور",
    exportCsv: "دریافت CSV",
    gross: "ناخالص",
    edit: "ویرایش",
    saveChanges: "ذخیره تغییرات",
    cancel: "انصراف",
    amount: "مبلغ",
    merchant: "فروشنده",
    unsplit: "لغو تقسیم",
    incomeVsExpense: "درآمد و هزینه",
    income: "درآمد",
    expense: "هزینه",
    vsLastMonth: "نسبت به ماه قبل",
    byAccount: "تفکیک حساب‌ها",
    unparsed: "خوانده‌نشده",
    unparsedHint: "پیامک‌هایی که با هیچ الگویی مطابقت نداشتند",
    resolve: "ثبت دستی",
    pasteSms: "افزودن پیامک",
    pasteHint: "متن پیامک بانک را اینجا بچسبانید تا خوانده شود",
    senderHint: "فرستنده (اختیاری)",
    parse: "خواندن",
    filters: "فیلترها",
    fromDate: "از تاریخ",
    toDate: "تا تاریخ",
    minAmount: "حداقل مبلغ",
    maxAmount: "حداکثر مبلغ",
    clearFilters: "پاک کردن",
    debts: "بدهی‌ها",
    settle: "تسویه",
    partialAmount: "مبلغ تسویه",
    remainingLabel: "مانده",
    owedToMeShort: "طلب",
    iOweShort: "بدهی",
    noAccounts: "اول یک حساب در تنظیمات بسازید",
    goToSettings: "رفتن به تنظیمات",
    nothingYet: "هنوز چیزی ثبت نشده",
    addFirst: "اولین تراکنش را ثبت کنید",
    transaction: "تراکنش",
  },
  en: {
    appName: "Wallet",
    langLabel: "EN",
    currency: "IRT",

    dash: "Dashboard",
    activity: "Activity",
    people: "People",
    reports: "Reports",
    inbox: "SMS inbox",
    settings: "Settings",
    add: "Add record",

    navHome: "Home",
    navActivity: "Activity",
    navPeople: "People",
    navReports: "Reports",

    balance: "NET THIS PERIOD",
    tomanShort: "T",
    in: "In",
    out: "Out",
    netThisMonth: "net this period",
    deposits: "deposits",
    withdrawals: "withdrawals",

    detected: "DETECTED FROM SMS",
    pending: "pending",
    confirm: "Confirm",
    split: "Split…",
    ignore: "Ignore",

    dailySpend: "Daily spend — last 14 days",
    categories: "CATEGORIES",
    recent: "RECENT",
    reportsLink: "Reports ›",
    all: "All ›",
    avgPrefix: "avg ",

    breakdown: "Category breakdown",
    budgets: "Budgets",
    owedToMe: "Owed to me",
    iOwe: "I owe",
    settleUp: "Settle up",
    ledger: "Ledger",
    owes: "owes you",
    youOwe: "you owe",
    settled: "settled",
    you: "You",

    daily: "Daily",
    weekly: "Weekly",
    monthly: "Monthly",
    allFilter: "All",
    inn: "In",
    outFilter: "Out",
    allCats: "All categories",

    detail: "Transaction",
    category: "Category",
    account: "Account",
    date: "Date",
    note: "Note",
    splitBtn: "Split this expense",
    delete: "Delete",
    close: "Close",

    splitTitle: "Split expense",
    who: "With whom?",
    quick: "Quick split",
    perPerson: "Per person",
    save: "Create records",
    iPaid: "I paid — they owe me",
    weSplit: "They paid — I owe",
    equal: "Equal",
    customAmounts: "Amounts",
    percentages: "Percent",
    itemized: "Itemized",
    includeMe: "Include me",
    remaining: "Remaining",
    addItem: "+ Add item",
    itemName: "Item name",

    withdraw: "Withdraw",
    deposit: "Deposit",
    saveTx: "Save transaction",
    queued: "Queued offline",

    rules: "Bank rules",
    rulesHint: "Which messages get read",
    inboxEmpty: "No new messages",
    empty: "Nothing found",
    of: "of",
    on: "on",
    off: "off",

    uncategorized: "Uncategorized",
    allCategorized: "Everything is categorized 🎉",
    reviewHint: "Number keys pick a category · arrows to move",
    backToDash: "Back to dashboard",

    loading: "Loading…",
    offline: "Offline — showing the last data received",
    search: "Search…",
    login: "Sign in",
    logout: "Sign out",
    username: "Username",
    password: "Password",
    loginFailed: "Wrong username or password",
    serverError: "Could not reach the server",
    exportCsv: "Export CSV",
    gross: "Gross",
    edit: "Edit",
    saveChanges: "Save changes",
    cancel: "Cancel",
    amount: "Amount",
    merchant: "Merchant",
    unsplit: "Undo split",
    incomeVsExpense: "Income vs expense",
    income: "Income",
    expense: "Expense",
    vsLastMonth: "vs last month",
    byAccount: "By account",
    unparsed: "Unparsed",
    unparsedHint: "Messages that matched no pattern",
    resolve: "Enter manually",
    pasteSms: "Add a message",
    pasteHint: "Paste a bank SMS here and let the patterns read it",
    senderHint: "Sender (optional)",
    parse: "Parse",
    filters: "Filters",
    fromDate: "From",
    toDate: "To",
    minAmount: "Min amount",
    maxAmount: "Max amount",
    clearFilters: "Clear",
    debts: "Debts",
    settle: "Settle",
    partialAmount: "Settle amount",
    remainingLabel: "Remaining",
    owedToMeShort: "Owed",
    iOweShort: "Owe",
    noAccounts: "Create an account in Settings first",
    goToSettings: "Open settings",
    nothingYet: "Nothing recorded yet",
    addFirst: "Add your first transaction",
    transaction: "Transaction",
  },
} as const;

/** Values widen to `string` so the two tables stay assignable to one type. */
export type Strings = { readonly [K in keyof (typeof STRINGS)["fa"]]: string };

interface I18n {
  lang: Lang;
  fa: boolean;
  dir: "rtl" | "ltr";
  /** Text-align value for the trailing edge, as the design's `endAlign`. */
  endAlign: "left" | "right";
  t: Strings;
  setLang: (lang: Lang) => void;
  toggle: () => void;
  /** Latin digits -> Persian digits when the UI is Persian. */
  digits: (s: string | number) => string;
  /** Thousands-grouped absolute Toman, from Toman-cents. */
  group: (cents: number) => string;
  /** Signed Toman, using the design's − / + prefixes. */
  money: (cents: number, signed?: boolean) => string;
  /** Compact Toman (1.2M / ۱٫۲ م), from Toman-cents. */
  short: (cents: number) => string;
  /** Percent with the right percent sign for the language. */
  percent: (value: number) => string;
  /**
   * Normalises a label the API produced (always Persian digits, Persian
   * Jalali month names) into the active language.
   */
  localize: (label: string) => string;
}

/** Jalali months as the backend spells them, plus the design's Latin short forms. */
const JALALI_MONTHS_FA = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
] as const;
const JALALI_MONTHS_EN = [
  "Far",
  "Ord",
  "Kho",
  "Tir",
  "Mor",
  "Sha",
  "Meh",
  "Aba",
  "Aza",
  "Dey",
  "Bah",
  "Esf",
] as const;

const I18nContext = createContext<I18n | null>(null);

function detectInitialLang(): Lang {
  if (typeof window === "undefined") return "fa";
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "fa") return stored;
  } catch {
    // Storage blocked — fall through to the default.
  }
  return "fa";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectInitialLang);
  const fa = lang === "fa";

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = fa ? "rtl" : "ltr";
    try {
      window.localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Private mode — the choice just will not stick.
    }
  }, [lang, fa]);

  const digits = useCallback(
    (s: string | number) => (fa ? String(s).replace(/[0-9]/g, (d) => FAD[Number(d)]) : String(s)),
    [fa],
  );

  const group = useCallback(
    (cents: number) => {
      const toman = Math.round(Math.abs(cents) / 100);
      return digits(String(toman).replace(/\B(?=(\d{3})+(?!\d))/g, fa ? "٬" : ","));
    },
    [digits, fa],
  );

  const money = useCallback(
    (cents: number, signed = false) => (cents < 0 ? "−" : signed ? "+" : "") + group(cents),
    [group],
  );

  const short = useCallback(
    (cents: number) => {
      const toman = Math.abs(cents) / 100;
      if (toman >= 1e6) return digits((toman / 1e6).toFixed(1)) + (fa ? " م" : "M");
      if (toman >= 1e3) return digits(String(Math.round(toman / 1e3))) + (fa ? " ه" : "K");
      return group(cents);
    },
    [digits, fa, group],
  );

  const percent = useCallback(
    (value: number) => digits(String(Math.round(value))) + (fa ? "٪" : "%"),
    [digits, fa],
  );

  const localize = useCallback(
    (label: string) => {
      if (fa) return label.replace(/[0-9]/g, (d) => FAD[Number(d)]);
      let out = label.replace(/[۰-۹]/g, (d) => String(FAD.indexOf(d)));
      JALALI_MONTHS_FA.forEach((month, i) => {
        out = out.split(month).join(JALALI_MONTHS_EN[i]);
      });
      return out;
    },
    [fa],
  );

  const setLang = useCallback((next: Lang) => setLangState(next), []);
  const toggle = useCallback(() => setLangState((l) => (l === "fa" ? "en" : "fa")), []);

  const value = useMemo<I18n>(
    () => ({
      lang,
      fa,
      dir: fa ? "rtl" : "ltr",
      endAlign: fa ? "left" : "right",
      t: STRINGS[lang],
      setLang,
      toggle,
      digits,
      group,
      money,
      short,
      percent,
      localize,
    }),
    [lang, fa, setLang, toggle, digits, group, money, short, percent, localize],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
