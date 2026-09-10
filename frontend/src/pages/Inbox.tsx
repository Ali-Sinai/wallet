import { useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../components/shell/AppShell";
import { Card, EmptyNote, Field, Input, MiniButton, Select } from "../components/ui";
import MobileSmsCard from "../components/MobileSmsCard";
import { useI18n } from "../lib/i18n";
import { useIsDesktop } from "../lib/useMediaQuery";
import { accountLabel, categoryName } from "../lib/domain";
import {
  useAccounts,
  useCategories,
  useIgnoreSmsMutation,
  usePasteSmsMutation,
  useResolveSmsManuallyMutation,
  useSmsPatterns,
  useSmsPending,
  useSmsUnparsed,
} from "../lib/queries";
import type { Direction, SmsAttempt } from "../types";

/**
 * The SMS queues. The design bundle drew only the parsed inbox; the API also
 * exposes an unparsed queue, manual resolution, and pasting raw message text.
 */
export default function Inbox() {
  const { t } = useI18n();
  const isDesktop = useIsDesktop();
  const { data: pending } = useSmsPending();
  const { data: unparsed } = useSmsUnparsed();
  const { data: patterns } = useSmsPatterns();
  const items = pending ?? [];

  const content = (
    <>
      <div className="flex items-center justify-between">
        <div style={{ fontSize: 19, fontWeight: 700 }}>{t.inbox}</div>
        <Link to="/activity" style={{ fontSize: 11.5, color: "#0f9b6e" }}>
          {t.activity}
        </Link>
      </div>

      <PasteBox />

      {items.length === 0 && <EmptyNote pad={32}>{t.inboxEmpty}</EmptyNote>}

      <div className="flex flex-col" style={{ gap: 10, marginTop: 14 }}>
        {items.map((m) => (
          <MobileSmsCard key={m.id} attempt={m} variant="list" />
        ))}
      </div>

      {(unparsed?.length ?? 0) > 0 && (
        <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,.08)" }}>
          <div className="flex items-baseline justify-between">
            <div style={{ fontSize: 11.5, color: "rgba(232,234,236,.4)" }}>{t.unparsed}</div>
            <div style={{ fontSize: 11, color: "rgba(232,234,236,.35)" }}>{t.unparsedHint}</div>
          </div>
          <div className="flex flex-col" style={{ gap: 10, marginTop: 12 }}>
            {(unparsed ?? []).map((m) => (
              <UnparsedRow key={m.id} attempt={m} />
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,.08)" }}>
        <div className="flex items-baseline justify-between">
          <div style={{ fontSize: 11.5, color: "rgba(232,234,236,.4)" }}>{t.rules}</div>
          <Link to="/settings" style={{ fontSize: 11, color: "#0f9b6e" }}>
            {t.settings}
          </Link>
        </div>
        <div className="flex flex-col" style={{ gap: 8, marginTop: 10 }}>
          {(patterns ?? []).map((p) => (
            <div
              key={p.id}
              className="flex items-center"
              style={{ gap: 11, padding: "12px 13px", borderRadius: 14, background: "#101318" }}
            >
              <span
                className="flex-none"
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 99,
                  background: p.enabled ? "#0f9b6e" : "rgba(232,234,236,.25)",
                }}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate" style={{ fontSize: 12.5, fontWeight: 700 }}>
                  {p.name}
                </div>
                <div className="truncate" style={{ fontSize: 11, color: "rgba(232,234,236,.4)", marginTop: 2 }}>
                  {p.sender_match}
                </div>
              </div>
              <div style={{ fontSize: 11.5, color: "rgba(232,234,236,.5)" }}>{p.enabled ? t.on : t.off}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );

  return (
    <AppShell>
      {isDesktop ? (
        <Card className="fade-in" style={{ padding: 22 }}>
          {content}
        </Card>
      ) : (
        <div className="fade-in" style={{ padding: "10px 22px 0" }}>
          {content}
        </div>
      )}
    </AppShell>
  );
}

/** Paste raw bank SMS text; the server's patterns turn it into a pending attempt. */
function PasteBox() {
  const { t, digits } = useI18n();
  const paste = usePasteSmsMutation();
  const [text, setText] = useState("");
  const [sender, setSender] = useState("");
  const [result, setResult] = useState<string | null>(null);

  return (
    <div
      style={{ marginTop: 14, padding: 14, borderRadius: 16, background: "rgba(255,255,255,.04)" }}
    >
      <div style={{ fontSize: 12, fontWeight: 700 }}>{t.pasteSms}</div>
      <div style={{ fontSize: 11, color: "rgba(232,234,236,.4)", marginTop: 3 }}>{t.pasteHint}</div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        style={{
          width: "100%",
          marginTop: 10,
          fontSize: 12,
          background: "rgba(0,0,0,.3)",
          borderRadius: 12,
          padding: 10,
          color: "#e8eaec",
          border: "1px solid rgba(255,255,255,.07)",
          outline: "none",
        }}
      />
      <div className="flex items-end" style={{ gap: 8, marginTop: 8 }}>
        <Field label={t.senderHint}>
          <Input value={sender} onChange={setSender} dir="ltr" />
        </Field>
        <button
          type="button"
          onClick={async () => {
            if (!text.trim()) return;
            const created = await paste.mutateAsync({ text, senderHint: sender || "paste" });
            setResult(digits(created.length));
            setText("");
          }}
          style={{
            flex: "none",
            padding: "10px 16px",
            borderRadius: 12,
            background: "#0f9b6e",
            color: "#04120c",
            fontSize: 12.5,
            fontWeight: 700,
          }}
        >
          {t.parse}
        </button>
      </div>
      {result !== null && (
        <div style={{ fontSize: 11.5, color: "#3fd39a", marginTop: 8 }}>
          {result} · {t.detected}
        </div>
      )}
    </div>
  );
}

/** An unparsed message: the API can still turn it into a transaction by hand. */
function UnparsedRow({ attempt }: { attempt: SmsAttempt }) {
  const { t, fa, digits } = useI18n();
  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories();
  const resolve = useResolveSmsManuallyMutation();
  const ignore = useIgnoreSmsMutation();

  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [direction, setDirection] = useState<Direction>("withdrawal");
  const [accountId, setAccountId] = useState("");
  const [occurredAt, setOccurredAt] = useState(new Date().toISOString().slice(0, 16));
  const [categoryId, setCategoryId] = useState("");

  const effectiveAccount = accountId || String(accounts?.[0]?.id ?? "");

  return (
    <div style={{ padding: 14, borderRadius: 16, background: "#101318", border: "1px solid rgba(255,255,255,.07)" }}>
      <div
        style={{
          fontSize: 12,
          color: "rgba(232,234,236,.55)",
          lineHeight: 1.5,
          borderInlineStart: "2px solid rgba(255,122,107,.4)",
          paddingInlineStart: 10,
        }}
      >
        {attempt.merchant || attempt.sender}
      </div>

      <div className="flex" style={{ gap: 7, marginTop: 11 }}>
        <MiniButton tone="accent" onClick={() => setOpen(!open)}>
          {t.resolve}
        </MiniButton>
        <MiniButton onClick={() => ignore.mutate(attempt.id)}>{t.ignore}</MiniButton>
      </div>

      {open && (
        <div className="flex flex-col" style={{ gap: 10, marginTop: 12 }}>
          <div className="flex" style={{ gap: 10 }}>
            <Field label={t.amount}>
              <Input type="number" dir="ltr" value={amount} onChange={setAmount} />
            </Field>
            <Field label={t.in + " / " + t.out}>
              <Select
                value={direction}
                onChange={(v) => setDirection(v as Direction)}
                options={[
                  { value: "withdrawal", label: t.withdraw },
                  { value: "deposit", label: t.deposit },
                ]}
              />
            </Field>
          </div>
          <Field label={t.account}>
            <Select
              value={effectiveAccount}
              onChange={setAccountId}
              options={(accounts ?? []).map((a) => ({
                value: String(a.id),
                label: accountLabel(a, fa, digits),
              }))}
            />
          </Field>
          <div className="flex" style={{ gap: 10 }}>
            <Field label={t.date}>
              <Input type="datetime-local" dir="ltr" value={occurredAt} onChange={setOccurredAt} />
            </Field>
            <Field label={t.category}>
              <Select
                value={categoryId}
                onChange={setCategoryId}
                options={[
                  { value: "", label: t.uncategorized },
                  ...(categories ?? []).map((c) => ({ value: String(c.id), label: categoryName(c, fa, "") })),
                ]}
              />
            </Field>
          </div>
          <button
            type="button"
            onClick={() => {
              if (!amount || !effectiveAccount) return;
              resolve.mutate({
                id: attempt.id,
                amount_cents: Math.round(Number(amount) * 100),
                direction,
                account_id: Number(effectiveAccount),
                occurred_at: new Date(occurredAt).toISOString(),
                category_id: categoryId ? Number(categoryId) : null,
                note: null,
              });
            }}
            style={{
              textAlign: "center",
              padding: "11px 0",
              borderRadius: 12,
              background: "#0f9b6e",
              color: "#04120c",
              fontSize: 12.5,
              fontWeight: 700,
            }}
          >
            {t.saveTx}
          </button>
        </div>
      )}
    </div>
  );
}
