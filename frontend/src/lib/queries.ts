import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { api, withQuery } from "./api";
import type {
  Account,
  AccountBreakdown,
  AccountIn,
  Budget,
  BudgetIn,
  Category,
  CategoryIn,
  DashboardOut,
  Debt,
  GeneralSettings,
  IncomeExpense,
  KeywordRule,
  MonthCategoryDelta,
  NotificationSettings,
  Period,
  Person,
  PersonBalance,
  PersonIn,
  Point,
  CategorySlice,
  SmsAttempt,
  SmsPattern,
  SplitOut,
  Transaction,
  TransactionIn,
} from "../types";

/** Anything that changes money invalidates the derived views too. */
function invalidateMoney(qc: QueryClient) {
  qc.invalidateQueries({ queryKey: ["transactions"] });
  qc.invalidateQueries({ queryKey: ["dashboard"] });
  qc.invalidateQueries({ queryKey: ["reports"] });
  qc.invalidateQueries({ queryKey: ["people"] });
  qc.invalidateQueries({ queryKey: ["debts"] });
  qc.invalidateQueries({ queryKey: ["budgets"] });
}

/* ------------------------------------------------------------------ *
 * Accounts
 * ------------------------------------------------------------------ */

export function useAccounts() {
  return useQuery({ queryKey: ["accounts"], queryFn: () => api.get<Account[]>("/accounts") });
}

export function useCreateAccountMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AccountIn) => api.post<Account>("/accounts", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["accounts"] }),
  });
}

export function useUpdateAccountMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: AccountIn & { id: number }) =>
      api.patch<Account>(`/accounts/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["accounts"] });
      invalidateMoney(qc);
    },
  });
}

export function useDeleteAccountMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/accounts/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["accounts"] });
      invalidateMoney(qc);
    },
  });
}

/* ------------------------------------------------------------------ *
 * Categories
 * ------------------------------------------------------------------ */

export function useCategories() {
  return useQuery({ queryKey: ["categories"], queryFn: () => api.get<Category[]>("/categories") });
}

export function useCreateCategoryMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CategoryIn) => api.post<Category>("/categories", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categories"] }),
  });
}

export function useUpdateCategoryMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: CategoryIn & { id: number }) =>
      api.patch<Category>(`/categories/${id}`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      invalidateMoney(qc);
    },
  });
}

export function useDeleteCategoryMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/categories/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      invalidateMoney(qc);
    },
  });
}

/* ------------------------------------------------------------------ *
 * Budgets
 * ------------------------------------------------------------------ */

export function useBudgets() {
  return useQuery({ queryKey: ["budgets"], queryFn: () => api.get<Budget[]>("/budgets") });
}

export function useCreateBudgetMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: BudgetIn) => api.post<Budget>("/budgets", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["budgets"] }),
  });
}

export function useUpdateBudgetMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: BudgetIn & { id: number }) =>
      api.patch<Budget>(`/budgets/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["budgets"] }),
  });
}

export function useDeleteBudgetMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/budgets/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["budgets"] }),
  });
}

/* ------------------------------------------------------------------ *
 * People & debts
 * ------------------------------------------------------------------ */

export function usePeople() {
  return useQuery({ queryKey: ["people"], queryFn: () => api.get<Person[]>("/people") });
}

export function usePeopleBalances() {
  return useQuery({
    queryKey: ["people", "balances"],
    queryFn: () => api.get<PersonBalance[]>("/people/balances"),
  });
}

export function usePersonDebts(personId: number) {
  return useQuery({
    queryKey: ["people", personId, "debts"],
    queryFn: () => api.get<Debt[]>(`/people/${personId}/debts`),
    enabled: Number.isFinite(personId),
  });
}

export function useCreatePersonMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: PersonIn) => api.post<Person>("/people", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["people"] }),
  });
}

export function useUpdatePersonMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: PersonIn & { id: number }) =>
      api.patch<Person>(`/people/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["people"] }),
  });
}

export function useDeletePersonMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/people/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["people"] });
      qc.invalidateQueries({ queryKey: ["debts"] });
    },
  });
}

export function useDebts() {
  return useQuery({ queryKey: ["debts"], queryFn: () => api.get<Debt[]>("/debts") });
}

/** Partial settlement of a single debt — the API supports any amount up to the remainder. */
export function useSettleDebtMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      debtId,
      amountCents,
      note,
    }: {
      debtId: number;
      amountCents: number;
      note?: string | null;
    }) =>
      api.post<Debt>(`/debts/${debtId}/settle`, {
        amount_cents: amountCents,
        linked_transaction_id: null,
        note: note ?? null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["people"] });
      qc.invalidateQueries({ queryKey: ["debts"] });
    },
  });
}

export function useSettleAllMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (personId: number) => api.post(`/people/${personId}/settle-all`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["people"] });
      qc.invalidateQueries({ queryKey: ["debts"] });
    },
  });
}

/* ------------------------------------------------------------------ *
 * Transactions
 * ------------------------------------------------------------------ */

export type TransactionFilters = Record<string, string | number | boolean | undefined>;

export function useTransactions(filters: TransactionFilters) {
  return useQuery({
    queryKey: ["transactions", filters],
    queryFn: () => api.get<Transaction[]>(withQuery("/transactions", filters)),
  });
}

export function useTransaction(id: number | null) {
  return useQuery({
    queryKey: ["transactions", "one", id],
    queryFn: () => api.get<Transaction>(`/transactions/${id}`),
    enabled: id !== null,
  });
}

/**
 * The cached copy of a transaction the caller already holds, kept current by
 * mutations and refetches. Views that were handed a row snapshot (the detail
 * modal) read through this so edits show up without reopening them.
 */
export function useLiveTransaction(tx: Transaction): Transaction {
  const { data } = useQuery({
    queryKey: ["transactions", "one", tx.id],
    queryFn: () => api.get<Transaction>(`/transactions/${tx.id}`),
    initialData: tx,
  });
  return data;
}

/** Apply `patch` to transaction `id` wherever it sits in the query cache. */
function patchCachedTransaction(qc: QueryClient, id: number, patch: Partial<Transaction>) {
  qc.setQueriesData<unknown>({ queryKey: ["transactions"] }, (old: unknown) => {
    if (Array.isArray(old)) {
      return old.some((t: Transaction) => t.id === id)
        ? old.map((t: Transaction) => (t.id === id ? { ...t, ...patch } : t))
        : old;
    }
    if (old && typeof old === "object" && "amount_cents" in old && (old as Transaction).id === id) {
      return { ...(old as Transaction), ...patch };
    }
    return old;
  });
}

export function useUncategorized() {
  return useQuery({
    queryKey: ["transactions", "uncategorized"],
    queryFn: () => api.get<Transaction[]>("/transactions/uncategorized"),
  });
}

export function useCreateTransactionMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: TransactionIn) => api.post<Transaction>("/transactions", body),
    onSuccess: () => invalidateMoney(qc),
  });
}

export function useUpdateTransactionMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: TransactionIn & { id: number }) =>
      api.patch<Transaction>(`/transactions/${id}`, body),
    onSuccess: (saved) => {
      patchCachedTransaction(qc, saved.id, saved);
      invalidateMoney(qc);
    },
  });
}

export function useDeleteTransactionMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/transactions/${id}`),
    onSuccess: () => invalidateMoney(qc),
  });
}

export function useCategorizeMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, categoryId }: { id: number; categoryId: number }) =>
      api.patch<Transaction>(`/transactions/${id}/categorize`, { category_id: categoryId }),
    // Picking a category is a single tap, so show it immediately rather than
    // after the round trip; roll back if the server refuses.
    onMutate: async ({ id, categoryId }) => {
      await qc.cancelQueries({ queryKey: ["transactions"] });
      const snapshot = qc.getQueriesData({ queryKey: ["transactions"] });
      patchCachedTransaction(qc, id, { category_id: categoryId });
      return { snapshot };
    },
    onError: (_err, _vars, ctx) => {
      ctx?.snapshot.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSuccess: (saved) => patchCachedTransaction(qc, saved.id, saved),
    onSettled: () => invalidateMoney(qc),
  });
}

/** Category the app learned for this merchant from previous categorisations. */
export function useSuggestedCategory(merchantText: string | null | undefined) {
  return useQuery({
    queryKey: ["transactions", "suggest-category", merchantText],
    queryFn: () =>
      api.get<{ category_id: number | null }>(
        `/transactions/suggest-category/${encodeURIComponent(merchantText ?? "")}`,
      ),
    enabled: Boolean(merchantText),
  });
}

/* ------------------------------------------------------------------ *
 * Splits
 * ------------------------------------------------------------------ */

export function useTransactionSplit(txId: number | null) {
  return useQuery({
    queryKey: ["splits", "for-transaction", txId],
    queryFn: () => api.get<SplitOut | null>(`/transactions/${txId}/split`),
    enabled: txId !== null,
  });
}

export function useDeleteSplitMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (splitId: number) => api.delete(`/splits/${splitId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["splits"] });
      invalidateMoney(qc);
    },
  });
}

/* ------------------------------------------------------------------ *
 * SMS ingest queues
 * ------------------------------------------------------------------ */

export function useSmsPending() {
  return useQuery({
    queryKey: ["sms", "pending"],
    queryFn: () => api.get<SmsAttempt[]>("/sms/pending"),
    refetchInterval: 30_000,
  });
}

/** Messages that arrived but matched no pattern — resolved by hand. */
export function useSmsUnparsed() {
  return useQuery({
    queryKey: ["sms", "unparsed"],
    queryFn: () => api.get<SmsAttempt[]>("/sms/unparsed"),
    refetchInterval: 60_000,
  });
}

export function useConfirmSmsMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      categoryId,
      note,
    }: {
      id: number;
      categoryId?: number | null;
      note?: string | null;
    }) => api.post(`/sms/${id}/confirm`, { category_id: categoryId ?? null, note: note ?? null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sms"] });
      invalidateMoney(qc);
    },
  });
}

export function useIgnoreSmsMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.post(`/sms/${id}/ignore`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sms"] }),
  });
}

export function useResolveSmsManuallyMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: number;
      amount_cents: number;
      direction: string;
      account_id: number;
      occurred_at: string;
      category_id: number | null;
      note: string | null;
    }) => api.post<{ transaction_id: number }>(`/sms/${id}/resolve-manually`, body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sms"] });
      invalidateMoney(qc);
    },
  });
}

/** Paste raw bank SMS text and let the server's patterns parse it. */
export function usePasteSmsMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ text, senderHint }: { text: string; senderHint: string }) =>
      api.post<SmsAttempt[]>("/ingest/sms/paste", { text, sender_hint: senderHint }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sms"] }),
  });
}

/* ------------------------------------------------------------------ *
 * SMS patterns & keyword rules
 * ------------------------------------------------------------------ */

export function useSmsPatterns() {
  return useQuery({ queryKey: ["sms-patterns"], queryFn: () => api.get<SmsPattern[]>("/sms-patterns") });
}

export function useCreateSmsPatternMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Omit<SmsPattern, "id">) => api.post<SmsPattern>("/sms-patterns", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sms-patterns"] }),
  });
}

export function useUpdateSmsPatternMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: SmsPattern) => api.patch<SmsPattern>(`/sms-patterns/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sms-patterns"] }),
  });
}

export function useDeleteSmsPatternMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/sms-patterns/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sms-patterns"] }),
  });
}

export function useTestSmsPatternMutation() {
  return useMutation({
    mutationFn: ({ id, sampleText }: { id: number; sampleText: string }) =>
      api.post<{ matched: boolean; groups?: Record<string, string | null>; amount_cents?: number | null }>(
        `/sms-patterns/${id}/test`,
        { sample_text: sampleText },
      ),
  });
}

export function useKeywordRules() {
  return useQuery({ queryKey: ["keyword-rules"], queryFn: () => api.get<KeywordRule[]>("/keyword-rules") });
}

export function useCreateKeywordRuleMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Omit<KeywordRule, "id">) => api.post<KeywordRule>("/keyword-rules", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["keyword-rules"] }),
  });
}

export function useUpdateKeywordRuleMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: KeywordRule) => api.patch<KeywordRule>(`/keyword-rules/${id}`, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["keyword-rules"] }),
  });
}

export function useDeleteKeywordRuleMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/keyword-rules/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["keyword-rules"] }),
  });
}

/* ------------------------------------------------------------------ *
 * Dashboard & reports
 * ------------------------------------------------------------------ */

export function useDashboard(period: Period, gross: boolean) {
  return useQuery({
    queryKey: ["dashboard", period, gross],
    queryFn: () => api.get<DashboardOut>(withQuery("/dashboard", { period, gross })),
  });
}

export function useSpendOverTime(period: Period, groupBy: "day" | "month", gross: boolean) {
  return useQuery({
    queryKey: ["reports", "spend-over-time", period, groupBy, gross],
    queryFn: () =>
      api.get<Point[]>(withQuery("/reports/spend-over-time", { period, group_by: groupBy, gross })),
  });
}

export function useCategoryBreakdown(period: Period, gross: boolean) {
  return useQuery({
    queryKey: ["reports", "category-breakdown", period, gross],
    queryFn: () => api.get<CategorySlice[]>(withQuery("/reports/category-breakdown", { period, gross })),
  });
}

export function useIncomeVsExpense(period: Period, gross: boolean) {
  return useQuery({
    queryKey: ["reports", "income-vs-expense", period, gross],
    queryFn: () => api.get<IncomeExpense>(withQuery("/reports/income-vs-expense", { period, gross })),
  });
}

export function useMonthOverMonth(gross: boolean) {
  return useQuery({
    queryKey: ["reports", "month-over-month", gross],
    queryFn: () => api.get<MonthCategoryDelta[]>(withQuery("/reports/month-over-month", { gross })),
  });
}

export function useByAccount(period: Period, gross: boolean) {
  return useQuery({
    queryKey: ["reports", "by-account", period, gross],
    queryFn: () => api.get<AccountBreakdown[]>(withQuery("/reports/by-account", { period, gross })),
  });
}

/* ------------------------------------------------------------------ *
 * Settings & push
 * ------------------------------------------------------------------ */

export function useGeneralSettings() {
  return useQuery({
    queryKey: ["settings", "general"],
    queryFn: () => api.get<Record<string, string>>("/settings"),
  });
}

export function useUpdateGeneralSettingsMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: GeneralSettings) => api.patch<GeneralSettings>("/settings", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["settings", "general"] }),
  });
}

export function useRotateWebhookTokenMutation() {
  return useMutation({
    mutationFn: () => api.post<{ token: string }>("/settings/webhook-token/rotate"),
  });
}

export function usePushStatus() {
  return useQuery({ queryKey: ["push", "status"], queryFn: () => api.get<{ enabled: boolean }>("/push/status") });
}

export function useNotificationSettings() {
  return useQuery({
    queryKey: ["settings", "notifications"],
    queryFn: () => api.get<NotificationSettings>("/settings/notifications"),
  });
}

export function useUpdateNotificationSettingsMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: NotificationSettings) => api.patch("/settings/notifications", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["settings", "notifications"] }),
  });
}

export function useSubscribePushMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (fcm_token: string) => api.post("/push/subscribe", { fcm_token }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["push"] }),
  });
}

export function useUnsubscribePushMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (fcm_token: string) => api.delete("/push/subscribe", { fcm_token }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["push"] }),
  });
}
