import { useState } from "react";
import Header from "../components/Header";
import {
  useCreateKeywordRuleMutation,
  useCreateSmsPatternMutation,
  useDeleteKeywordRuleMutation,
  useDeleteSmsPatternMutation,
  useKeywordRules,
  useNotificationSettings,
  usePushStatus,
  useRotateWebhookTokenMutation,
  useSmsPatterns,
  useSubscribePushMutation,
  useTestSmsPatternMutation,
  useUpdateNotificationSettingsMutation,
  useUpdateSmsPatternMutation,
} from "../lib/queries";
import { enablePush } from "../lib/push";
import { isFirebaseConfigured } from "../lib/firebaseConfig";
import type { Direction } from "../types";

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="p-4.5 rounded-card bg-card border border-border">
      <div className="text-[15px] font-bold">{title}</div>
      {hint && <div className="text-[11.5px] text-muted mt-1">{hint}</div>}
      <div className="mt-3.5 flex flex-col gap-3">{children}</div>
    </div>
  );
}

export default function Settings() {
  return (
    <div className="max-w-lg mx-auto pb-24">
      <Header title="تنظیمات" />
      <div className="px-4 mt-4 flex flex-col gap-4">
        <PushSection />
        <WebhookSection />
        <SmsPatternsSection />
        <KeywordRulesSection />
      </div>
    </div>
  );
}

function PushSection() {
  const { data: status } = usePushStatus();
  const { data: notif } = useNotificationSettings();
  const updateNotif = useUpdateNotificationSettingsMutation();
  const subscribe = useSubscribePushMutation();
  const [message, setMessage] = useState<string | null>(null);
  const [threshold, setThreshold] = useState<string>("");
  const [frequency, setFrequency] = useState<string>("");

  const effectiveThreshold = threshold || String(notif?.uncategorized_threshold ?? 5);
  const effectiveFrequency = frequency || notif?.summary_frequency || "weekly";

  async function onEnable() {
    setMessage(null);
    const result = await enablePush();
    if (!result.ok) {
      const reasons: Record<string, string> = {
        "not-configured": "پیکربندی Firebase کامل نیست — به README مراجعه کنید",
        "permission-denied": "اجازه اعلان داده نشد",
        "no-service-worker": "مرورگر از Service Worker پشتیبانی نمی‌کند",
        error: "خطا در فعال‌سازی اعلان",
      };
      setMessage(reasons[result.reason]);
      return;
    }
    await subscribe.mutateAsync(result.token);
    setMessage("اعلان‌ها فعال شد");
  }

  return (
    <Section title="اعلان‌ها" hint={status?.enabled ? "سرور برای ارسال اعلان آماده است" : "Firebase روی سرور پیکربندی نشده — اعلان‌ها غیرفعال است"}>
      <button
        onClick={onEnable}
        disabled={!isFirebaseConfigured || !status?.enabled}
        className="w-full text-center py-3 rounded-2xl bg-accent text-[#04120c] font-bold text-[13px] disabled:opacity-40"
      >
        فعال‌سازی اعلان در این مرورگر
      </button>
      {!isFirebaseConfigured && (
        <div className="text-[11px] text-muted">
          پیکربندی Firebase در frontend/src/lib/firebaseConfig.ts هنوز تکمیل نشده.
        </div>
      )}
      {message && <div className="text-[11.5px] text-accent">{message}</div>}

      <div className="h-px bg-border my-1" />

      <label className="flex items-center justify-between text-xs">
        <span className="text-text/75">آستانه هشدار دسته‌بندی‌نشده‌ها</span>
        <input
          type="number"
          value={effectiveThreshold}
          onChange={(e) => setThreshold(e.target.value)}
          className="w-16 bg-white/5 rounded-lg px-2 py-1.5 text-left outline-none"
        />
      </label>
      <label className="flex items-center justify-between text-xs">
        <span className="text-text/75">خلاصه دوره‌ای</span>
        <select
          value={effectiveFrequency}
          onChange={(e) => setFrequency(e.target.value)}
          className="bg-white/5 rounded-lg px-2 py-1.5 outline-none"
        >
          <option value="off">خاموش</option>
          <option value="weekly">هفتگی</option>
          <option value="monthly">ماهانه</option>
        </select>
      </label>
      <button
        onClick={() =>
          updateNotif.mutate({
            uncategorized_threshold: Number(effectiveThreshold),
            summary_frequency: effectiveFrequency,
          })
        }
        className="text-xs text-accent self-start"
      >
        ذخیره تنظیمات
      </button>
    </Section>
  );
}

function WebhookSection() {
  const rotate = useRotateWebhookTokenMutation();
  const [token, setToken] = useState<string | null>(null);

  return (
    <Section title="توکن Webhook" hint="برای اتصال اپ فورواردر پیامک (MacroDroid/Tasker) — به README مراجعه کنید">
      <button
        onClick={async () => {
          const res = await rotate.mutateAsync();
          setToken(res.token);
        }}
        className="w-full text-center py-3 rounded-2xl border border-border text-[13px] font-bold"
      >
        تولید توکن جدید
      </button>
      {token && (
        <div className="p-3 rounded-xl bg-white/5 text-[11px] break-all select-all font-mono" dir="ltr">
          {token}
          <div className="text-[10.5px] text-expense mt-2" dir="rtl">
            این توکن فقط یک‌بار نمایش داده می‌شود — همین حالا کپی کنید.
          </div>
        </div>
      )}
    </Section>
  );
}

function SmsPatternsSection() {
  const { data: patterns } = useSmsPatterns();
  const createPattern = useCreateSmsPatternMutation();
  const updatePattern = useUpdateSmsPatternMutation();
  const deletePattern = useDeleteSmsPatternMutation();
  const testPattern = useTestSmsPatternMutation();

  const [form, setForm] = useState({ name: "", sender_match: "", body_regex: "" });
  const [testFor, setTestFor] = useState<number | null>(null);
  const [sampleText, setSampleText] = useState("");
  const [testResult, setTestResult] = useState<string | null>(null);

  async function runTest(id: number) {
    const res = await testPattern.mutateAsync({ id, sampleText });
    setTestResult(JSON.stringify(res, null, 2));
  }

  return (
    <Section title="الگوهای پیامک بانکی" hint="هر بانک یک الگوی regex دارد — ویرایش یا افزودن الگوی جدید">
      <div className="flex flex-col gap-2">
        {patterns?.map((p) => (
          <div key={p.id} className="p-3 rounded-xl bg-white/5 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="text-[13px] font-bold">{p.name}</div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updatePattern.mutate({ ...p, enabled: !p.enabled })}
                  className={`w-9 h-5 rounded-pill p-0.5 flex ${p.enabled ? "bg-accent justify-end" : "bg-white/15 justify-start"}`}
                >
                  <span className="w-4 h-4 rounded-pill bg-white" />
                </button>
                <button onClick={() => deletePattern.mutate(p.id)} className="text-xs text-expense">
                  حذف
                </button>
              </div>
            </div>
            <div className="text-[11px] text-mutedSoft" dir="ltr">
              sender: {p.sender_match}
            </div>
            <textarea
              defaultValue={p.body_regex}
              dir="ltr"
              rows={2}
              onBlur={(e) => {
                if (e.target.value !== p.body_regex) updatePattern.mutate({ ...p, body_regex: e.target.value });
              }}
              className="text-[11px] font-mono bg-black/30 rounded-lg p-2 outline-none"
            />
            <button
              onClick={() => setTestFor(testFor === p.id ? null : p.id)}
              className="text-xs text-accent self-start"
            >
              آزمایش با متن نمونه
            </button>
            {testFor === p.id && (
              <div className="flex flex-col gap-2">
                <textarea
                  value={sampleText}
                  onChange={(e) => setSampleText(e.target.value)}
                  dir="rtl"
                  rows={2}
                  placeholder="متن نمونه پیامک را اینجا بچسبانید"
                  className="text-xs bg-black/30 rounded-lg p-2 outline-none"
                />
                <button
                  onClick={() => runTest(p.id)}
                  className="text-xs bg-accent text-[#04120c] font-bold rounded-lg py-2"
                >
                  اجرای آزمایش
                </button>
                {testResult && (
                  <pre className="text-[10px] bg-black/40 rounded-lg p-2 overflow-x-auto" dir="ltr">
                    {testResult}
                  </pre>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="h-px bg-border my-1" />

      <div className="text-xs text-muted">افزودن الگوی جدید</div>
      <input
        placeholder="نام (مثلا بانک ملی)"
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        className="bg-white/5 rounded-lg px-3 py-2 text-xs outline-none"
      />
      <input
        placeholder="sender match"
        dir="ltr"
        value={form.sender_match}
        onChange={(e) => setForm({ ...form, sender_match: e.target.value })}
        className="bg-white/5 rounded-lg px-3 py-2 text-xs outline-none"
      />
      <textarea
        placeholder="regex با named groups: amount, type, account, datetime, merchant"
        dir="ltr"
        rows={2}
        value={form.body_regex}
        onChange={(e) => setForm({ ...form, body_regex: e.target.value })}
        className="bg-white/5 rounded-lg px-3 py-2 text-xs font-mono outline-none"
      />
      <button
        onClick={async () => {
          if (!form.name || !form.body_regex) return;
          await createPattern.mutateAsync({ ...form, amount_unit: "rial", enabled: true });
          setForm({ name: "", sender_match: "", body_regex: "" });
        }}
        className="text-center py-2.5 rounded-xl bg-accent text-[#04120c] font-bold text-xs"
      >
        افزودن الگو
      </button>
    </Section>
  );
}

function KeywordRulesSection() {
  const { data: rules } = useKeywordRules();
  const createRule = useCreateKeywordRuleMutation();
  const deleteRule = useDeleteKeywordRuleMutation();
  const [keyword, setKeyword] = useState("");
  const [direction, setDirection] = useState<Direction>("withdrawal");

  return (
    <Section title="کلیدواژه‌های واریز/برداشت" hint="کدام کلمات یعنی واریز و کدام یعنی برداشت">
      <div className="flex flex-col gap-1.5">
        {rules?.map((r) => (
          <div key={r.id} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5">
            <span className="flex-1 text-[13px] font-bold">{r.keyword}</span>
            <span
              className={`px-2 py-1 rounded-pill text-[10.5px] font-bold ${
                r.direction === "withdrawal" ? "text-expense" : "text-income"
              }`}
            >
              {r.direction === "withdrawal" ? "برداشت" : "واریز"}
            </span>
            <button onClick={() => deleteRule.mutate(r.id)} className="text-xs text-expense">
              حذف
            </button>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          placeholder="کلیدواژه جدید"
          className="flex-1 bg-white/5 rounded-lg px-3 py-2 text-xs outline-none"
        />
        <select
          value={direction}
          onChange={(e) => setDirection(e.target.value as Direction)}
          className="bg-white/5 rounded-lg px-2 text-xs outline-none"
        >
          <option value="withdrawal">برداشت</option>
          <option value="deposit">واریز</option>
        </select>
      </div>
      <button
        onClick={async () => {
          if (!keyword) return;
          await createRule.mutateAsync({ keyword, direction });
          setKeyword("");
        }}
        className="text-center py-2.5 rounded-xl bg-accent text-[#04120c] font-bold text-xs"
      >
        افزودن کلیدواژه
      </button>
    </Section>
  );
}
