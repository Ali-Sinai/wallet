import type { ReactNode } from "react";
import { useIsDesktop } from "../../lib/useMediaQuery";
import { useOnlineStatus } from "../../lib/useOnlineStatus";
import { useI18n } from "../../lib/i18n";
import TopBar from "./TopBar";
import Sidebar from "./Sidebar";
import { MobileStatusBar, MobileTabBar } from "./MobileChrome";

/**
 * Two layouts, one per design file:
 *  - >=1000px  Wallet Web.dc.html — sticky top bar, 1240px shell, 330px rail
 *  - <1000px   Toman Tracker App.dc.html — status strip, scroller, tab bar
 */
export default function AppShell({
  children,
  sidebar = true,
}: {
  children: ReactNode;
  sidebar?: boolean;
}) {
  const isDesktop = useIsDesktop();
  const online = useOnlineStatus();
  const { t } = useI18n();

  if (isDesktop) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "radial-gradient(120% 70% at 8% -10%,#0f2a20 0%,#08090a 60%)",
          padding: "0 0 60px",
        }}
      >
        <TopBar />
        {!online && (
          <div
            className="mx-auto text-center"
            style={{ maxWidth: 1240, padding: "8px 28px 0", fontSize: 11.5, color: "#ff7a6b" }}
          >
            {t.offline}
          </div>
        )}
        <div
          className="mx-auto grid items-start"
          style={{
            maxWidth: 1240,
            padding: "26px 28px 0",
            gridTemplateColumns: sidebar ? "minmax(0,1fr) 330px" : "minmax(0,1fr)",
            gap: 22,
          }}
        >
          <div className="flex min-w-0 flex-col" style={{ gap: 18 }}>
            {children}
          </div>
          {sidebar && <Sidebar />}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ minHeight: "100dvh", background: "#08090a" }}>
      <MobileStatusBar />
      <div className="min-h-0 flex-1 overflow-y-auto no-scrollbar" style={{ paddingBottom: 8 }}>
        {children}
      </div>
      <MobileTabBar />
    </div>
  );
}

/** Phone screens all start with the same 22px gutter. */
export function MobileScreen({ children }: { children: ReactNode }) {
  return (
    <div className="fade-in" style={{ padding: "10px 22px 0" }}>
      {children}
    </div>
  );
}

export function MobileScreenTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <div style={{ fontSize: 19, fontWeight: 700 }}>{children}</div>
      {right}
    </div>
  );
}
