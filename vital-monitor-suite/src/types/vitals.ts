export interface VitalsReading {
  timestamp: number;
  hr: number;
  spo2: number;
  temp: number;
  gforce: number;
  fall: boolean;
  alert: boolean;
  risk: number;
}

export type RiskLevel = "safe" | "caution" | "critical";

export function getRiskLevel(risk: number): RiskLevel {
  if (risk <= 40) return "safe";
  if (risk <= 70) return "caution";
  return "critical";
}

export function getRiskLabel(risk: number): string {
  const lvl = getRiskLevel(risk);
  return lvl === "safe" ? "Safe" : lvl === "caution" ? "Caution" : "Critical";
}

export interface AlertReason {
  type: string;
  severity: RiskLevel;
  detail: string;
}

export function getAlertReasons(v: VitalsReading): AlertReason[] {
  const reasons: AlertReason[] = [];
  if (v.fall) reasons.push({ type: "Fall Detected", severity: "critical", detail: `Impact ${v.gforce}G` });
  if (v.hr > 120) reasons.push({ type: "High HR", severity: "critical", detail: `${v.hr} BPM` });
  else if (v.hr < 50) reasons.push({ type: "Low HR", severity: "critical", detail: `${v.hr} BPM` });
  if (v.spo2 < 90) reasons.push({ type: "Severe Hypoxia", severity: "critical", detail: `SpO₂ ${v.spo2}%` });
  else if (v.spo2 < 94) reasons.push({ type: "Low SpO₂", severity: "caution", detail: `SpO₂ ${v.spo2}%` });
  if (v.temp > 50 || v.temp < 15) reasons.push({ type: "Temp Out of Range", severity: "critical", detail: `${v.temp}°C` });
  return reasons;
}
