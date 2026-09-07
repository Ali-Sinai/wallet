import { createContext, useContext, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "./api";

interface Me {
  username: string;
}

interface AuthContextValue {
  user: Me | null | undefined; // undefined = loading
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loginError: string | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [loginError, setLoginError] = useState<string | null>(null);

  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      try {
        return await api.get<Me>("/auth/me");
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) return null;
        throw e;
      }
    },
    staleTime: Infinity,
    retry: false,
  });

  async function login(username: string, password: string) {
    setLoginError(null);
    try {
      const me = await api.post<Me>("/auth/login", { username, password });
      qc.setQueryData(["me"], me);
    } catch (e) {
      setLoginError(e instanceof ApiError ? "نام کاربری یا رمز عبور اشتباه است" : "خطا در ارتباط با سرور");
      throw e;
    }
  }

  async function logout() {
    await api.post("/auth/logout");
    qc.setQueryData(["me"], null);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loginError }}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
