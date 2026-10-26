import { useState, type FormEvent } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "../lib/auth";
import { ApiError } from "../lib/api";
import { useI18n, type Strings } from "../lib/i18n";
import { Wordmark } from "../components/shell/TopBar";
import ThemePicker from "../components/shell/ThemePicker";
import { ActionButton, BusyLabel, DARK_LABEL, Field, Input as FieldInput } from "@/components/primitives";
import { useFamily } from "../lib/theme";
import { DarkWordmark } from "../designs/dark/DarkShell";
import { useGreeting } from "../designs/shared";

type Mode = "login" | "register";

// The server checks the same rules (backend/app/routers/auth.py); checking
// here first just words the problem in the page's language.
const USERNAME_RE = /^[a-z0-9][a-z0-9_.-]{2,31}$/;

function signUpProblem(t: Strings, username: string, password: string, confirm: string): string | null {
  if (!username || !password) return t.fillAllFields;
  if (!USERNAME_RE.test(username)) return t.usernameRule;
  if (password.length < 8) return t.passwordShort;
  if (new TextEncoder().encode(password).length > 72) return t.passwordLong;
  if (password !== confirm) return t.passwordMismatch;
  return null;
}

function signUpError(t: Strings, e: unknown): string {
  if (!(e instanceof ApiError)) return t.serverError;
  if (e.status === 409) return t.usernameTaken;
  if (e.status === 403) return t.signupClosed;
  if (e.status === 422) return t.usernameRule;
  return e.message || t.serverError;
}

export default function Login() {
  const { login, register, loginError } = useAuth();
  const { t, lang, setLang } = useI18n();
  const [mode, setMode] = useState<Mode>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [signUpMessage, setSignUpMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const family = useFamily();
  const registering = mode === "register";
  const error = registering ? signUpMessage : loginError;

  function toggleMode() {
    setMode(registering ? "login" : "register");
    setPassword("");
    setConfirm("");
    setSignUpMessage(null);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (registering) {
      const name = username.trim().toLowerCase();
      const problem = signUpProblem(t, name, password, confirm);
      setSignUpMessage(problem);
      if (problem) return;
      setBusy(true);
      try {
        await register(name, password);
      } catch (err) {
        setSignUpMessage(signUpError(t, err));
      } finally {
        setBusy(false);
      }
      return;
    }
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
        registering={registering}
        username={username}
        password={password}
        confirm={confirm}
        setUsername={setUsername}
        setPassword={setPassword}
        setConfirm={setConfirm}
        busy={busy}
        error={error}
        onSubmit={onSubmit}
        onToggleMode={toggleMode}
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
        {registering && (
          <div className="text-center" style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>
            {t.signUpTitle}
          </div>
        )}

        <Input
          className="h-auto md:text-[13.5px]"
          style={field}
          placeholder={t.username}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoFocus
          autoComplete="username"
          autoCapitalize="none"
          dir="ltr"
        />
        <Input
          className="h-auto md:text-[13.5px]"
          style={field}
          placeholder={t.password}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={registering ? "new-password" : "current-password"}
          dir="ltr"
        />
        {registering && (
          <Input
            className="h-auto md:text-[13.5px]"
            style={field}
            placeholder={t.passwordConfirm}
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            dir="ltr"
          />
        )}
        {registering && (
          <div style={{ fontSize: 11, color: "rgb(var(--fg-rgb) / .45)" }}>{t.usernameHint}</div>
        )}

        {error && (
          <div className="text-center" style={{ color: "var(--c-expense)", fontSize: 12 }}>
            {error}
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
          <BusyLabel busy={busy}>{registering ? t.signUp : t.login}</BusyLabel>
        </Button>

        <Button variant="plain" size="plain"
          type="button"
          onClick={toggleMode}
          className="self-center"
          style={{ marginTop: 4, padding: "6px 12px", color: "var(--c-primary)", fontSize: 12.5, fontWeight: 600 }}
        >
          {registering ? t.signInPrompt : t.signUpPrompt}
        </Button>

        <Button variant="plain" size="plain"
          type="button"
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
  registering,
  username,
  password,
  confirm,
  setUsername,
  setPassword,
  setConfirm,
  busy,
  error,
  onSubmit,
  onToggleMode,
}: {
  registering: boolean;
  username: string;
  password: string;
  confirm: string;
  setUsername: (v: string) => void;
  setPassword: (v: string) => void;
  setConfirm: (v: string) => void;
  busy: boolean;
  error: string | null;
  onSubmit: (e: FormEvent) => void;
  onToggleMode: () => void;
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
        type="button"
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
      <Field label={t.username} hint={registering ? t.usernameHint : undefined}>
        <FieldInput value={username} onChange={setUsername} dir="ltr" />
      </Field>
      <Field label={t.password}>
        <FieldInput type="password" value={password} onChange={setPassword} dir="ltr" />
      </Field>
      {registering && (
        <Field label={t.passwordConfirm}>
          <FieldInput type="password" value={confirm} onChange={setConfirm} dir="ltr" />
        </Field>
      )}
      {error && <div style={{ color: "var(--c-expense)", fontSize: 12 }}>{error}</div>}
      <div style={{ marginTop: 10 }}>
        <ActionButton type="submit" busy={busy}>
          {registering ? t.signUp : t.login}
        </ActionButton>
      </div>
      <Button
        variant="plain"
        size="plain"
        type="button"
        onClick={onToggleMode}
        className="self-center"
        style={{ padding: "6px 12px", color: "var(--c-primary)", fontSize: 12.5, fontWeight: 600 }}
      >
        {registering ? t.signInPrompt : t.signUpPrompt}
      </Button>
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
          <div style={DARK_LABEL}>{registering ? t.signUpTitle : t.login}</div>
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
