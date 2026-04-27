import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Role = "patient" | "doctor" | "admin";

export interface AuthUser {
  email: string;
  name: string;
  role: Role;
}

interface StoredUser extends AuthUser {
  password: string;
}

interface AuthCtx {
  user: AuthUser | null;
  login: (email: string, password: string) => { ok: boolean; error?: string };
  signup: (data: { email: string; password: string; name: string; role: Role }) => { ok: boolean; error?: string };
  logout: () => void;
}

const USERS_KEY = "vg.users";
const SESSION_KEY = "vg.session";

// Demo seed accounts — surfaced on the login page so the demo is friction-free.
export const DEMO_CREDENTIALS: { role: Role; email: string; password: string; name: string }[] = [
  { role: "patient", email: "patient@vitalglove.dev", password: "patient123", name: "Riya Patient" },
  { role: "doctor",  email: "doctor@vitalglove.dev",  password: "doctor123",  name: "Dr. Mehra" },
  { role: "admin",   email: "admin@vitalglove.dev",   password: "admin123",   name: "Ops Admin" },
];

function loadUsers(): StoredUser[] {
  let stored: StoredUser[] = [];
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (raw) stored = JSON.parse(raw) as StoredUser[];
  } catch { /* ignore */ }
  
  // Always merge demo credentials so they are guaranteed to exist and work
  const merged = [...stored];
  for (const demo of DEMO_CREDENTIALS) {
    const existingIndex = merged.findIndex((u) => u.email === demo.email);
    if (existingIndex >= 0) {
      merged[existingIndex] = { ...demo }; // overwrite to guarantee correct password/role
    } else {
      merged.push({ ...demo });
    }
  }
  
  localStorage.setItem(USERS_KEY, JSON.stringify(merged));
  return merged;
}

function saveUsers(users: StoredUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    loadUsers(); // ensure seeded
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) setUser(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  const login: AuthCtx["login"] = (email, password) => {
    const users = loadUsers();
    const found = users.find((u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    if (!found) return { ok: false, error: "Invalid email or password" };
    const session: AuthUser = { email: found.email, name: found.name, role: found.role };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    setUser(session);
    return { ok: true };
  };

  const signup: AuthCtx["signup"] = ({ email, password, name, role }) => {
    const users = loadUsers();
    if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      return { ok: false, error: "Email already registered" };
    }
    const next: StoredUser = { email, password, name, role };
    const updated = [...users, next];
    saveUsers(updated);
    const session: AuthUser = { email, name, role };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    setUser(session);
    return { ok: true };
  };

  const logout = () => {
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, login, signup, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthCtx {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
