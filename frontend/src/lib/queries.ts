import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, withQuery } from "./api";
import type {
  Account,
  Category,
  DashboardOut,
  Debt,
  KeywordRule,
  Person,
  PersonBalance,
  Period,
  SmsAttempt,
  SmsPattern,
  Transaction,
} from "../types";

export function useAccounts() {
  return useQuery({ queryKey: ["accounts"], queryFn: () => api.get<Account[]>("/accounts") });
}

export function useCategories() {
  return useQuery({ queryKey: ["categories"], queryFn: () => api.get<Category[]>("/categories") });
}

export function usePeople() {
  return useQuery({ queryKey: ["people"], queryFn: () => api.get<Person[]>("/people") });
}

export function usePeopleBalances() {
  return useQuery({
    queryKey: ["people", "balances"],
    queryFn: () => api.get<PersonBalance[]>("/people/balances"),
  });
}

export function useDebts() {
  return useQuery({ queryKey: ["debts"], queryFn: () => api.get<Debt[]>("/debts") });
}

export function useDashboard(period: Period, gross: boolean) {
  return useQuery({
    queryKey: ["dashboard", period, gross],
    queryFn: () => api.get<DashboardOut>(withQuery("/dashboard", { period, gross })),
  });
}

export function useUncategorized() {
  return useQuery({
    queryKey: ["transactions", "uncategorized"],
    queryFn: () => api.get<Transaction[]>("/transactions/uncategorized"),
  });
}

export function useSmsPending() {
  return useQuery({
    queryKey: ["sms", "pending"],
    queryFn: () => api.get<SmsAttempt[]>("/sms/pending"),
    refetchInterval: 30_000,
  });
}

export function useTransactions(filters: Record<string, string | number | boolean | undefined>) {
  return useQuery({
    queryKey: ["transactions", filters],
    queryFn: () => api.get<Transaction[]>(withQuery("/transactions", filters)),
  });
}

export function useCategorizeMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, categoryId }: { id: number; categoryId: number }) =>
      api.patch(`/transactions/${id}/categorize`, { category_id: categoryId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useConfirmSmsMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, categoryId }: { id: number; categoryId?: number | null }) =>
      api.post(`/sms/${id}/confirm`, { category_id: categoryId ?? null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sms"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
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

export function useCreateTransactionMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Partial<Transaction>) => api.post<Transaction>("/transactions", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
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

// --- SMS patterns & keyword rules (Settings -> Bank rules) ---

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

export function useDeleteKeywordRuleMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/keyword-rules/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["keyword-rules"] }),
  });
}

// --- Settings: webhook token, notifications, push ---

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
    queryFn: () =>
      api.get<{ uncategorized_threshold: number; summary_frequency: string }>("/settings/notifications"),
  });
}

export function useUpdateNotificationSettingsMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { uncategorized_threshold: number; summary_frequency: string }) =>
      api.patch("/settings/notifications", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["settings", "notifications"] }),
  });
}

export function useSubscribePushMutation() {
  return useMutation({
    mutationFn: (fcm_token: string) => api.post("/push/subscribe", { fcm_token }),
  });
}
