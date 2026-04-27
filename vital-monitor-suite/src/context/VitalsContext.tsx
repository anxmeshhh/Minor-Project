import { createContext, useContext, type ReactNode } from "react";
import { useVitals } from "@/hooks/useVitals";
import type { VitalsReading } from "@/types/vitals";

interface Ctx {
  latest: VitalsReading | null;
  history: VitalsReading[];
  connected: boolean;
  lastUpdated: number | null;
}

const VitalsContext = createContext<Ctx | null>(null);

export function VitalsProvider({ children }: { children: ReactNode }) {
  const value = useVitals(1000);
  return <VitalsContext.Provider value={value}>{children}</VitalsContext.Provider>;
}

export function useVitalsCtx(): Ctx {
  const ctx = useContext(VitalsContext);
  if (!ctx) throw new Error("useVitalsCtx must be used within VitalsProvider");
  return ctx;
}
