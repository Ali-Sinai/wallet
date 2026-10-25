import { useState } from "react";
import { DateTimeField } from "@/components/DateFields";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "react-router-dom";
import AppShell from "../components/shell/AppShell";
import { ActionButton, Card, DARK_LABEL, EmptyNote, Field, Input, ListRow, MiniButton, Select } from "@/components/primitives";
import { PageBody, PageTitle } from "../designs/Page";
import { useFamily } from "../lib/theme";
import type { ReactNode } from "react";
import MobileSmsCard from "../components/MobileSmsCard";
import { useI18n } from "../lib/i18n";
import { useIsDesktop } from "@/hooks/use-media-query";
import { accountLabel, categoryName } from "../lib/domain";
import {
  useAccounts,
  useCategories,
  useDeleteSellerHintMutation,
  useIgnoreSmsMutation,
  usePasteSmsMutation,
  useResolveSmsManuallyMutation,
  useSellerHints,
  useSmsPatterns,
  useSmsPending,
  useSmsUnparsed,
} from "../lib/queries";
import type { Direction, SellerHint, SmsAttempt } from "../types";

/**
 * The SMS queues. The design bundle drew only the parsed inbox; the API also
 * exposes an unparsed queue, manual resolution, and pasting raw message text.
 */
export default function Inbox() {
  const { t } = useI18n();
  const isDesktop = useIsDesktop();
  const { data: pending } = useSmsPending();
  const { data: unparsed } = useSmsUnparsed();
  const { data: hints } = useSellerHints();
  const { data: patterns } = useSmsPatterns();
  const items = pending ?? [];
  const family = useFamily();

  const content = (
    <>
      <PageTitle
        title={t.inbox}
        right={
          <Link to="/activity" style={{ fontSize: family === "classic" ? 11.5 : 12.5, color: "var(--c-accent)" }}>
            {t.activity}
          </Link>
        }
      />

      <PasteBox />

      {items.length === 0 && <EmptyNote pad={32}>{t.inboxEmpty}</EmptyNote>}

      <div className="flex flex-col" style={{ gap: family === "dark" ? 0 : family === "soft" ? 12 : 10, marginTop: 14 }}>
        {items.map((m) => (
          <MobileSmsCard key={m.id} attempt={m} variant="list" />
        ))}
      </div>

      {(hints?.length ?? 0) > 0 && (
        <InboxSection title={t.sellerHints} aside={t.sellerHintsHint}>
          {(hints ?? []).map((h) => (
            <SellerHintRow key={h.id} hint={h} />
          ))}
        </InboxSection>
      )}

      {(unparsed?.length ?? 0) > 0 && (
        <InboxSection title={t.unparsed} aside={t.unparsedHint}>
          {(unparsed ?? []).map((m) => (
            <UnparsedRow key={m.id} attempt={m} />
          ))}
        </InboxSection>
      )}

      <InboxSection
        title={t.rules}
        aside={
          <Link to="/settings" style={{ fontSize: 11.5, color: "var(--c-accent)" }}>
            {t.settings}
          </Link>
        }
      >
          {(patterns ?? []).map((p) => (
            <ListRow key={p.id} actions={<div style={{ fontSize: 11.5, color: "rgb(var(--fg-rgb) / .5)" }}>{p.enabled ? t.on : t.off}</div>}>
              <div className="flex items-center" style={{ gap: 11 }}>
              <span
                className="flex-none"
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 99,
                  background: p.enabled ? "var(--c-primary)" : "rgb(var(--fg-rgb) / .25)",
                }}
              />
              <div className="min-w-0 flex-1">
                <div className="truncate" style={{ fontSize: 12.5, fontWeight: 700 }}>
                  {p.name}
                </div>
                <div className="truncate" style={{ fontSize: 11, color: "rgb(var(--fg-rgb) / .4)", marginTop: 2 }}>
                  {p.sender_match}
                </div>
              </div>
              </div>
            </ListRow>
          ))}
      </InboxSection>
    </>
  );

  if (family !== "classic") {
    return (
      <AppShell>
        <PageBody maxWidth={820}>{content}</PageBody>
      </AppShell>
    );
  }

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
  const family = useFamily();
  const box =
    family === "dark"
      ? { marginTop: 28 }
      : family === "soft"
        ? { marginTop: 22, padding: 18, borderRadius: 22, background: "var(--c-surface)", boxShadow: "0 6px 18px rgba(0,0,0,.05)" }
        : { marginTop: 14, padding: 14, borderRadius: 16, background: "rgb(var(--ink-rgb) / .04)" };

  return (
    <div className="soft-card" style={box}>
      <div style={family === "dark" ? DARK_LABEL : { fontSize: family === "soft" ? 15 : 12, fontWeight: family === "soft" ? 600 : 700 }}>
        {t.pasteSms}
      </div>
      <div style={{ fontSize: 11, color: "rgb(var(--fg-rgb) / .4)", marginTop: 3 }}>{t.pasteHint}</div>
      <Textarea
        className="inline-block min-h-0 field-sizing-fixed leading-[1.5] md:text-xs"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        style={{
          width: "100%",
          marginTop: 10,
          fontSize: 12,
          background: "var(--c-well)",
          borderRadius: 12,
          padding: 10,
          color: "var(--c-fg)",
          border: "1px solid rgb(var(--ink-rgb) / .07)",
          outline: "none",
        }}
      />
      <div className="flex items-end" style={{ gap: 8, marginTop: 8 }}>
        <Field label={t.senderHint}>
          <Input value={sender} onChange={setSender} dir="ltr" />
        </Field>
        <ActionButton
          tone={family === "classic" ? "primary" : "outline"}
          busy={paste.isPending}
          onClick={async () => {
            if (!text.trim()) return;
            const created = await paste.mutateAsync({ text, senderHint: sender || "paste" });
            setResult(digits(created.length));
            setText("");
          }}
        >
          {t.parse}
        </ActionButton>
      </div>
      {result !== null && (
        <div style={{ fontSize: 11.5, color: "var(--c-income)", marginTop: 8 }}>
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
  const [occurredAt, setOccurredAt] = useState(() => new Date());
  const [categoryId, setCategoryId] = useState("");

  const effectiveAccount = accountId || String(accounts?.[0]?.id ?? "");
  const family = useFamily();
  const box =
    family === "dark"
      ? { padding: "16px 0", borderBottom: "1px solid rgb(var(--ink-rgb) / .08)" }
      : family === "soft"
        ? { padding: 16, borderRadius: 22, background: "var(--c-surface)", boxShadow: "0 6px 18px rgba(0,0,0,.05)" }
        : { padding: 14, borderRadius: 16, background: "var(--c-surface-2)", border: "1px solid rgb(var(--ink-rgb) / .07)" };

  return (
    <div className="soft-card" style={box}>
      <div style={{ fontSize: 11, color: "rgb(var(--fg-rgb) / .35)" }}>{attempt.sender}</div>
      <div
        style={{
          fontSize: 12,
          color: "rgb(var(--fg-rgb) / .55)",
          lineHeight: 1.5,
          marginTop: 6,
          borderInlineStart: "2px solid rgb(var(--expense-rgb) / .4)",
          paddingInlineStart: 10,
          // The message no pattern could read, exactly as it arrived — line
          // breaks and all, since that shape is half of what a new regex
          // has to match.
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {attempt.raw_body || attempt.merchant || attempt.sender}
      </div>

      <div className="flex" style={{ gap: 7, marginTop: 11 }}>
        <MiniButton tone="accent" onClick={() => setOpen(!open)}>
          {t.resolve}
        </MiniButton>
        <MiniButton onClick={() => ignore.mutate(attempt.id)} busy={ignore.isPending}>
          {t.ignore}
        </MiniButton>
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
              <DateTimeField value={occurredAt} onChange={setOccurredAt} />
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
          <ActionButton
            busy={resolve.isPending}
            onClick={() => {
              if (!amount || !effectiveAccount) return;
              resolve.mutate({
                id: attempt.id,
                amount_cents: Math.round(Number(amount) * 100),
                direction,
                account_id: Number(effectiveAccount),
                occurred_at: occurredAt.toISOString(),
                category_id: categoryId ? Number(categoryId) : null,
                note: null,
              });
            }}
          >
            {t.saveTx}
          </ActionButton>
        </div>
      )}
    </div>
  );
}

/**
 * A store an OTP message named, still waiting for its purchase. Withdrawals
 * claim these on their own; the row is here so a merchant that shows up on a
 * transaction is explainable, and droppable when the purchase never happened.
 */
function SellerHintRow({ hint }: { hint: SellerHint }) {
  const { t, money } = useI18n();
  const drop = useDeleteSellerHintMutation();

  return (
    <ListRow
      actions={
        <MiniButton onClick={() => drop.mutate(hint.id)} busy={drop.isPending}>
          {t.ignore}
        </MiniButton>
      }
    >
      <div className="truncate" style={{ fontSize: 12.5, fontWeight: 700 }}>
        {hint.seller}
      </div>
      <div style={{ fontSize: 11, color: "rgb(var(--fg-rgb) / .4)", marginTop: 2 }}>
        {hint.amount_cents !== null ? money(hint.amount_cents, true) : hint.sender}
      </div>
    </ListRow>
  );
}

/** A titled block of the inbox, in each design's section style. */
function InboxSection({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  const family = useFamily();
  const head =
    family === "dark" ? (
      <span style={DARK_LABEL}>{title}</span>
    ) : family === "soft" ? (
      <span style={{ fontSize: 17, fontWeight: 600 }}>{title}</span>
    ) : (
      <div style={{ fontSize: 11.5, color: "rgb(var(--fg-rgb) / .4)" }}>{title}</div>
    );
  return (
    <div
      style={
        family === "classic"
          ? { marginTop: 18, paddingTop: 14, borderTop: "1px solid rgb(var(--ink-rgb) / .08)" }
          : { marginTop: family === "dark" ? 40 : 26 }
      }
    >
      <div className="flex items-baseline justify-between" style={{ gap: 12 }}>
        {head}
        {typeof aside === "string" ? <div style={{ fontSize: 11, color: "rgb(var(--fg-rgb) / .38)", textAlign: "end" }}>{aside}</div> : aside}
      </div>
      <div className="flex flex-col" style={{ gap: family === "dark" ? 0 : family === "soft" ? 10 : 8, marginTop: 12 }}>
        {children}
      </div>
    </div>
  );
}
