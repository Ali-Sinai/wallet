import { useState, type FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "../lib/auth";
import { useI18n } from "../lib/i18n";
import { Wordmark } from "../components/shell/TopBar";
import ThemePicker from "../components/shell/ThemePicker";
import { ActionButton, BusyLabel, DARK_LABEL, Field, Input as FieldInput } from "@/components/primitives";
import { useFamily } from "../lib/theme";
import { DarkWordmark } from "../designs/dark/DarkShell";
import { useGreeting } from "../designs/shared";

export default function Login() {
  const { login, loginError } = useAuth();
  const { t, lang, setLang } = useI18n();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const family = useFamily();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await login(username, password);
    } catch {
      // loginError is set by the auth provider.
    } finally {
      setBusy(false);
    }
  }

  if (family !== "classic") {
    return (
      <DesignLogin
        username={username}
        password={password}
        setUsername={setUsername}
        setPassword={setPassword}
        busy={busy}
        error={loginError}
        onSubmit={onSubmit}
      />
    );
  }

  const field = {
    borderRadius: 14,
    background: "var(--c-surface)",
    border: "1px solid rgb(var(--ink-rgb) / .07)",
    padding: "13px 16px",
    fontSize: 13.5,
    color: "var(--c-fg)",
    outline: "none",
  } as const;

  return (
    <div
      className="relative flex min-h-screen items-center justify-center px-6"
      style={{ background: "radial-gradient(90% 60% at 50% 0%,var(--c-primary-tint-2) 0%,var(--c-bg) 60%)" }}
    >
      <ThemePicker style={{ position: "absolute", top: "calc(16px + env(safe-area-inset-top))", insetInlineEnd: 16 }} />
      <form onSubmit={onSubmit} className="flex w-full flex-col" style={{ maxWidth: 340, gap: 10 }}>
        <div className="flex justify-center" style={{ marginBottom: 18 }}>
          <Wordmark size={26} />
        </div>

        <Input
          className="h-auto md:text-[13.5px]"
          style={field}
          placeholder={t.username}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoFocus
          autoComplete="username"
        />
        <Input
          className="h-auto md:text-[13.5px]"
          style={field}
          placeholder={t.password}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
        />

        {loginError && (
          <div className="text-center" style={{ color: "var(--c-expense)", fontSize: 12 }}>
            {loginError}
          </div>
        )}

        <Button variant="plain" size="plain"
          type="submit"
          disabled={busy}
          aria-busy={busy}
          style={{
            borderRadius: 14,
            background: "var(--c-primary)",
            color: "var(--c-on-primary)",
            fontWeight: 700,
            padding: "13px 0",
            fontSize: 13.5,
            marginTop: 6,
          }}
        >
          <BusyLabel busy={busy}>{t.login}</BusyLabel>
        </Button>

        <Button variant="plain" size="plain"
          onClick={() => setLang(lang === "fa" ? "en" : "fa")}
          className="self-center"
          style={{
            marginTop: 10,
            padding: "6px 12px",
            border: "1px solid rgb(var(--fg-rgb) / .16)",
            borderRadius: 99,
            color: "rgb(var(--fg-rgb) / .65)",
            fontSize: 11.5,
            fontWeight: 700,
          }}
        >
          {lang === "fa" ? "EN" : "فا"}
        </Button>
      </form>
    </div>
  );
}

/**
 * Sign-in for Wallet Dark (black page, oversized thin wordmark, underline
 * fields, the accent pill) and Wallet Soft (greeting, a bank card, a white
 * card holding the fields).
 */
function DesignLogin({
  username,
  password,
  setUsername,
  setPassword,
  busy,
  error,
  onSubmit,
}: {
  username: string;
  password: string;
  setUsername: (v: string) => void;
  setPassword: (v: string) => void;
  busy: boolean;
  error: string | null;
  onSubmit: (e: FormEvent) => void;
}) {
  const { t, toggle } = useI18n();
  const family = useFamily();
  const greeting = useGreeting();
  const dark = family === "dark";

  const tools = (
    <div className="flex items-center" style={{ gap: 10 }}>
      <ThemePicker compact={dark} />
      <Button
        variant="plain"
        size="plain"
        onClick={toggle}
        style={
          dark
            ? { fontFamily: "var(--app-mono)", fontSize: 12 }
            : { padding: "7px 12px", borderRadius: 99, background: "var(--c-surface)", boxShadow: "0 6px 18px rgba(0,0,0,.05)", fontSize: 12, fontWeight: 600 }
        }
      >
        {t.langLabel}
      </Button>
    </div>
  );

  const fields = (
    <>
      <Field label={t.username}>
        <FieldInput value={username} onChange={setUsername} />
      </Field>
      <Field label={t.password}>
        <FieldInput type="password" value={password} onChange={setPassword} />
      </Field>
      {error && <div style={{ color: "var(--c-expense)", fontSize: 12 }}>{error}</div>}
      <div style={{ marginTop: 10 }}>
        <ActionButton type="submit" busy={busy}>
          {t.login}
        </ActionButton>
      </div>
    </>
  );

  if (dark) {
    return (
      <div className="flex min-h-screen flex-col" style={{ background: "var(--c-bg)", color: "var(--c-fg)", padding: "calc(16px + env(safe-area-inset-top)) 28px 34px" }}>
        <div className="flex items-center justify-between">
          <DarkWordmark />
          {tools}
        </div>
        <form onSubmit={onSubmit} className="mx-auto flex w-full flex-1 flex-col justify-end" style={{ maxWidth: 420, gap: 18 }}>
          <div style={DARK_LABEL}>{t.login}</div>
          <div style={{ fontSize: "clamp(40px, 16vw, 64px)", fontWeight: 300, letterSpacing: "-.03em", lineHeight: 1, marginBottom: 24 }}>
            {t.appName}
          </div>
          <div className="flex flex-col" style={{ gap: 18 }}>
            {fields}
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col" style={{ background: "var(--c-bg)", color: "var(--c-fg)", padding: "calc(14px + env(safe-area-inset-top)) 20px 30px" }}>
      <div className="flex justify-end">{tools}</div>
      <form onSubmit={onSubmit} className="mx-auto flex w-full flex-1 flex-col justify-center" style={{ maxWidth: 400 }}>
        <span style={{ fontSize: 13, color: "rgb(var(--fg-rgb) / .55)" }}>{greeting}</span>
        <span style={{ fontSize: 26, fontWeight: 600, marginTop: 2 }}>{t.appName}</span>

        <div
          style={{
            position: "relative",
            overflow: "hidden",
            height: 150,
            marginTop: 22,
            borderRadius: 30,
            background: "var(--soft-card-2)",
            color: "#fff",
            boxShadow: "0 10px 22px rgba(0,0,0,.16)",
            padding: "22px 24px",
          }}
        >
          <div style={{ position: "absolute", width: 190, height: 190, insetInlineEnd: -60, top: -70, borderRadius: "50%", border: "34px solid rgba(255,255,255,.07)" }} />
          <div style={{ position: "relative", fontSize: 13, fontWeight: 600 }}>{t.appName}</div>
          <div dir="ltr" style={{ position: "absolute", bottom: 22, insetInlineStart: 24, fontSize: 13, letterSpacing: ".2em", color: "rgba(255,255,255,.75)" }}>
            •••• •••• •••• ••••
          </div>
        </div>

        <div
          className="soft-card flex flex-col"
          style={{ gap: 12, marginTop: 18, padding: 20, borderRadius: 26, background: "var(--c-surface)", boxShadow: "0 10px 30px rgba(0,0,0,.08)" }}
        >
          {fields}
        </div>
      </form>
    </div>
  );
}
