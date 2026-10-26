import { useState, type ReactNode } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Input as UiInput } from "@/components/ui/input";
import AppShell from "../components/shell/AppShell";
import { ActionButton, DARK_LABEL, DeleteButton, Field, Input, ListRow, MiniButton, Select, Toggle } from "@/components/primitives";
import { PageBody, PageTitle } from "../designs/Page";
import { useFamily } from "../lib/theme";
import { APP_ICONS, appIconUrl, readAppIcon, setAppIcon, type AppIconId } from "../lib/appIcon";
import { useIsDesktop } from "@/hooks/use-media-query";
import { useI18n } from "../lib/i18n";
import { useAuth } from "../lib/auth";
import { S, type SettingsStrings } from "../lib/settingsStrings";
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
import type { Direction, PatternKind } from "../types";

function useS() {
  const { lang } = useI18n();
  return S[lang];
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  const family = useFamily();
  if (family === "dark") {
    // Wallet Dark: no box — a hairline, a small-caps label, the rows.
    return (
      <div style={{ paddingTop: 22, borderTop: "1px solid rgb(var(--ink-rgb) / .12)" }}>
        <div style={DARK_LABEL}>{title}</div>
        {hint && <div style={{ fontSize: 12, color: "rgb(var(--fg-rgb) / .4)", marginTop: 8 }}>{hint}</div>}
        <div className="flex flex-col" style={{ gap: 14, marginTop: 14 }}>
          {children}
        </div>
      </div>
    );
  }
  if (family === "soft") {
    return (
      <div className="soft-card" style={{ padding: 20, borderRadius: 22, background: "var(--c-surface)", boxShadow: "0 6px 18px rgba(0,0,0,.05)" }}>
        <div style={{ fontSize: 17, fontWeight: 600 }}>{title}</div>
        {hint && <div style={{ fontSize: 12, color: "rgb(var(--fg-rgb) / .55)", marginTop: 4 }}>{hint}</div>}
        <div className="flex flex-col" style={{ gap: 12, marginTop: 16 }}>
          {children}
        </div>
      </div>
    );
  }
  return (
    <div style={{ padding: 22, borderRadius: 20, background: "var(--c-surface)", border: "1px solid rgb(var(--ink-rgb) / .07)" }}>
      <div style={{ fontSize: 15, fontWeight: 700 }}>{title}</div>
      {hint && <div style={{ fontSize: 11.5, color: "rgb(var(--fg-rgb) / .45)", marginTop: 4 }}>{hint}</div>}
      <div className="flex flex-col" style={{ gap: 12, marginTop: 14 }}>
        {children}
      </div>
    </div>
  );
}

function Rows({ children, empty }: { children: ReactNode[]; empty: string }) {
  const rows = children.filter(Boolean);
  if (rows.length === 0) {
    return <div style={{ fontSize: 12, color: "rgb(var(--fg-rgb) / .35)", padding: "6px 0" }}>{empty}</div>;
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
  busy = false,
}: {
  onSave: () => void;
  onCancel?: () => void;
  saveLabel: string;
  cancelLabel: string;
  busy?: boolean;
}) {
  return (
    <div className="flex" style={{ gap: 8 }}>
      <ActionButton onClick={onSave} busy={busy} grow>
        {saveLabel}
      </ActionButton>
      {onCancel && (
        <ActionButton tone="outline" onClick={onCancel}>
          {cancelLabel}
        </ActionButton>
      )}
    </div>
  );
}

export default function Settings() {
  const s = useS();
  const family = useFamily();
  const wide = useIsDesktop();

  if (family !== "classic") {
    return (
      <AppShell sidebar={false}>
        <PageBody maxWidth={1100}>
          <PageTitle title={s.title} />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: wide ? "repeat(auto-fit,minmax(340px,1fr))" : "minmax(0,1fr)",
              gap: family === "dark" ? "40px 56px" : 16,
              alignItems: "start",
              marginTop: family === "dark" ? 36 : 22,
            }}
          >
            <SettingsSections />
          </div>
          <div className="flex flex-col" style={{ gap: 18, marginTop: 32 }}>
            <LogoutRow />
            <IconCredit />
          </div>
        </PageBody>
      </AppShell>
    );
  }

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
          <SettingsSections />
        </div>
        <LogoutRow />
        <IconCredit />
      </div>
    </AppShell>
  );
}

function SettingsSections() {
  return (
    <>
      <GeneralSection />
      <AppIconSection />
      <AccountsSection />
      <CategoriesSection />
      <BudgetsSection />
      <PeopleSection />
      <PushSection />
      <WebhookSection />
      <SmsPatternsSection />
      <KeywordRulesSection />
    </>
  );
}

/** Flaticon's free license requires attribution for the tab bar icons. */
function IconCredit() {
  const s = useS();
  const link = { color: "rgb(var(--fg-rgb) / .55)", textDecoration: "underline" };
  return (
    <div style={{ fontSize: 11, color: "rgb(var(--fg-rgb) / .35)" }}>
      {s.iconCredit}{" "}
      <a href="https://www.flaticon.com/authors/rajan-pyakurel" target="_blank" rel="noreferrer" style={link}>
        Rajan Pyakurel
      </a>{" "}
      –{" "}
      <a href="https://www.flaticon.com/" target="_blank" rel="noreferrer" style={link}>
        Flaticon
      </a>
    </div>
  );
}

function LogoutRow() {
  const s = useS();
  const { logout } = useAuth();
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex">
      <ActionButton
        tone="danger"
        busy={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await logout();
          } finally {
            setBusy(false);
          }
        }}
      >
        {s.logout}
      </ActionButton>
    </div>
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
        busy={update.isPending}
        onSave={() => {
          update.mutate({ default_lang: effectiveLang, digit_style: effectiveDigits });
          if (effectiveLang === "fa" || effectiveLang === "en") setLang(effectiveLang);
        }}
      />
    </Section>
  );
}

/* ------------------------------------------------------------------ *
 * App icon — per device, like the theme
 * ------------------------------------------------------------------ */

const APP_ICON_LABEL = {
  default: "appIconDefault",
  dark: "appIconDark",
  clear: "appIconClear",
  tinted: "appIconTinted",
  "tinted-red": "appIconTintedRed",
} as const satisfies Record<AppIconId, keyof SettingsStrings>;

function AppIconSection() {
  const s = useS();
  const [icon, setIcon] = useState<AppIconId>(readAppIcon);

  return (
    <Section title={s.appIcon} hint={s.appIconHint}>
      <div className="flex flex-wrap" style={{ gap: 10 }}>
        {APP_ICONS.map((id) => (
          <button
            key={id}
            type="button"
            aria-pressed={icon === id}
            onClick={() => {
              setIcon(id);
              void setAppIcon(id);
            }}
            className="flex flex-col items-center"
            style={{
              gap: 6,
              padding: 10,
              borderRadius: 14,
              border: `2px solid ${icon === id ? "var(--c-primary)" : "rgb(var(--ink-rgb) / .1)"}`,
              fontSize: 11.5,
            }}
          >
            <img src={appIconUrl(id)} alt="" width={52} height={52} style={{ borderRadius: 12 }} />
            {s[APP_ICON_LABEL[id]]}
          </button>
        ))}
      </div>
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
    if (editing === null) create.mutate(form, { onSuccess: reset });
    else update.mutate({ id: editing, ...form }, { onSuccess: reset });
  }

  // The row toggles also use `update`; only spin Save for the account being edited.
  const saving = create.isPending || (update.isPending && update.variables?.id === editing);

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
                <DeleteButton
                  label={s.remove}
                  confirmLabel={s.confirmRemove}
                  onConfirm={() => remove.mutate(a.id)}
                  busy={remove.isPending && remove.variables === a.id}
                />
              </>
            }
          >
            <div className="truncate" style={{ fontSize: 13, fontWeight: 700 }}>
              {(fa ? a.name_fa : a.name_en) || a.bank_name}
            </div>
            <div style={{ fontSize: 11, color: "rgb(var(--fg-rgb) / .4)", marginTop: 2 }}>
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
        busy={saving}
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
  color: "var(--c-primary)",
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
    if (editing === null) create.mutate(form, { onSuccess: reset });
    else update.mutate({ id: editing, ...form }, { onSuccess: reset });
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
                <DeleteButton
                  label={s.remove}
                  confirmLabel={s.confirmRemove}
                  onConfirm={() => remove.mutate(c.id)}
                  busy={remove.isPending && remove.variables === c.id}
                />
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
          <UiInput
            type="color"
            className="h-auto"
            value={form.color}
            onChange={(e) => setForm({ ...form, color: e.target.value })}
            style={{
              width: "100%",
              height: 38,
              borderRadius: 12,
              background: "rgb(var(--ink-rgb) / .05)",
              border: "1px solid rgb(var(--ink-rgb) / .09)",
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
        busy={create.isPending || update.isPending}
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
    if (editing === null) create.mutate(body, { onSuccess: reset });
    else update.mutate({ id: editing, ...body }, { onSuccess: reset });
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
                  <DeleteButton
                    label={s.remove}
                    confirmLabel={s.confirmRemove}
                    onConfirm={() => remove.mutate(b.id)}
                    busy={remove.isPending && remove.variables === b.id}
                  />
                </>
              }
            >
              <div className="truncate" style={{ fontSize: 13, fontWeight: 700 }}>
                {categoryName(category, fa, "—")}
              </div>
              <div style={{ fontSize: 11, color: "rgb(var(--fg-rgb) / .4)", marginTop: 2 }}>
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
        busy={create.isPending || update.isPending}
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
    if (editing === null) create.mutate(body, { onSuccess: reset });
    else update.mutate({ id: editing, ...body }, { onSuccess: reset });
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
                <DeleteButton
                  label={s.remove}
                  confirmLabel={s.confirmRemove}
                  onConfirm={() => remove.mutate(p.id)}
                  busy={remove.isPending && remove.variables === p.id}
                />
              </>
            }
          >
            <div className="truncate" style={{ fontSize: 13, fontWeight: 700 }}>
              {p.name}
            </div>
            {p.contact_note && (
              <div className="truncate" style={{ fontSize: 11, color: "rgb(var(--fg-rgb) / .4)", marginTop: 2 }}>
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
        busy={create.isPending || update.isPending}
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
  const [enabling, setEnabling] = useState(false);
  const [threshold, setThreshold] = useState<string>("");
  const [frequency, setFrequency] = useState<string>("");

  const effectiveThreshold = threshold || String(notif?.uncategorized_threshold ?? 5);
  const effectiveFrequency = frequency || notif?.summary_frequency || "weekly";
  const canEnable = isFirebaseConfigured && Boolean(status?.enabled);

  async function onEnable() {
    setMessage(null);
    setEnabling(true);
    try {
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
    } finally {
      setEnabling(false);
    }
  }

  return (
    <Section title={s.notifications} hint={status?.enabled ? s.pushReady : s.pushNotReady}>
      <ActionButton onClick={onEnable} disabled={!canEnable} busy={enabling}>
        {s.enablePush}
      </ActionButton>
      {!isFirebaseConfigured && (
        <div style={{ fontSize: 11, color: "rgb(var(--fg-rgb) / .45)" }}>{s.firebaseIncomplete}</div>
      )}
      {message && <div style={{ fontSize: 11.5, color: "var(--c-primary)" }}>{message}</div>}

      <div style={{ height: 1, background: "rgb(var(--ink-rgb) / .07)" }} />

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
        busy={updateNotif.isPending}
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
      <div className="flex">
        <ActionButton
          tone="outline"
          grow
          busy={rotate.isPending}
          onClick={async () => {
            const res = await rotate.mutateAsync();
            setToken(res.token);
          }}
        >
          {s.generateToken}
        </ActionButton>
      </div>
      {token && (
        <div
          className="select-all break-all font-mono"
          dir="ltr"
          style={{ padding: 12, borderRadius: 12, background: "rgb(var(--ink-rgb) / .05)", fontSize: 11 }}
        >
          {token}
          <div dir="auto" style={{ fontSize: 10.5, color: "var(--c-expense)", marginTop: 8 }}>
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
  background: "var(--c-well)",
  borderRadius: 10,
  padding: 8,
  color: "var(--c-fg)",
  border: "1px solid rgb(var(--ink-rgb) / .07)",
  outline: "none",
} as const;

function SmsPatternsSection() {
  const s = useS();
  const { data: patterns } = useSmsPatterns();
  const createPattern = useCreateSmsPatternMutation();
  const updatePattern = useUpdateSmsPatternMutation();
  const deletePattern = useDeleteSmsPatternMutation();
  const testPattern = useTestSmsPatternMutation();

  const [form, setForm] = useState<{
    name: string;
    sender_match: string;
    body_regex: string;
    kind: PatternKind;
  }>({ name: "", sender_match: "", body_regex: "", kind: "transaction" });
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
            style={{ gap: 8, padding: 12, borderRadius: 14, background: "rgb(var(--ink-rgb) / .04)" }}
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
                  busy={deletePattern.isPending && deletePattern.variables === p.id}
                />
              </div>
            </div>
            <div className="flex items-center" style={{ gap: 6 }}>
              <div dir="ltr" className="min-w-0 truncate" style={{ fontSize: 11, color: "rgb(var(--fg-rgb) / .35)" }}>
                sender: {p.sender_match}
              </div>
              {p.kind === "otp" && (
                <span
                  className="flex-none"
                  style={{
                    fontSize: 10,
                    padding: "2px 7px",
                    borderRadius: 99,
                    background: "rgba(224,150,40,.15)",
                    color: "#e0a628",
                  }}
                >
                  {s.otpKind}
                </span>
              )}
            </div>
            <Textarea
              defaultValue={p.body_regex}
              dir="ltr"
              rows={2}
              onBlur={(e) => {
                if (e.target.value !== p.body_regex) updatePattern.mutate({ ...p, body_regex: e.target.value });
              }}
              className="inline-block min-h-0 field-sizing-fixed font-mono leading-[1.5] md:text-[11px]"
              style={TEXTAREA_STYLE}
            />
            <MiniButton tone="accent" onClick={() => setTestFor(testFor === p.id ? null : p.id)}>
              {s.testWithSample}
            </MiniButton>
            {testFor === p.id && (
              <div className="flex flex-col" style={{ gap: 8 }}>
                <Textarea
                  className="inline-block min-h-0 field-sizing-fixed leading-[1.5] md:text-xs"
                  value={sampleText}
                  onChange={(e) => setSampleText(e.target.value)}
                  rows={2}
                  placeholder={s.samplePlaceholder}
                  style={{ ...TEXTAREA_STYLE, fontSize: 12 }}
                />
                <MiniButton
                  tone="accent"
                  busy={testPattern.isPending}
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
                    style={{ fontSize: 10, background: "var(--c-well)", borderRadius: 10, padding: 8 }}
                  >
                    {testResult}
                  </pre>
                )}
              </div>
            )}
          </div>
        ))}
      </Rows>

      <div style={{ height: 1, background: "rgb(var(--ink-rgb) / .07)" }} />
      <div style={{ fontSize: 12, color: "rgb(var(--fg-rgb) / .45)" }}>{s.addPatternLabel}</div>
      <Select
        value={form.kind}
        onChange={(v) => setForm({ ...form, kind: v as PatternKind })}
        options={[
          { value: "transaction", label: s.transactionKind },
          { value: "otp", label: s.otpKind },
        ]}
      />
      <div style={{ fontSize: 11, color: "rgb(var(--fg-rgb) / .4)" }}>
        {form.kind === "otp" ? s.otpKindHint : s.transactionKindHint}
      </div>
      <Input value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder={s.namePlaceholder} />
      <Input
        value={form.sender_match}
        onChange={(v) => setForm({ ...form, sender_match: v })}
        placeholder={s.senderPlaceholder}
        dir="ltr"
      />
      <Textarea
        placeholder={form.kind === "otp" ? s.otpRegexPlaceholder : s.regexPlaceholder}
        dir="ltr"
        rows={2}
        value={form.body_regex}
        onChange={(e) => setForm({ ...form, body_regex: e.target.value })}
        className="inline-block min-h-0 field-sizing-fixed font-mono leading-[1.5] md:text-[11px]"
        style={{ ...TEXTAREA_STYLE, background: "rgb(var(--ink-rgb) / .05)", borderRadius: 12, padding: 10 }}
      />
      <SaveRow
        saveLabel={s.addPattern}
        cancelLabel={s.cancel}
        busy={createPattern.isPending}
        onSave={async () => {
          if (!form.name || !form.body_regex) return;
          await createPattern.mutateAsync({ ...form, amount_unit: "rial", enabled: true });
          setForm({ name: "", sender_match: "", body_regex: "", kind: "transaction" });
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
                  busy={updateRule.isPending && updateRule.variables?.id === r.id}
                  onClick={() =>
                    updateRule.mutate({
                      ...r,
                      direction: r.direction === "withdrawal" ? "deposit" : "withdrawal",
                    })
                  }
                >
                  {r.direction === "withdrawal" ? s.withdrawal : s.deposit}
                </MiniButton>
                <DeleteButton
                  label={s.remove}
                  confirmLabel={s.confirmRemove}
                  onConfirm={() => deleteRule.mutate(r.id)}
                  busy={deleteRule.isPending && deleteRule.variables === r.id}
                />
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
        busy={createRule.isPending}
        onSave={async () => {
          if (!keyword) return;
          await createRule.mutateAsync({ keyword, direction });
          setKeyword("");
        }}
      />
    </Section>
  );
}
