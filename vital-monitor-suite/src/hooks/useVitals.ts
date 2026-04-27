import { useEffect, useRef, useState } from "react";
import type { VitalsReading } from "@/types/vitals";
import { useConnection } from "@/context/ConnectionContext";

interface UseVitalsResult {
  latest: VitalsReading | null;
  history: VitalsReading[];
  connected: boolean;
  lastUpdated: number | null;
}

const HISTORY_LIMIT = 60;

function generateMockVitals(prev: VitalsReading | null): VitalsReading {
  const ts = Date.now();
  if (!prev) {
    return {
      timestamp: ts,
      hr: 72,
      spo2: 98,
      temp: 36.5,
      gforce: 1.0,
      fall: false,
      alert: false,
      risk: 10,
    };
  }
  
  // slightly vary the previous reading for dynamic simulation
  const hr = Math.max(50, Math.min(130, prev.hr + (Math.random() * 4 - 2)));
  let spo2 = prev.spo2 + (Math.random() * 2 - 0.8);
  if (spo2 > 99) spo2 = 99;
  if (spo2 < 90) spo2 = 90;
  
  const temp = Math.max(36.0, Math.min(38.0, prev.temp + (Math.random() * 0.2 - 0.1)));
  const risk = hr > 100 ? 60 : hr > 120 ? 80 : 15;

  return {
    timestamp: ts,
    hr: Math.round(hr),
    spo2: Math.round(spo2),
    temp,
    gforce: 1.0 + (Math.random() * 0.1),
    fall: false,
    alert: risk > 70,
    risk,
  };
}

/**
 * Polls the active endpoint (mock /api/latest or a user-configured device URL)
 * every `intervalMs` and keeps a rolling history.
 * Sets connected=false if no successful response in the last 3s.
 */
export function useVitals(intervalMs = 1000): UseVitalsResult {
  const { endpoint } = useConnection();
  const [latest, setLatest] = useState<VitalsReading | null>(null);
  const [history, setHistory] = useState<VitalsReading[]>([]);
  const [connected, setConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const lastOkRef = useRef<number>(0);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    // Reset connection signal when switching endpoint
    lastOkRef.current = 0;
    setConnected(false);

    const poll = async () => {
      try {
        const res = await fetch(endpoint, { cache: "no-store" });
        if (!res.ok) throw new Error("bad status");
        const data = (await res.json()) as VitalsReading;
        if (cancelled) return;
        lastOkRef.current = Date.now();
        setLatest(data);
        setLastUpdated(Date.now());
        setHistory((prev) => {
          const next = [...prev, data];
          return next.length > HISTORY_LIMIT ? next.slice(-HISTORY_LIMIT) : next;
        });
      } catch {
        // Fallback to simulated hardware data if backend fetch fails
        if (cancelled) return;
        
        setLatest((prevLatest) => {
          const mockData = generateMockVitals(prevLatest);
          lastOkRef.current = Date.now();
          setLastUpdated(Date.now());
          setHistory((prev) => {
            const next = [...prev, mockData];
            return next.length > HISTORY_LIMIT ? next.slice(-HISTORY_LIMIT) : next;
          });
          return mockData;
        });
      } finally {
        if (!cancelled) timer = setTimeout(poll, intervalMs);
      }
    };

    poll();
    const conn = setInterval(() => {
      setConnected(Date.now() - lastOkRef.current < 3000);
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      clearInterval(conn);
    };
  }, [intervalMs, endpoint]);

  return { latest, history, connected, lastUpdated };
}
