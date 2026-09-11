import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../../lib/i18n";
import { useModals } from "../../lib/modals";
import { api } from "../../lib/api";
import {
  useCategories,
  useConfirmSmsMutation,
  useIgnoreSmsMutation,
  usePeopleBalances,
  useSmsPatterns,
  useSmsPending,
  useSmsUnparsed,
  useUpdateSmsPatternMutation,
} from "../../lib/queries";
import { categoryName, initials } from "../../lib/domain";
import { Avatar, BusyLabel, Chip, Toggle } from "../ui";
import type { Transaction } from "../../types";

export default function Sidebar() {
  return (
    <div className="flex min-w-0 flex-col" style={{ gap: 16 }}>
      <SmsInboxCard />
      <PeopleCard />
      <BankRulesCard />
    </div>
  );
}

function SmsInboxCard() {
  const { t, fa, digits, money } = useI18n();
  const { data: pending } = useSmsPending();
  const { data: categories } = useCategories();
  const confirm = useConfirmSmsMutation();
  const ignore = useIgnoreSmsMutation();
  const { openSplit } = useModals();
  const { data: unparsed } = useSmsUnparsed();
  const navigate = useNavigate();
  const [picked, setPicked] = useState<Record<number, number>>({});

  const items = pending ?? [];
  const unparsedCount = unparsed?.length ?? 0;

  const [splittingId, setSplittingId] = useState<number | null>(null);

  async function confirmThenSplit(id: number) {
    setSplittingId(id);
    try {
      const res = await confirm.mutateAsync({ id, categoryId: picked[id] ?? null });
      const txId = (res as { transaction_id?: number }).transaction_id;
      if (!txId) return;
      const tx = await api.get<Transaction>(`/transactions/${txId}`);
      openSplit(tx);
    } finally {
      setSplittingId(null);
    }
  }

  return (
    <div
      style={{
        padding: 18,
        borderRadius: 20,
        background: "#101a16",
        border: "1px solid rgba(15,155,110,.32)",
      }}
    >
      <div className="flex items-center justify-between">
        <div style={{ fontSize: 12, fontWeight: 700, color: "#3fd39a" }}>{t.detected}</div>
        <button type="button" onClick={() => navigate("/inbox")} style={{ fontSize: 11.5, color: "rgba(232,234,236,.4)" }}>
          {items.length ? `${digits(items.length)} ${t.pending} ` : ""}
          {t.all}
        </button>
      </div>

      {unparsedCount > 0 && (
        <button
          type="button"
          onClick={() => navigate("/inbox")}
          className="flex w-full items-center justify-between"
          style={{
            marginTop: 12,
            padding: "9px 12px",
            borderRadius: 12,
            background: "rgba(255,122,107,.08)",
            border: "1px solid rgba(255,122,107,.3)",
            fontSize: 11.5,
            fontWeight: 700,
            color: "#ff7a6b",
          }}
        >
          <span>{t.unparsed}</span>
          <span>{digits(unparsedCount)}</span>
        </button>
      )}

      {items.length === 0 ? (
        <div style={{ padding: "20px 0 6px", textAlign: "center", fontSize: 12, color: "rgba(232,234,236,.4)" }}>
          {t.inboxEmpty}
        </div>
      ) : (
        <div className="flex flex-col" style={{ gap: 14, marginTop: 14 }}>
          {items.map((m) => {
            const signed = m.amount_cents === null ? 0 : m.direction === "withdrawal" ? -m.amount_cents : m.amount_cents;
            const splitting = splittingId === m.id;
            const confirming = confirm.isPending && confirm.variables?.id === m.id && !splitting;
            const ignoring = ignore.isPending && ignore.variables === m.id;
            const busy = confirming || splitting || ignoring;
            return (
              <div key={m.id} style={{ padding: 14, borderRadius: 16, background: "rgba(255,255,255,.035)" }}>
                <div
                  style={{
                    fontSize: 11.5,
                    color: "rgba(232,234,236,.55)",
                    lineHeight: 1.5,
                    borderInlineStart: "2px solid rgba(63,211,154,.4)",
                    paddingInlineStart: 10,
                  }}
                >
                  {m.merchant || m.sender}
                </div>

                <div className="flex items-baseline" style={{ gap: 6, marginTop: 11 }}>
                  <span
                    style={{
                      fontSize: 20,
                      fontWeight: 700,
                      color: m.direction === "withdrawal" ? "#ff7a6b" : "#3fd39a",
                    }}
                  >
                    {m.amount_cents === null ? "—" : money(signed, true)}
                  </span>
                  <span style={{ fontSize: 11, color: "rgba(232,234,236,.4)" }}>
                    {(m.direction === "withdrawal" ? t.withdraw : t.deposit) +
                      (m.account_last4 ? ` · ····${digits(m.account_last4)}` : "")}
                  </span>
                </div>

                <div className="flex flex-wrap" style={{ gap: 6, marginTop: 11 }}>
                  {categories?.slice(0, 8).map((c) => (
                    <Chip
                      key={c.id}
                      active={picked[m.id] === c.id}
                      onClick={() => setPicked((p) => ({ ...p, [m.id]: c.id }))}
                      className="px-[11px] py-[6px] !text-[11.5px]"
                    >
                      {categoryName(c, fa, "")}
                    </Chip>
                  ))}
                </div>

                <div className="flex" style={{ gap: 6, marginTop: 12 }}>
                  <button
                    type="button"
                    onClick={() => confirm.mutate({ id: m.id, categoryId: picked[m.id] ?? null })}
                    disabled={busy}
                    aria-busy={confirming}
                    style={{
                      flex: 1,
                      textAlign: "center",
                      padding: "9px 0",
                      borderRadius: 11,
                      background: "#0f9b6e",
                      color: "#04120c",
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    <BusyLabel busy={confirming}>{t.confirm}</BusyLabel>
                  </button>
                  <button
                    type="button"
                    onClick={() => confirmThenSplit(m.id)}
                    disabled={busy}
                    aria-busy={splitting}
                    style={{
                      padding: "9px 12px",
                      borderRadius: 11,
                      border: "1px solid rgba(255,255,255,.14)",
                      fontSize: 12,
                      color: "rgba(232,234,236,.8)",
                    }}
                  >
                    <BusyLabel busy={splitting}>{t.split}</BusyLabel>
                  </button>
                  <button
                    type="button"
                    onClick={() => ignore.mutate(m.id)}
                    disabled={busy}
                    aria-busy={ignoring}
                    style={{
                      padding: "9px 12px",
                      borderRadius: 11,
                      border: "1px solid rgba(255,255,255,.14)",
                      fontSize: 12,
                      color: "rgba(232,234,236,.5)",
                    }}
                  >
                    <BusyLabel busy={ignoring}>{t.ignore}</BusyLabel>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PeopleCard() {
  const { t, money } = useI18n();
  const { data: balances } = usePeopleBalances();
  const navigate = useNavigate();

  return (
    <div style={{ padding: 18, borderRadius: 20, background: "#0e1110", border: "1px solid rgba(255,255,255,.07)" }}>
      <div className="flex items-baseline justify-between">
        <div style={{ fontSize: 13, fontWeight: 700 }}>{t.people}</div>
        <button type="button" onClick={() => navigate("/people")} style={{ fontSize: 11.5, color: "#0f9b6e" }}>
          {t.all}
        </button>
      </div>
      <div className="flex flex-col" style={{ gap: 9, marginTop: 12 }}>
        {(balances ?? []).map((p) => {
          const color =
            p.net_cents > 0 ? "#3fd39a" : p.net_cents < 0 ? "#ff7a6b" : "rgba(232,234,236,.45)";
          return (
            <div key={p.person_id} className="flex items-center" style={{ gap: 10 }}>
              <Avatar size={30} color={color}>
                {initials(p.name)}
              </Avatar>
              <div className="min-w-0 flex-1 truncate" style={{ fontSize: 12.5, fontWeight: 700 }}>
                {p.name}
              </div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color }}>
                {p.net_cents === 0 ? t.settled : money(p.net_cents, true)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BankRulesCard() {
  const { t } = useI18n();
  const { data: patterns } = useSmsPatterns();
  const update = useUpdateSmsPatternMutation();

  return (
    <div style={{ padding: 18, borderRadius: 20, background: "#0e1110", border: "1px solid rgba(255,255,255,.07)" }}>
      <div style={{ fontSize: 13, fontWeight: 700 }}>{t.rules}</div>
      <div style={{ fontSize: 11.5, color: "rgba(232,234,236,.4)", marginTop: 3 }}>{t.rulesHint}</div>
      <div className="flex flex-col" style={{ gap: 10, marginTop: 13 }}>
        {(patterns ?? []).map((p) => (
          <div key={p.id} className="flex items-center" style={{ gap: 10 }}>
            <div className="min-w-0 flex-1">
              <div style={{ fontSize: 12.5, fontWeight: 700 }}>{p.name}</div>
              <div
                className="truncate"
                style={{ fontSize: 11, color: "rgba(232,234,236,.38)", marginTop: 2 }}
              >
                {p.sender_match}
              </div>
            </div>
            <Toggle on={p.enabled} onToggle={() => update.mutate({ ...p, enabled: !p.enabled })} />
          </div>
        ))}
      </div>
    </div>
  );
}
