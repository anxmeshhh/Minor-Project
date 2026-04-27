import { useEffect, useState } from "react";

export interface GloveCheckupResult {
  hasAnomaly: boolean;
  timestamp: number;
  details: string;
}

const STORAGE_KEY = "vital_glove_last_checkup";

export function triggerGloveAnomaly() {
  const result: GloveCheckupResult = {
    hasAnomaly: true,
    timestamp: Date.now(),
    details: "Abnormal Heart Rate detected (135 BPM). Possible Arrhythmia.",
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
  window.dispatchEvent(new Event("glove-checkup-updated"));
}

export function clearGloveAnomaly() {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event("glove-checkup-updated"));
}

export function useGloveCheckup() {
  const [result, setResult] = useState<GloveCheckupResult | null>(() => {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  });

  useEffect(() => {
    const handleUpdate = () => {
      const data = localStorage.getItem(STORAGE_KEY);
      setResult(data ? JSON.parse(data) : null);
    };

    window.addEventListener("glove-checkup-updated", handleUpdate);
    return () => {
      window.removeEventListener("glove-checkup-updated", handleUpdate);
    };
  }, []);

  return result;
}
