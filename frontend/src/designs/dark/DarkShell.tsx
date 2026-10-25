import type { CSSProperties, ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { useIsDesktop } from "@/hooks/use-media-query";
import { Button } from "@/components/ui/button";
import ThemePicker from "../../components/shell/ThemePicker";
import { useI18n } from "../../lib/i18n";
import { useModals } from "../../lib/modals";
import { useOnlineStatus } from "../../lib/useOnlineStatus";
import { GearIcon, Icon, P, PeopleIcon } from "../shared";

/* ------------------------------------------------------------------ *
 * Wallet Dark.dc.html — pure black, letter-spaced wordmark, line
 * icons, one accent. Phones get the design's header + 4-icon tab bar;
 * desktops get the same header with the tabs as text links.
 * ------------------------------------------------------------------ */

export const MONO = "var(--app-mono)";

/** The design's small-caps section label ("BALANCE · TOMAN", "TODAY"). */
export const label: CSSProperties = {
  fontFamily: MONO,
  fontSize: 11,
  letterSpacing: "calc(var(--track) * .16em)",
  textTransform: "uppercase",
  color: "rgb(var(--fg-rgb) / .47)",
};

export const muted = "rgb(var(--fg-rgb) / .4)";

const TABS = [
  { to: "/", key: "navHome", end: true, icon: <Icon d={P.home} /> },
  { to: "/activity", key: "navActivity", end: false, icon: <Icon d={P.list} /> },
  { to: "/people", key: "navPeople", end: false, icon: <PeopleIcon /> },
  { to: "/reports", key: "navReports", end: false, icon: <Icon d={P.chart} /> },
] as const;

export function DarkWordmark() {
  const { t } = useI18n();
  return (
    <span style={{ fontSize: 15, letterSpacing: "calc(var(--track) * .2em)", fontWeight: 500, textTransform: "uppercase" }}>
      {t.appName}
    </span>
  );
}

function HeaderTools() {
  const { t, toggle } = useI18n();
  return (
    <div className="flex items-center" style={{ gap: 18 }}>
      <NavLink to="/activity" aria-label={t.search} style={{ color: "var(--c-fg)" }}>
        <Icon size={20} d={P.search} />
      </NavLink>
      <ThemePicker compact style={{ border: "1px solid rgb(var(--fg-rgb) / .2)" }} />
      <Button variant="plain" size="plain" onClick={toggle} style={{ fontFamily: MONO, fontSize: 12, color: "var(--c-fg)" }}>
        {t.langLabel}
      </Button>
      <NavLink to="/settings" aria-label={t.settings} style={{ color: "var(--c-fg)" }}>
        <GearIcon size={20} />
      </NavLink>
    </div>
  );
}

export default function DarkShell({ children }: { children: ReactNode }) {
  const isDesktop = useIsDesktop();
  const online = useOnlineStatus();
  const { t } = useI18n();
  const { openAdd } = useModals();

  const offline = !online && (
    <div style={{ ...label, color: "var(--c-expense)", padding: isDesktop ? "0 0 12px" : "6px 28px 0" }}>
      {t.offline}
    </div>
  );

  if (isDesktop) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--c-bg)", color: "var(--c-fg)" }}>
        <header
          className="sticky top-0 z-20"
          style={{ background: "rgb(var(--bg-rgb) / .85)", backdropFilter: "blur(14px)" }}
        >
          <div className="mx-auto flex items-center" style={{ maxWidth: 1120, padding: "26px 48px", gap: 44 }}>
            <DarkWordmark />
            <nav className="flex" style={{ gap: 30 }}>
              {TABS.map((tab) => (
                <NavLink key={tab.to} to={tab.to} end={tab.end}>
                  {({ isActive }) => (
                    <span
                      className="flex items-center"
                      style={{ ...label, gap: 8, color: isActive ? "var(--c-fg)" : "rgb(var(--fg-rgb) / .4)" }}
                    >
                      <span
                        style={{
                          width: 5,
                          height: 5,
                          borderRadius: 99,
                          background: isActive ? "var(--c-accent)" : "transparent",
                        }}
                      />
                      {t[tab.key]}
                    </span>
                  )}
                </NavLink>
              ))}
            </nav>
            <div className="flex-1" />
            <Button
              variant="plain"
              size="plain"
              onClick={openAdd}
              className="flex items-center"
              style={{ gap: 8, ...label, color: "var(--c-accent)" }}
            >
              <Icon size={16} d={P.plus} color="var(--c-accent)" w={1.8} />
              {t.addShort}
            </Button>
            <HeaderTools />
          </div>
        </header>
        <main className="mx-auto flex flex-col" style={{ maxWidth: 1120, padding: "18px 48px 80px", gap: 18 }}>
          {offline}
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col overflow-hidden" style={{ height: "100dvh", background: "var(--c-bg)", color: "var(--c-fg)" }}>
      <div
        className="flex flex-none items-center justify-between"
        style={{ padding: "calc(16px + env(safe-area-inset-top)) 28px 4px" }}
      >
        <DarkWordmark />
        <HeaderTools />
      </div>
      {offline}
      <div className="min-h-0 flex-1 overflow-y-auto no-scrollbar" style={{ paddingBottom: 12, overscrollBehavior: "contain" }}>
        {children}
      </div>
      <nav
        className="flex flex-none justify-around"
        style={{ padding: "14px 20px calc(22px + env(safe-area-inset-bottom))", background: "var(--c-bg)" }}
      >
        {TABS.map((tab) => (
          <NavLink key={tab.to} to={tab.to} end={tab.end} aria-label={t[tab.key]}>
            {({ isActive }) => (
              <span style={{ color: isActive ? "var(--c-accent)" : "rgb(var(--fg-rgb) / .4)", display: "block" }}>
                {tab.icon}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
