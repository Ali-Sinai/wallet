import type { CSSProperties, ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { useIsDesktop } from "@/hooks/use-media-query";
import { Button } from "@/components/ui/button";
import ThemePicker from "../../components/shell/ThemePicker";
import { useI18n } from "../../lib/i18n";
import { useModals } from "../../lib/modals";
import { useSmsPending } from "../../lib/queries";
import { useOnlineStatus } from "../../lib/useOnlineStatus";
import { GearIcon, Icon, P, PersonIcon } from "../shared";

/* ------------------------------------------------------------------ *
 * Wallet Soft.dc.html — light grey canvas, white cards with a soft
 * shadow, round icon buttons and a floating pill tab bar with the
 * accent "+" in the middle.
 * ------------------------------------------------------------------ */

export const softShadow = "0 6px 18px rgba(0,0,0,.05)";
export const whiteCard: CSSProperties = { borderRadius: 22, background: "var(--c-surface)", boxShadow: softShadow };
export const softMuted = "rgb(var(--fg-rgb) / .55)";

export function RoundBtn({
  children,
  onClick,
  to,
  label,
  plain = false,
  badge,
  size = 46,
}: {
  children: ReactNode;
  onClick?: () => void;
  to?: string;
  label: string;
  plain?: boolean;
  badge?: number;
  size?: number;
}) {
  const { digits } = useI18n();
  const style: CSSProperties = {
    position: "relative",
    width: size,
    height: size,
    flex: "none",
    borderRadius: "50%",
    background: "var(--c-surface)",
    color: "var(--c-fg)",
    boxShadow: plain ? "none" : "0 6px 18px rgba(0,0,0,.06)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };
  const dot = badge ? (
    <span
      style={{
        position: "absolute",
        top: -2,
        insetInlineEnd: -2,
        minWidth: 18,
        height: 18,
        padding: "0 5px",
        borderRadius: 9,
        background: "var(--c-primary)",
        color: "var(--c-on-primary)",
        fontSize: 10,
        fontWeight: 600,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {digits(badge)}
    </span>
  ) : null;

  if (to) {
    return (
      <NavLink to={to} aria-label={label} title={label} style={style}>
        {children}
        {dot}
      </NavLink>
    );
  }
  return (
    <Button variant="plain" size="plain" onClick={onClick} aria-label={label} title={label} style={style}>
      {children}
      {dot}
    </Button>
  );
}

const TABS = [
  { to: "/", key: "navHome", end: true, d: P.home, filled: true },
  { to: "/activity", key: "navActivity", end: false, d: P.wallet, filled: false },
  { to: "/reports", key: "navReports", end: false, d: P.chart, filled: false },
  { to: "/people", key: "navPeople", end: false, d: null, filled: false },
] as const;

function TabIcon({ tab, active }: { tab: (typeof TABS)[number]; active: boolean }) {
  const color = active ? "var(--c-primary)" : "rgb(var(--fg-rgb) / .35)";
  if (!tab.d) return <PersonIcon size={22} color={color} w={1.7} />;
  return <Icon size={22} d={tab.d} color={color} w={1.7} fill={active && tab.filled ? color : "none"} />;
}

function Tools({ compact }: { compact: boolean }) {
  const { t, toggle } = useI18n();
  return (
    <div className="flex items-center" style={{ gap: 8 }}>
      <ThemePicker compact={compact} style={{ background: "var(--c-surface)", border: 0, boxShadow: softShadow }} />
      <Button
        variant="plain"
        size="plain"
        onClick={toggle}
        style={{
          padding: compact ? "4px 10px" : "7px 12px",
          borderRadius: 99,
          background: "var(--c-surface)",
          boxShadow: softShadow,
          fontSize: compact ? 11 : 12,
          fontWeight: 600,
        }}
      >
        {t.langLabel}
      </Button>
      <RoundBtn to="/settings" label={t.settings} size={compact ? 28 : 38}>
        <GearIcon size={compact ? 15 : 18} w={1.8} />
      </RoundBtn>
    </div>
  );
}

export default function SoftShell({ children }: { children: ReactNode }) {
  const isDesktop = useIsDesktop();
  const online = useOnlineStatus();
  const { t } = useI18n();
  const { openAdd } = useModals();
  const { data: pending } = useSmsPending();

  const offline = !online && <span style={{ fontSize: 11.5, color: "var(--c-expense)" }}>{t.offline}</span>;

  if (isDesktop) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--c-bg)", color: "var(--c-fg)" }}>
        <div className="sticky top-0 z-20" style={{ padding: "18px 32px 0" }}>
          <div
            className="mx-auto flex items-center"
            style={{ maxWidth: 1180, height: 70, borderRadius: 35, background: "var(--c-surface)", boxShadow: "0 10px 30px rgba(0,0,0,.08)", padding: "0 12px 0 26px", gap: 22 }}
          >
            <span style={{ fontSize: 19, fontWeight: 600 }}>{t.appName}</span>
            <nav className="flex" style={{ gap: 4 }}>
              {TABS.map((tab) => (
                <NavLink key={tab.to} to={tab.to} end={tab.end}>
                  {({ isActive }) => (
                    <span
                      className="flex items-center"
                      style={{
                        gap: 8,
                        padding: "10px 16px",
                        borderRadius: 21,
                        fontSize: 13.5,
                        fontWeight: isActive ? 600 : 500,
                        background: isActive ? "var(--c-primary)" : "transparent",
                        color: isActive ? "var(--c-on-primary)" : softMuted,
                      }}
                    >
                      {t[tab.key]}
                    </span>
                  )}
                </NavLink>
              ))}
            </nav>
            <div className="flex-1">{offline}</div>
            <RoundBtn to="/inbox" label={t.inbox} plain badge={pending?.length} size={42}>
              <Icon size={19} d={P.bell} w={1.8} />
            </RoundBtn>
            <Tools compact={false} />
            <Button
              variant="plain"
              size="plain"
              onClick={openAdd}
              className="flex items-center"
              style={{
                gap: 8,
                height: 48,
                padding: "0 22px",
                borderRadius: 24,
                background: "var(--c-primary)",
                color: "var(--c-on-primary)",
                fontSize: 13.5,
                fontWeight: 500,
                boxShadow: "0 8px 20px rgb(var(--primary-rgb) / .3)",
              }}
            >
              <Icon size={18} d={P.plus} w={2} />
              {t.add}
            </Button>
          </div>
        </div>
        <main className="mx-auto flex flex-col" style={{ maxWidth: 1180, padding: "28px 32px 80px", gap: 18 }}>
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col overflow-hidden" style={{ height: "100dvh", background: "var(--c-bg)", color: "var(--c-fg)" }}>
      <div
        className="flex flex-none items-center justify-between"
        style={{ padding: "calc(12px + env(safe-area-inset-top)) 20px 0", minHeight: 40 }}
      >
        <div>{offline}</div>
        <Tools compact />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto no-scrollbar" style={{ paddingBottom: 12, overscrollBehavior: "contain" }}>
        {children}
      </div>
      <div style={{ padding: "0 16px calc(20px + env(safe-area-inset-bottom))", flex: "none" }}>
        <nav
          className="flex items-center justify-around"
          style={{ height: 70, borderRadius: 35, background: "var(--c-surface)", boxShadow: "0 10px 30px rgba(0,0,0,.08)", padding: "0 8px" }}
        >
          {TABS.slice(0, 2).map((tab) => (
            <NavLink key={tab.to} to={tab.to} end={tab.end} aria-label={t[tab.key]} style={{ padding: 8 }}>
              {({ isActive }) => <TabIcon tab={tab} active={isActive} />}
            </NavLink>
          ))}
          <Button
            variant="plain"
            size="plain"
            onClick={openAdd}
            aria-label={t.add}
            style={{
              width: 54,
              height: 54,
              borderRadius: "50%",
              background: "var(--c-primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 8px 20px rgb(var(--primary-rgb) / .35)",
            }}
          >
            <Icon size={22} d={P.plus} color="var(--c-on-primary)" w={2} />
          </Button>
          {TABS.slice(2).map((tab) => (
            <NavLink key={tab.to} to={tab.to} end={tab.end} aria-label={t[tab.key]} style={{ padding: 8 }}>
              {({ isActive }) => <TabIcon tab={tab} active={isActive} />}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
