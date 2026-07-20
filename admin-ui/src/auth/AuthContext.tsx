import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { apiGet, apiPost } from "@/lib/api";
import {
  clearSession,
  getSession,
  setSession,
  type AdminSession,
  type AdminUser,
} from "@/lib/session";

type AuthContextValue = {
  user: AdminUser | null;
  loading: boolean;
  login: (input: {
    email: string;
    password: string;
  }) => Promise<{ success: true } | { success: false; error: string }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const session = getSession();
    if (!session?.token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const res = await apiGet<{ user: AdminUser }>("/platform/auth/me");
      setUser(res.user);
    } catch {
      clearSession();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(
    async (input: { email: string; password: string }) => {
      const result = await apiPost<{
        success: boolean;
        error?: string;
        session?: {
          token: string;
          expiresAt: string;
          user: AdminUser;
        };
      }>("/platform/auth/login", input);

      if (!result.success || !result.session) {
        return {
          success: false as const,
          error: result.error ?? "Invalid email or password.",
        };
      }

      setSession(result.session);
      setUser(result.session.user);
      return { success: true as const };
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await apiPost("/platform/auth/logout");
    } catch {
      /* ignore */
    }
    clearSession();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, logout, refresh }),
    [user, loading, login, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
