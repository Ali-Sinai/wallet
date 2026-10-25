import type { ReactNode } from "react";
import { useIsDesktop } from "@/hooks/use-media-query";
import { useOnlineStatus } from "../../lib/useOnlineStatus";
import { useI18n } from "../../lib/i18n";
import TopBar from "./TopBar";
import Sidebar from "./Sidebar";
import { MobileStatusBar, MobileTabBar } from "./MobileChrome";
import { useFamily } from "../../lib/theme";
import DarkShell from "../../designs/dark/DarkShell";
import SoftShell from "../../designs/soft/SoftShell";

/**
 * Two layouts, one per design file:
 *  - >=1000px  Wallet Web.dc.html — sticky top bar, 1240px shell, 330px rail
 *  - <1000px   Toman Tracker App.dc.html — status strip, scroller, tab bar
 * The Wallet Dark / Wallet Soft themes bring their own shells.
 */
export default function AppShell(props: { children: ReactNode; sidebar?: boolean }) {
  const family = useFamily();
  if (family === "dark") return <DarkShell>{props.children}</DarkShell>;
  if (family === "soft") return <SoftShell>{props.children}</SoftShell>;
  return <ClassicShell {...props} />;
}

function ClassicShell({
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
          background: "radial-gradient(120% 70% at 8% -10%,var(--c-glow) 0%,var(--c-bg) 60%)",
          padding: "0 0 60px",
        }}
      >
        <TopBar />
        {!online && (
          <div
            className="mx-auto text-center"
            style={{ maxWidth: 1240, padding: "8px 28px 0", fontSize: 11.5, color: "var(--c-expense)" }}
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
    // Fixed to the viewport so only the middle scrolls and the tab bar stays put.
    <div className="flex flex-col overflow-hidden" style={{ height: "100dvh", background: "var(--c-bg)" }}>
      <MobileStatusBar />
      <div
        className="min-h-0 flex-1 overflow-y-auto no-scrollbar"
        style={{ paddingBottom: 8, overscrollBehavior: "contain" }}
      >
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
