const SESSION_KEY = "rain_admin_session";

export type AdminUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  isPlatformAdmin: boolean;
  institution: { id: string; name: string; email: string } | null;
};

export type AdminSession = {
  token: string;
  expiresAt: string;
  user: AdminUser;
};

export function getSession(): AdminSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AdminSession;
  } catch {
    return null;
  }
}

export function setSession(session: AdminSession) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}
