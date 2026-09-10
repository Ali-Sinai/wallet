import { useState, type ReactNode } from "react";
import AppShell from "../components/shell/AppShell";
import { DeleteButton, Field, Input, ListRow, MiniButton, Select, Toggle } from "../components/ui";
import { useI18n } from "../lib/i18n";
import { useAuth } from "../lib/auth";
import { S } from "../lib/settingsStrings";
import { enablePush } from "../lib/push";
import { isFirebaseConfigured } from "../lib/firebaseConfig";
import { categoryName } from "../lib/domain";
import {
  useAccounts,
  useBudgets,
  useCategories,
  useCreateAccountMutation,
  useCreateBudgetMutation,
  useCreateCategoryMutation,
  useCreateKeywordRuleMutation,
  useCreatePersonMutation,
  useCreateSmsPatternMutation,
  useDeleteAccountMutation,
  useDeleteBudgetMutation,
  useDeleteCategoryMutation,
  useDeleteKeywordRuleMutation,
  useDeletePersonMutation,
  useDeleteSmsPatternMutation,
  useGeneralSettings,
  useKeywordRules,
  useNotificationSettings,
  usePeople,
  usePushStatus,
  useRotateWebhookTokenMutation,
  useSmsPatterns,
  useSubscribePushMutation,
  useTestSmsPatternMutation,
  useUpdateAccountMutation,
  useUpdateBudgetMutation,
  useUpdateCategoryMutation,
  useUpdateGeneralSettingsMutation,
  useUpdateKeywordRuleMutation,
  useUpdateNotificationSettingsMutation,
  useUpdatePersonMutation,
  useUpdateSmsPatternMutation,
} from "../lib/queries";
import type { Direction } from "../types";

function useS() {
  const { lang } = useI18n();
  return S[lang];
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <div style={{ padding: 22, borderRadius: 20, background: "#0e1110", border: "1px solid rgba(255,255,255,.07)" }}>
      <div style={{ fontSize: 15, fontWeight: 700 }}>{title}</div>
      {hint && <div style={{ fontSize: 11.5, color: "rgba(232,234,236,.45)", marginTop: 4 }}>{hint}</div>}
      <div className="flex flex-col" style={{ gap: 12, marginTop: 14 }}>
        {children}
      </div>
    </div>
  );
}

function Rows({ children, empty }: { children: ReactNode[]; empty: string }) {
  const rows = children.filter(Boolean);
  if (rows.length === 0) {
    return <div style={{ fontSize: 12, color: "rgba(232,234,236,.35)", padding: "6px 0" }}>{empty}</div>;
  }
  return (
    <div className="flex flex-col" style={{ gap: 8 }}>
      {rows}
    </div>
  );
}

function SaveRow({
  onSave,
  onCancel,
  saveLabel,
  cancelLabel,
}: {
  onSave: () => void;
  onCancel?: () => void;
  saveLabel: string;
  cancelLabel: string;
}) {
  return (
    <div className="flex" style={{ gap: 8 }}>
      <button
        type="button"
        onClick={onSave}
        style={{
          flex: 1,
          textAlign: "center",
          padding: "10px 0",
          borderRadius: 12,
          background: "#0f9b6e",
          color: "#04120c",
          fontSize: 12.5,
          fontWeight: 700,
        }}
      >
        {saveLabel}
      </button>
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: "10px 16px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,.14)",
            color: "rgba(232,234,236,.7)",
            fontSize: 12.5,
            fontWeight: 700,
          }}
        >
          {cancelLabel}
        </button>
      )}
    </div>
  );
}

export default function Settings() {
  const s = useS();
  return (
    <AppShell sidebar={false}>
      <div
        className="mx-auto flex w-full flex-col fade-in"
        style={{ maxWidth: 1100, gap: 18, padding: "0 22px 24px" }}
      >
        <div style={{ fontSize: 19, fontWeight: 700 }}>{s.title}</div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(340px,1fr))",
            gap: 18,
            alignItems: "start",
          }}
        >
          <GeneralSection />
          <AccountsSection />
          <CategoriesSection />
          <BudgetsSection />
          <PeopleSection />
          <PushSection />
          <WebhookSection />
          <SmsPatternsSection />
          <KeywordRulesSection />
        </div>
        <LogoutRow />
      </div>
    </AppShell>
  );
}

function LogoutRow() {
  const s = useS();
  const { logout } = useAuth();
  return (
    <button
      type="button"
      onClick={() => logout()}
      className="self-start"
      style={{
        padding: "10px 16px",
        borderRadius: 12,
        border: "1px solid rgba(255,122,107,.35)",
        color: "#ff7a6b",
        fontSize: 13,
        fontWeight: 700,
      }}
    >
      {s.logout}
    </button>
  );
}

/* ------------------------------------------------------------------ *
 * General — language and digit style, stored server-side
 * ------------------------------------------------------------------ */

function GeneralSection() {
  const s = useS();
  const { setLang } = useI18n();
  const { data: settings } = useGeneralSettings();
  const update = useUpdateGeneralSettingsMutation();

  const [langField, setLangField] = useState<string | null>(null);
  const [digitField, setDigitField] = useState<string | null>(null);

  const effectiveLang = langField ?? settings?.default_lang ?? "fa";
  const effectiveDigits = digitField ?? settings?.digit_style ?? "fa";

  return (
    <Section title={s.general} hint={s.generalHint}>
      <div className="flex" style={{ gap: 10 }}>
        <Field label={s.defaultLang}>
          <Select
            value={effectiveLang}
            onChange={setLangField}
            options={[
              { value: "fa", label: s.persian },
              { value: "en", label: s.english },
            ]}
          />
        </Field>
        <Field label={s.digitStyle}>
          <Select
            value={effectiveDigits}
            onChange={setDigitField}
            options={[
              { value: "fa", label: s.persianDigits },
              { value: "en", label: s.latinDigits },
            ]}
          />
        </Field>
      </div>
      <SaveRow
        saveLabel={s.saveSettings}
        cancelLabel={s.cancel}
        onSave={() => {
          update.mutate({ default_lang: effectiveLang, digit_style: effectiveDigits });
          if (effectiveLang === "fa" || effectiveLang === "en") setLang(effectiveLang);
        }}
      />
    </Section>
  );
}

/* ------------------------------------------------------------------ *
 * Accounts
 * ------------------------------------------------------------------ */

const EMPTY_ACCOUNT = { name_fa: "", name_en: "", bank_name: "", last4: "", is_active: true };

function AccountsSection() {
  const s = useS();
  const { fa, digits } = useI18n();
  const { data: accounts } = useAccounts();
  const create = useCreateAccountMutation();
  const update = useUpdateAccountMutation();
  const remove = useDeleteAccountMutation();

  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState({ ...EMPTY_ACCOUNT });

  function reset() {
    setEditing(null);
    setForm({ ...EMPTY_ACCOUNT });
  }

  function submit() {
    if (!form.bank_name && !form.name_fa) return;
    if (editing === null) create.mutate(form);
    else update.mutate({ id: editing, ...form });
    reset();
  }

  return (
    <Section title={s.accounts} hint={s.accountsHint}>
      <Rows empty={s.none}>
        {(accounts ?? []).map((a) => (
          <ListRow
            key={a.id}
            actions={
              <>
                <Toggle
                  on={a.is_active}
                  onToggle={() =>
                    update.mutate({
                      id: a.id,
                      name_fa: a.name_fa,
                      name_en: a.name_en,
                      bank_name: a.bank_name,
                      last4: a.last4,
                      is_active: !a.is_active,
                    })
                  }
                />
                <MiniButton
                  onClick={() => {
                    setEditing(a.id);
                    setForm({
                      name_fa: a.name_fa,
                      name_en: a.name_en,
                      bank_name: a.bank_name,
                      last4: a.last4,
                      is_active: a.is_active,
                    });
                  }}
                >
                  {s.edit}
                </MiniButton>
                <DeleteButton label={s.remove} confirmLabel={s.confirmRemove} onConfirm={() => remove.mutate(a.id)} />
              </>
            }
          >
            <div className="truncate" style={{ fontSize: 13, fontWeight: 700 }}>
              {(fa ? a.name_fa : a.name_en) || a.bank_name}
            </div>
            <div style={{ fontSize: 11, color: "rgba(232,234,236,.4)", marginTop: 2 }}>
              {a.bank_name} ····{digits(a.last4)} · {a.is_active ? s.active : s.inactive}
            </div>
          </ListRow>
        ))}
      </Rows>

      <div className="flex" style={{ gap: 10 }}>
        <Field label={s.accountNameFa}>
          <Input value={form.name_fa} onChange={(v) => setForm({ ...form, name_fa: v })} />
        </Field>
        <Field label={s.accountNameEn}>
          <Input value={form.name_en} onChange={(v) => setForm({ ...form, name_en: v })} dir="ltr" />
        </Field>
      </div>
      <div className="flex" style={{ gap: 10 }}>
        <Field label={s.bankName}>
          <Input value={form.bank_name} onChange={(v) => setForm({ ...form, bank_name: v })} />
        </Field>
        <Field label={s.last4}>
          <Input value={form.last4} onChange={(v) => setForm({ ...form, last4: v })} dir="ltr" />
        </Field>
      </div>
      <SaveRow
        saveLabel={editing === null ? s.addAccount : s.save}
        cancelLabel={s.cancel}
        onSave={submit}
        onCancel={editing === null ? undefined : reset}
      />
    </Section>
  );
}

/* ------------------------------------------------------------------ *
 * Categories
 * ------------------------------------------------------------------ */

const EMPTY_CATEGORY = {
  name_fa: "",
  name_en: "",
  icon: "💰",
  color: "#0f9b6e",
  parent_id: null as number | null,
  sort_order: 0,
};

function CategoriesSection() {
  const s = useS();
  const { fa } = useI18n();
  const { data: categories } = useCategories();
  const create = useCreateCategoryMutation();
  const update = useUpdateCategoryMutation();
  const remove = useDeleteCategoryMutation();

  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState({ ...EMPTY_CATEGORY });

  function reset() {
    setEditing(null);
    setForm({ ...EMPTY_CATEGORY });
  }

  function submit() {
    if (!form.name_fa && !form.name_en) return;
    if (editing === null) create.mutate(form);
    else update.mutate({ id: editing, ...form });
    reset();
  }

  return (
    <Section title={s.categories} hint={s.categoriesHint}>
      <Rows empty={s.none}>
        {(categories ?? []).map((c) => (
          <ListRow
            key={c.id}
            actions={
              <>
                <MiniButton
                  onClick={() => {
                    setEditing(c.id);
                    setForm({
                      name_fa: c.name_fa,
                      name_en: c.name_en,
                      icon: c.icon,
                      color: c.color,
                      parent_id: c.parent_id,
                      sort_order: c.sort_order,
                    });
                  }}
                >
                  {s.edit}
                </MiniButton>
                <DeleteButton label={s.remove} confirmLabel={s.confirmRemove} onConfirm={() => remove.mutate(c.id)} />
              </>
            }
          >
            <div className="flex items-center" style={{ gap: 9 }}>
              <span className="flex-none" style={{ width: 9, height: 9, borderRadius: 3, background: c.color }} />
              <span className="truncate" style={{ fontSize: 13, fontWeight: 700 }}>
                {c.icon} {categoryName(c, fa, "")}
              </span>
            </div>
          </ListRow>
        ))}
      </Rows>

      <div className="flex" style={{ gap: 10 }}>
        <Field label={s.nameFa}>
          <Input value={form.name_fa} onChange={(v) => setForm({ ...form, name_fa: v })} />
        </Field>
        <Field label={s.nameEn}>
          <Input value={form.name_en} onChange={(v) => setForm({ ...form, name_en: v })} dir="ltr" />
        </Field>
      </div>
      <div className="flex" style={{ gap: 10 }}>
        <Field label={s.icon}>
          <Input value={form.icon} onChange={(v) => setForm({ ...form, icon: v })} />
        </Field>
        <Field label={s.color}>
          <input
            type="color"
            value={form.color}
            onChange={(e) => setForm({ ...form, color: e.target.value })}
            style={{
              width: "100%",
              height: 38,
              borderRadius: 12,
              background: "rgba(255,255,255,.05)",
              border: "1px solid rgba(255,255,255,.09)",
              padding: 4,
            }}
          />
        </Field>
        <Field label={s.sortOrder}>
          <Input
            type="number"
            value={String(form.sort_order)}
            onChange={(v) => setForm({ ...form, sort_order: Number(v) || 0 })}
            dir="ltr"
          />
        </Field>
      </div>
      <Field label={s.parent}>
        <Select
          value={form.parent_id === null ? "" : String(form.parent_id)}
          onChange={(v) => setForm({ ...form, parent_id: v ? Number(v) : null })}
          options={[
            { value: "", label: s.noParent },
            ...(categories ?? [])
              .filter((c) => c.id !== editing)
              .map((c) => ({ value: String(c.id), label: categoryName(c, fa, "") })),
          ]}
        />
      </Field>
      <SaveRow
        saveLabel={editing === null ? s.addCategory : s.save}
        cancelLabel={s.cancel}
        onSave={submit}
        onCancel={editing === null ? undefined : reset}
      />
    </Section>
  );
}

/* ------------------------------------------------------------------ *
 * Budgets
 * ------------------------------------------------------------------ */

function BudgetsSection() {
  const s = useS();
  const { fa, group } = useI18n();
  const { data: budgets } = useBudgets();
  const { data: categories } = useCategories();
  const create = useCreateBudgetMutation();
  const update = useUpdateBudgetMutation();
  const remove = useDeleteBudgetMutation();

  const [editing, setEditing] = useState<number | null>(null);
  const [categoryId, setCategoryId] = useState("");
  const [limit, setLimit] = useState("");
  const [month, setMonth] = useState("");

  function reset() {
    setEditing(null);
    setCategoryId("");
    setLimit("");
    setMonth("");
  }

  function submit() {
    const catId = Number(categoryId || categories?.[0]?.id);
    if (!catId || !limit) return;
    const body = {
      category_id: catId,
      limit_cents: Math.round(Number(limit) * 100),
      month_jalali: month || null,
    };
    if (editing === null) create.mutate(body);
    else update.mutate({ id: editing, ...body });
    reset();
  }

  return (
    <Section title={s.budgets} hint={s.budgetsHint}>
      <Rows empty={s.none}>
        {(budgets ?? []).map((b) => {
          const category = categories?.find((c) => c.id === b.category_id);
          return (
            <ListRow
              key={b.id}
              actions={
                <>
                  <MiniButton
                    onClick={() => {
                      setEditing(b.id);
                      setCategoryId(String(b.category_id));
                      setLimit(String(Math.round(b.limit_cents / 100)));
                      setMonth(b.month_jalali ?? "");
                    }}
                  >
                    {s.edit}
                  </MiniButton>
                  <DeleteButton label={s.remove} confirmLabel={s.confirmRemove} onConfirm={() => remove.mutate(b.id)} />
                </>
              }
            >
              <div className="truncate" style={{ fontSize: 13, fontWeight: 700 }}>
                {categoryName(category, fa, "—")}
              </div>
              <div style={{ fontSize: 11, color: "rgba(232,234,236,.4)", marginTop: 2 }}>
                {group(b.limit_cents)} · {b.month_jalali || s.everyMonth}
              </div>
            </ListRow>
          );
        })}
      </Rows>

      <Field label={s.categories}>
        <Select
          value={categoryId || String(categories?.[0]?.id ?? "")}
          onChange={setCategoryId}
          options={(categories ?? []).map((c) => ({ value: String(c.id), label: categoryName(c, fa, "") }))}
        />
      </Field>
      <div className="flex" style={{ gap: 10 }}>
        <Field label={s.limitToman}>
          <Input type="number" value={limit} onChange={setLimit} dir="ltr" />
        </Field>
        <Field label={s.monthJalali} hint={s.everyMonth}>
          <Input value={month} onChange={setMonth} dir="ltr" placeholder="1405-06" />
        </Field>
      </div>
      <SaveRow
        saveLabel={editing === null ? s.addBudget : s.save}
        cancelLabel={s.cancel}
        onSave={submit}
        onCancel={editing === null ? undefined : reset}
      />
    </Section>
  );
}

/* ------------------------------------------------------------------ *
 * People
 * ------------------------------------------------------------------ */

function PeopleSection() {
  const s = useS();
  const { data: people } = usePeople();
  const create = useCreatePersonMutation();
  const update = useUpdatePersonMutation();
  const remove = useDeletePersonMutation();

  const [editing, setEditing] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");

  function reset() {
    setEditing(null);
    setName("");
    setNote("");
  }

  function submit() {
    if (!name.trim()) return;
    const body = { name: name.trim(), contact_note: note || null };
    if (editing === null) create.mutate(body);
    else update.mutate({ id: editing, ...body });
    reset();
  }

  return (
    <Section title={s.peopleTitle} hint={s.peopleHint}>
      <Rows empty={s.none}>
        {(people ?? []).map((p) => (
          <ListRow
            key={p.id}
            actions={
              <>
                <MiniButton
                  onClick={() => {
                    setEditing(p.id);
                    setName(p.name);
                    setNote(p.contact_note ?? "");
                  }}
                >
                  {s.edit}
                </MiniButton>
                <DeleteButton label={s.remove} confirmLabel={s.confirmRemove} onConfirm={() => remove.mutate(p.id)} />
              </>
            }
          >
            <div className="truncate" style={{ fontSize: 13, fontWeight: 700 }}>
              {p.name}
            </div>
            {p.contact_note && (
              <div className="truncate" style={{ fontSize: 11, color: "rgba(232,234,236,.4)", marginTop: 2 }}>
                {p.contact_note}
              </div>
            )}
          </ListRow>
        ))}
      </Rows>

      <div className="flex" style={{ gap: 10 }}>
        <Field label={s.personName}>
          <Input value={name} onChange={setName} />
        </Field>
        <Field label={s.contactNote}>
          <Input value={note} onChange={setNote} />
        </Field>
      </div>
      <SaveRow
        saveLabel={editing === null ? s.addPerson : s.save}
        cancelLabel={s.cancel}
        onSave={submit}
        onCancel={editing === null ? undefined : reset}
      />
    </Section>
  );
}

/* ------------------------------------------------------------------ *
 * Notifications
 * ------------------------------------------------------------------ */

function PushSection() {
  const s = useS();
  const { data: status } = usePushStatus();
  const { data: notif } = useNotificationSettings();
  const updateNotif = useUpdateNotificationSettingsMutation();
  const subscribe = useSubscribePushMutation();
  const [message, setMessage] = useState<string | null>(null);
  const [threshold, setThreshold] = useState<string>("");
  const [frequency, setFrequency] = useState<string>("");

  const effectiveThreshold = threshold || String(notif?.uncategorized_threshold ?? 5);
  const effectiveFrequency = frequency || notif?.summary_frequency || "weekly";
  const canEnable = isFirebaseConfigured && Boolean(status?.enabled);

  async function onEnable() {
    setMessage(null);
    const result = await enablePush();
    if (!result.ok) {
      const reasons: Record<string, string> = {
        "not-configured": s.reasonNotConfigured,
        "permission-denied": s.reasonPermissionDenied,
        "no-service-worker": s.reasonNoServiceWorker,
        error: s.reasonError,
      };
      setMessage(reasons[result.reason]);
      return;
    }
    await subscribe.mutateAsync(result.token);
    setMessage(s.pushEnabled);
  }

  return (
    <Section title={s.notifications} hint={status?.enabled ? s.pushReady : s.pushNotReady}>
      <button
        type="button"
        onClick={onEnable}
        disabled={!canEnable}
        style={{
          width: "100%",
          textAlign: "center",
          padding: "11px 0",
          borderRadius: 12,
          background: "#0f9b6e",
          color: "#04120c",
          fontSize: 12.5,
          fontWeight: 700,
          opacity: canEnable ? 1 : 0.4,
        }}
      >
        {s.enablePush}
      </button>
      {!isFirebaseConfigured && (
        <div style={{ fontSize: 11, color: "rgba(232,234,236,.45)" }}>{s.firebaseIncomplete}</div>
      )}
      {message && <div style={{ fontSize: 11.5, color: "#0f9b6e" }}>{message}</div>}

      <div style={{ height: 1, background: "rgba(255,255,255,.07)" }} />

      <div className="flex" style={{ gap: 10 }}>
        <Field label={s.thresholdLabel}>
          <Input type="number" value={effectiveThreshold} onChange={setThreshold} dir="ltr" />
        </Field>
        <Field label={s.summaryLabel}>
          <Select
            value={effectiveFrequency}
            onChange={setFrequency}
            options={[
              { value: "off", label: s.off },
              { value: "weekly", label: s.weekly },
              { value: "monthly", label: s.monthly },
            ]}
          />
        </Field>
      </div>
      <SaveRow
        saveLabel={s.saveSettings}
        cancelLabel={s.cancel}
        onSave={() =>
          updateNotif.mutate({
            uncategorized_threshold: Number(effectiveThreshold),
            summary_frequency: effectiveFrequency,
          })
        }
      />
    </Section>
  );
}

/* ------------------------------------------------------------------ *
 * Webhook token
 * ------------------------------------------------------------------ */

function WebhookSection() {
  const s = useS();
  const rotate = useRotateWebhookTokenMutation();
  const [token, setToken] = useState<string | null>(null);

  return (
    <Section title={s.webhookTitle} hint={s.webhookHint}>
      <button
        type="button"
        onClick={async () => {
          const res = await rotate.mutateAsync();
          setToken(res.token);
        }}
        style={{
          width: "100%",
          textAlign: "center",
          padding: "11px 0",
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,.14)",
          fontSize: 12.5,
          fontWeight: 700,
          color: "rgba(232,234,236,.8)",
        }}
      >
        {s.generateToken}
      </button>
      {token && (
        <div
          className="select-all break-all font-mono"
          dir="ltr"
          style={{ padding: 12, borderRadius: 12, background: "rgba(255,255,255,.05)", fontSize: 11 }}
        >
          {token}
          <div dir="auto" style={{ fontSize: 10.5, color: "#ff7a6b", marginTop: 8 }}>
            {s.tokenOnce}
          </div>
        </div>
      )}
    </Section>
  );
}

/* ------------------------------------------------------------------ *
 * SMS patterns
 * ------------------------------------------------------------------ */

const TEXTAREA_STYLE = {
  fontSize: 11,
  background: "rgba(0,0,0,.3)",
  borderRadius: 10,
  padding: 8,
  color: "#e8eaec",
  border: "1px solid rgba(255,255,255,.07)",
  outline: "none",
} as const;

function SmsPatternsSection() {
  const s = useS();
  const { data: patterns } = useSmsPatterns();
  const createPattern = useCreateSmsPatternMutation();
  const updatePattern = useUpdateSmsPatternMutation();
  const deletePattern = useDeleteSmsPatternMutation();
  const testPattern = useTestSmsPatternMutation();

  const [form, setForm] = useState({ name: "", sender_match: "", body_regex: "" });
  const [testFor, setTestFor] = useState<number | null>(null);
  const [sampleText, setSampleText] = useState("");
  const [testResult, setTestResult] = useState<string | null>(null);

  return (
    <Section title={s.patternsTitle} hint={s.patternsHint}>
      <Rows empty={s.none}>
        {(patterns ?? []).map((p) => (
          <div
            key={p.id}
            className="flex flex-col"
            style={{ gap: 8, padding: 12, borderRadius: 14, background: "rgba(255,255,255,.04)" }}
          >
            <div className="flex items-center justify-between" style={{ gap: 8 }}>
              <div className="min-w-0 truncate" style={{ fontSize: 13, fontWeight: 700 }}>
                {p.name}
              </div>
              <div className="flex flex-none items-center" style={{ gap: 6 }}>
                <Toggle on={p.enabled} onToggle={() => updatePattern.mutate({ ...p, enabled: !p.enabled })} />
                <DeleteButton
                  label={s.remove}
                  confirmLabel={s.confirmRemove}
                  onConfirm={() => deletePattern.mutate(p.id)}
                />
              </div>
            </div>
            <div dir="ltr" style={{ fontSize: 11, color: "rgba(232,234,236,.35)" }}>
              sender: {p.sender_match}
            </div>
            <textarea
              defaultValue={p.body_regex}
              dir="ltr"
              rows={2}
              onBlur={(e) => {
                if (e.target.value !== p.body_regex) updatePattern.mutate({ ...p, body_regex: e.target.value });
              }}
              className="font-mono"
              style={TEXTAREA_STYLE}
            />
            <MiniButton tone="accent" onClick={() => setTestFor(testFor === p.id ? null : p.id)}>
              {s.testWithSample}
            </MiniButton>
            {testFor === p.id && (
              <div className="flex flex-col" style={{ gap: 8 }}>
                <textarea
                  value={sampleText}
                  onChange={(e) => setSampleText(e.target.value)}
                  rows={2}
                  placeholder={s.samplePlaceholder}
                  style={{ ...TEXTAREA_STYLE, fontSize: 12 }}
                />
                <MiniButton
                  tone="accent"
                  onClick={async () => {
                    try {
                      const res = await testPattern.mutateAsync({ id: p.id, sampleText });
                      setTestResult(JSON.stringify(res, null, 2));
                    } catch (err) {
                      setTestResult(err instanceof Error ? err.message : String(err));
                    }
                  }}
                >
                  {s.runTest}
                </MiniButton>
                {testResult && (
                  <pre
                    dir="ltr"
                    className="overflow-x-auto"
                    style={{ fontSize: 10, background: "rgba(0,0,0,.4)", borderRadius: 10, padding: 8 }}
                  >
                    {testResult}
                  </pre>
                )}
              </div>
            )}
          </div>
        ))}
      </Rows>

      <div style={{ height: 1, background: "rgba(255,255,255,.07)" }} />
      <div style={{ fontSize: 12, color: "rgba(232,234,236,.45)" }}>{s.addPatternLabel}</div>
      <Input value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder={s.namePlaceholder} />
      <Input
        value={form.sender_match}
        onChange={(v) => setForm({ ...form, sender_match: v })}
        placeholder={s.senderPlaceholder}
        dir="ltr"
      />
      <textarea
        placeholder={s.regexPlaceholder}
        dir="ltr"
        rows={2}
        value={form.body_regex}
        onChange={(e) => setForm({ ...form, body_regex: e.target.value })}
        className="font-mono"
        style={{ ...TEXTAREA_STYLE, background: "rgba(255,255,255,.05)", borderRadius: 12, padding: 10 }}
      />
      <SaveRow
        saveLabel={s.addPattern}
        cancelLabel={s.cancel}
        onSave={async () => {
          if (!form.name || !form.body_regex) return;
          await createPattern.mutateAsync({ ...form, amount_unit: "rial", enabled: true });
          setForm({ name: "", sender_match: "", body_regex: "" });
        }}
      />
    </Section>
  );
}

/* ------------------------------------------------------------------ *
 * Keyword rules
 * ------------------------------------------------------------------ */

function KeywordRulesSection() {
  const s = useS();
  const { data: rules } = useKeywordRules();
  const createRule = useCreateKeywordRuleMutation();
  const updateRule = useUpdateKeywordRuleMutation();
  const deleteRule = useDeleteKeywordRuleMutation();
  const [keyword, setKeyword] = useState("");
  const [direction, setDirection] = useState<Direction>("withdrawal");

  return (
    <Section title={s.keywordsTitle} hint={s.keywordsHint}>
      <Rows empty={s.none}>
        {(rules ?? []).map((r) => (
          <ListRow
            key={r.id}
            actions={
              <>
                <MiniButton
                  title={s.edit}
                  onClick={() =>
                    updateRule.mutate({
                      ...r,
                      direction: r.direction === "withdrawal" ? "deposit" : "withdrawal",
                    })
                  }
                >
                  {r.direction === "withdrawal" ? s.withdrawal : s.deposit}
                </MiniButton>
                <DeleteButton label={s.remove} confirmLabel={s.confirmRemove} onConfirm={() => deleteRule.mutate(r.id)} />
              </>
            }
          >
            <div className="truncate" style={{ fontSize: 13, fontWeight: 700 }}>
              {r.keyword}
            </div>
          </ListRow>
        ))}
      </Rows>

      <div className="flex" style={{ gap: 10 }}>
        <Field label={s.newKeyword}>
          <Input value={keyword} onChange={setKeyword} />
        </Field>
        <Field label={`${s.withdrawal} / ${s.deposit}`}>
          <Select
            value={direction}
            onChange={(v) => setDirection(v as Direction)}
            options={[
              { value: "withdrawal", label: s.withdrawal },
              { value: "deposit", label: s.deposit },
            ]}
          />
        </Field>
      </div>
      <SaveRow
        saveLabel={s.addKeyword}
        cancelLabel={s.cancel}
        onSave={async () => {
          if (!keyword) return;
          await createRule.mutateAsync({ keyword, direction });
          setKeyword("");
        }}
      />
    </Section>
  );
}
