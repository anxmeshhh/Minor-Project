import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type ConnectionMode = "mock" | "device" | "flask";

interface ConnectionCtx {
  mode: ConnectionMode;
  deviceUrl: string;
  setMode: (m: ConnectionMode) => void;
  setDeviceUrl: (url: string) => void;
  /** Resolved URL the polling hook should fetch. */
  endpoint: string;
}

const STORAGE_KEY = "vg.connection";
const FLASK_URL   = "http://localhost:5001/api/latest";

const Ctx = createContext<ConnectionCtx | null>(null);

interface Persisted { mode: ConnectionMode; deviceUrl: string; }

function load(): Persisted {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Persisted;
  } catch { /* ignore */ }
  return { mode: "mock", deviceUrl: "http://192.168.4.1/data" };
}

export function ConnectionProvider({ children }: { children: ReactNode }) {
  const initial = load();
  const [mode, setModeState]         = useState<ConnectionMode>(initial.mode);
  const [deviceUrl, setDeviceUrlState] = useState<string>(initial.deviceUrl);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ mode, deviceUrl }));
  }, [mode, deviceUrl]);

  const endpoint =
    mode === "mock"   ? "/api/latest" :      // Vite mock plugin
    mode === "flask"  ? FLASK_URL     :      // Flask backend
    deviceUrl;                               // Direct ESP32 URL

  return (
    <Ctx.Provider value={{ mode, deviceUrl, setMode: setModeState, setDeviceUrl: setDeviceUrlState, endpoint }}>
      {children}
    </Ctx.Provider>
  );
}

export function useConnection(): ConnectionCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useConnection must be used inside ConnectionProvider");
  return c;
}
