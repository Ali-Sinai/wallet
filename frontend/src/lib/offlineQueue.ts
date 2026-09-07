import { get, set, del, keys } from "idb-keyval";
import { api } from "./api";
import type { Direction } from "../types";

export interface QueuedTransaction {
  key: string;
  amount_cents: number;
  direction: Direction;
  account_id: number;
  occurred_at: string;
  category_id: number | null;
  note: string | null;
  merchant_text: string | null;
}

const PREFIX = "queued-tx:";

export async function queueTransaction(tx: Omit<QueuedTransaction, "key">): Promise<void> {
  const key = PREFIX + crypto.randomUUID();
  await set(key, { ...tx, key });
}

export async function listQueuedTransactions(): Promise<QueuedTransaction[]> {
  const allKeys = await keys();
  const txKeys = allKeys.filter((k) => typeof k === "string" && k.startsWith(PREFIX));
  const items = await Promise.all(txKeys.map((k) => get<QueuedTransaction>(k as string)));
  return items.filter((i): i is QueuedTransaction => i !== undefined);
}

/** Call when connectivity returns. Best-effort: leaves failed items queued for next try. */
export async function syncQueuedTransactions(): Promise<{ synced: number; failed: number }> {
  const items = await listQueuedTransactions();
  let synced = 0;
  let failed = 0;
  for (const item of items) {
    try {
      const { key, ...body } = item;
      await api.post("/transactions", body);
      await del(key);
      synced += 1;
    } catch {
      failed += 1;
    }
  }
  return { synced, failed };
}
