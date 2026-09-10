import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { syncQueuedTransactions } from "./offlineQueue";

export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(navigator.onLine);
  const qc = useQueryClient();

  useEffect(() => {
    let cancelled = false;

    async function sync() {
      const { synced } = await syncQueuedTransactions();
      if (cancelled || synced === 0) return;
      // Anything that was queued offline is now real money in the reports.
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["reports"] });
    }

    function goOnline() {
      setOnline(true);
      void sync();
    }
    function goOffline() {
      setOnline(false);
    }

    // The `online` event only fires on a transition. If the app was closed
    // while offline and reopened with a connection, drain the queue on mount.
    if (navigator.onLine) void sync();

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      cancelled = true;
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, [qc]);

  return online;
}
