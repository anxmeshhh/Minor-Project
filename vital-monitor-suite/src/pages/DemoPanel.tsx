import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Activity, Heart, Droplets, Thermometer, Zap, Wifi, WifiOff,
  FlaskConical, RadioTower, CheckCircle2, AlertTriangle, Play,
  Shield, Database, Layers, Users, Bell, LogIn, UserPlus,
  ChevronRight, Cpu, RefreshCw
} from "lucide-react";

/* ─── types from /api/demo/scenarios ──────────────────────────────────── */
interface ScenarioMeta {
  id: string;
  label: string;
  description: string;
  medical_ref: string;
  gaps: string[];
  expected_risk_range: [number, number];
  expected_escalation_tier: number;
  system_response?: string[];
}

interface DemoStatus {
  scenario: string | null;
  dataSource: "device" | "simulation";
  esp32Connected: boolean;
  scenarioMeta?: ScenarioMeta;
}

interface VitalsSnapshot {
  hr: number; spo2: number; temp: number;
  gforce: number; fall: boolean; risk: number;
  alert: boolean; source?: string; ml_class?: string;
  ml_confidence?: number; scenario?: string;
}

const GAP_STYLES: Record<string, string> = {
  G1: "bg-violet-900/40 text-violet-300 border-violet-700/50",
  G2: "bg-blue-900/40 text-blue-300 border-blue-700/50",
  G3: "bg-teal-900/40 text-teal-300 border-teal-700/50",
  G4: "bg-red-900/40 text-red-300 border-red-700/50",
  G5: "bg-pink-900/40 text-pink-300 border-pink-700/50",
  G6: "bg-emerald-900/40 text-emerald-300 border-emerald-700/50",
  G7: "bg-amber-900/40 text-amber-300 border-amber-700/50",
};

const GAP_LABELS: Record<string, string> = {
  G1: "Real hardware deployment",
  G2: "Patient-facing interface",
  G3: "Multi-profile scalability",
  G4: "Emergency escalation",
  G5: "Data privacy / roles",
  G6: "Edge + Cloud hybrid",
  G7: "EHR/Doctor integration",
};

const TIER_LABEL: Record<number, { label: string; cls: string }> = {
  0: { label: "No escalation", cls: "bg-emerald-900/40 text-emerald-300 border-emerald-700/40" },
  1: { label: "L1 — Doctor alerted", cls: "bg-amber-900/40 text-amber-300 border-amber-700/40" },
  2: { label: "L2 — Family notified", cls: "bg-orange-900/40 text-orange-300 border-orange-700/40" },
  3: { label: "L3 — Emergency dispatched", cls: "bg-red-900/40 text-red-300 border-red-700/40 animate-pulse" },
};

/* base URL — uses Flask when available, Vite mock as fallback */
const BASE = "http://localhost:5001";
const FLASK_VITALS = `${BASE}/api/latest`;

/* ─── helpers ──────────────────────────────────────────────────────────── */
async function safeFetch<T>(url: string, opts?: RequestInit): Promise<T | null> {
  try {
    const r = await fetch(url, opts);
    if (!r.ok) return null;
    return await r.json() as T;
  } catch { return null; }
}

/* ─── component ────────────────────────────────────────────────────────── */
export default function DemoPanel() {
  const navigate = useNavigate();
  const [scenarios, setScenarios]           = useState<ScenarioMeta[]>([]);
  const [status, setStatus]                 = useState<DemoStatus>({ scenario: null, dataSource: "simulation", esp32Connected: false });
  const [vitals, setVitals]                 = useState<VitalsSnapshot | null>(null);
  const [activeId, setActiveId]             = useState<string>("normal");
  const [loading, setLoading]               = useState<string | null>(null);
  const [flaskOnline, setFlaskOnline]       = useState(false);

  /* ── load scenario list dynamically from Flask ── */
  useEffect(() => {
    const load = async () => {
      const data = await safeFetch<ScenarioMeta[]>(`${BASE}/api/demo/scenarios`);
      if (data && data.length > 0) {
        setScenarios(data);
        setFlaskOnline(true);
      } else {
        /* Flask offline — still functional via Vite mock */
        setFlaskOnline(false);
      }
    };
    load();
  }, []);

  /* ── poll status every 1s ── */
  useEffect(() => {
    let alive = true;
    const poll = async () => {
      const s = await safeFetch<DemoStatus>(`${BASE}/api/demo/status`);
      if (s && alive) {
        setStatus(s);
        if (s.scenario) setActiveId(s.scenario);
        else setActiveId("normal");
      }
      if (alive) setTimeout(poll, 1000);
    };
    poll();
    return () => { alive = false; };
  }, []);

  /* ── poll vitals every 800ms ── */
  useEffect(() => {
    let alive = true;
    const poll = async () => {
      const v = await safeFetch<VitalsSnapshot>(
        flaskOnline ? FLASK_VITALS : "/api/latest"
      );
      if (v && alive) setVitals(v);
      if (alive) setTimeout(poll, 800);
    };
    poll();
    return () => { alive = false; };
  }, [flaskOnline]);

  const activeMeta = scenarios.find(s => s.id === activeId) ?? null;

  const triggerScenario = useCallback(async (id: string) => {
    setLoading(id);
    /* try Flask first, fall back to Vite mock */
    const tried = await safeFetch(`${BASE}/api/demo/trigger`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scene: id }),
    });
    if (!tried) {
      await safeFetch("/api/demo/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scene: id }),
      });
    }
    setActiveId(id);
    setLoading(null);
  }, []);

  const riskColor = (r: number) =>
    r > 70 ? "bg-red-500" : r > 40 ? "bg-amber-500" : "bg-emerald-500";

  const riskLabel = (r: number) =>
    r > 70 ? "critical" : r > 40 ? "caution" : "safe";

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* ── top banner: start with simulation, then sign in ─────────── */}
      <div className="border-b border-border/60 bg-gradient-to-r from-violet-950/30 via-background to-blue-950/20">
        <div className="container flex flex-col md:flex-row md:items-center justify-between gap-4 py-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 text-xs border border-violet-700/50 bg-violet-900/30 text-violet-300 rounded-full px-3 py-1">
                <FlaskConical className="h-3 w-3" /> Research Demo Mode
              </span>
              <span className={cn(
                "inline-flex items-center gap-1.5 text-xs border rounded-full px-3 py-1",
                flaskOnline
                  ? "border-emerald-700/50 bg-emerald-900/30 text-emerald-300"
                  : "border-zinc-700/50 bg-zinc-900/40 text-zinc-400"
              )}>
                {flaskOnline
                  ? <><Wifi className="h-3 w-3" /> Flask Online</>
                  : <><WifiOff className="h-3 w-3" /> Vite Mock Mode</>}
              </span>
              {status.esp32Connected && (
                <span className="inline-flex items-center gap-1.5 text-xs border border-emerald-700/50 bg-emerald-900/30 text-emerald-300 rounded-full px-3 py-1">
                  <RadioTower className="h-3 w-3" /> ESP32 Connected
                </span>
              )}
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">VitalGlove System Demo</h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-lg">
              Select a scenario below. The dashboard, patient view, and physical OLED all update
              wirelessly within 3 seconds. Sign in to access your role-based dashboard.
            </p>
          </div>
          {/* CTA buttons */}
          <div className="flex gap-3 shrink-0">
            <button
              onClick={() => navigate("/login")}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-violet-700/50 bg-violet-900/30 text-violet-200 text-sm font-medium hover:bg-violet-800/40 transition-colors"
            >
              <LogIn className="h-4 w-4" /> Sign In
            </button>
            <button
              onClick={() => navigate("/signup")}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors"
            >
              <UserPlus className="h-4 w-4" /> Sign Up
            </button>
          </div>
        </div>
      </div>

      <div className="container py-8 space-y-8">

        {/* ── scenario grid — fully dynamic from /api/demo/scenarios ── */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xs uppercase tracking-widest text-muted-foreground">
              Research Scenarios — persists until changed
            </h2>
            {scenarios.length === 0 && (
              <span className="text-xs text-amber-400 flex items-center gap-1">
                <RefreshCw className="h-3 w-3 animate-spin" /> Loading scenarios from Flask…
              </span>
            )}
          </div>

          {scenarios.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/60 bg-panel/50 p-12 text-center text-muted-foreground text-sm">
              Start Flask backend (<code className="bg-zinc-800 px-1 rounded">python app.py</code>) to load all 9 research scenarios.
              Currently using Vite mock with basic simulation.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {scenarios.map((s) => {
                const isActive  = activeId === s.id;
                const isLoading = loading === s.id;
                const tier      = TIER_LABEL[s.expected_escalation_tier] ?? TIER_LABEL[0];
                return (
                  <button
                    key={s.id}
                    onClick={() => triggerScenario(s.id)}
                    disabled={isLoading}
                    className={cn(
                      "relative group flex flex-col gap-3 rounded-xl border bg-panel p-5 text-left",
                      "transition-all duration-200 hover:scale-[1.02]",
                      isActive
                        ? "border-violet-500/70 shadow-[0_0_20px_rgba(139,92,246,0.25)] bg-panel-elevated"
                        : "border-border hover:border-border/80"
                    )}
                  >
                    {isActive && (
                      <span className="absolute top-3 right-3">
                        <CheckCircle2 className="h-4 w-4 text-violet-400" />
                      </span>
                    )}

                    {/* scenario header */}
                    <div>
                      <p className={cn("font-semibold text-sm", isActive ? "text-violet-200" : "text-foreground")}>
                        {s.label}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">
                        {s.description}
                      </p>
                    </div>

                    {/* escalation tier */}
                    <span className={cn("inline-flex items-center gap-1 self-start rounded-full border px-2 py-0.5 text-[10px] font-medium", tier.cls)}>
                      {tier.label}
                    </span>

                    {/* research gaps */}
                    <div className="flex flex-wrap gap-1">
                      {s.gaps.map(g => (
                        <span key={g} className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium", GAP_STYLES[g] ?? "bg-zinc-900 text-zinc-400 border-zinc-700")}>
                          {g}
                        </span>
                      ))}
                    </div>

                    {/* risk range */}
                    <div className="flex items-center gap-2">
                      <div className="h-1 flex-1 rounded-full bg-zinc-800 overflow-hidden">
                        <div
                          className={cn("h-full rounded-full transition-all", riskColor(s.expected_risk_range[1]))}
                          style={{ width: `${s.expected_risk_range[1]}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        Risk {s.expected_risk_range[0]}–{s.expected_risk_range[1]}
                      </span>
                    </div>

                    {isLoading && (
                      <div className="absolute inset-0 rounded-xl bg-background/60 flex items-center justify-center">
                        <Play className="h-5 w-5 animate-spin text-violet-400" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* ── live vitals + active scenario detail ──────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* vitals cards */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-xs uppercase tracking-widest text-muted-foreground">
              Live Output — {vitals?.source === "device" ? "Real Hardware" : "Simulation"}{" "}
              {vitals?.ml_class && (
                <span className="ml-2 normal-case text-violet-400">
                  · ML: {vitals.ml_class} ({((vitals.ml_confidence ?? 0) * 100).toFixed(0)}%)
                </span>
              )}
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Heart Rate",   value: vitals?.hr ?? "—",              unit: "BPM", alert: !!vitals && (vitals.hr > 120 || vitals.hr < 50), color: "text-red-400",    icon: <Heart className="h-4 w-4" /> },
                { label: "SpO₂",        value: vitals?.spo2 ?? "—",            unit: "%",   alert: !!vitals && vitals.spo2 < 94,                    color: "text-blue-400",   icon: <Droplets className="h-4 w-4" /> },
                { label: "Temperature", value: vitals ? vitals.temp.toFixed(1) : "—", unit: "°C", alert: !!vitals && (vitals.temp > 38 || vitals.temp < 35), color: "text-amber-400", icon: <Thermometer className="h-4 w-4" /> },
                { label: "G-Force",     value: vitals ? vitals.gforce.toFixed(2) : "—", unit: "G", alert: !!vitals && vitals.fall, color: "text-orange-400", icon: <Zap className="h-4 w-4" /> },
              ].map(v => (
                <div key={v.label} className={cn(
                  "rounded-xl border bg-panel p-4 transition-all",
                  v.alert ? "border-red-500/60 bg-red-950/20 animate-pulse" : "border-border"
                )}>
                  <div className="flex items-center gap-1.5 text-muted-foreground mb-2">
                    <span className={v.color}>{v.icon}</span>
                    <span className="text-xs">{v.label}</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-semibold font-mono">{v.value}</span>
                    <span className="text-xs text-muted-foreground">{v.unit}</span>
                  </div>
                  {v.alert && (
                    <p className="text-[10px] text-red-400 mt-1 flex items-center gap-1">
                      <AlertTriangle className="h-2.5 w-2.5" /> Alert
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* risk bar */}
            <div className="rounded-xl border border-border bg-panel p-5">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">Risk Score</span>
                <span className={cn(
                  "text-xs font-semibold px-2.5 py-0.5 rounded-full border",
                  TIER_LABEL[activeMeta?.expected_escalation_tier ?? 0]?.cls
                )}>
                  {TIER_LABEL[activeMeta?.expected_escalation_tier ?? 0]?.label}
                </span>
              </div>
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-4xl font-semibold font-mono">{vitals?.risk ?? 0}</span>
                <span className="text-muted-foreground text-sm">/ 100</span>
              </div>
              <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-700", riskColor(vitals?.risk ?? 0))}
                  style={{ width: `${vitals?.risk ?? 0}%` }}
                />
              </div>
            </div>

            {/* medical reference */}
            {activeMeta && (
              <div className="rounded-xl border border-border/50 bg-panel/50 px-4 py-3">
                <p className="text-[11px] text-muted-foreground">
                  <span className="text-violet-400 font-medium">Research Ref:</span>{" "}
                  {activeMeta.medical_ref}
                </p>
              </div>
            )}
          </div>

          {/* right column: system response + gap coverage */}
          <div className="space-y-4">
            <h2 className="text-xs uppercase tracking-widest text-muted-foreground">
              Expected System Response
            </h2>

            <div className="rounded-xl border border-border bg-panel p-4 space-y-2">
              {(activeMeta?.system_response ?? ["Monitoring vitals continuously…"]).map((r, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <ChevronRight className="h-3 w-3 text-violet-400 mt-0.5 shrink-0" />
                  <span className="text-muted-foreground leading-relaxed">{r}</span>
                </div>
              ))}
            </div>

            {/* Gap coverage */}
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Research Gap Coverage</p>
              <div className="space-y-1.5">
                {Object.entries(GAP_LABELS).map(([key, label]) => {
                  const covered = activeMeta?.gaps.includes(key) ?? false;
                  return (
                    <div key={key} className={cn(
                      "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-all",
                      covered ? (GAP_STYLES[key] + " shadow-sm") : "border-border/40 bg-panel text-muted-foreground"
                    )}>
                      <span className="font-mono font-bold w-5">{key}</span>
                      <span className="flex-1">{label}</span>
                      {covered && <CheckCircle2 className="h-3 w-3 shrink-0 opacity-70" />}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Wireless glove status */}
            <div className="rounded-xl border border-border bg-panel p-4">
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Wireless Glove Sync</p>
              <div className="flex items-center gap-2 mb-2">
                <div className={cn("h-2 w-2 rounded-full", status.esp32Connected ? "bg-emerald-400 animate-pulse" : "bg-zinc-600")} />
                <span className="text-xs">{status.esp32Connected ? "ESP32 receiving commands" : "ESP32 offline — simulation only"}</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Active: <span className="text-violet-300">{activeMeta?.label ?? "Normal Monitoring"}</span>
                <br />Glove polls <code className="text-xs bg-zinc-800 px-1 rounded">/api/glove/command</code> every 3s
              </p>
            </div>
          </div>
        </div>

        {/* ── role guide ─────────────────────────────────────────────── */}
        <section className="rounded-xl border border-border bg-panel p-6">
          <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-4">Sign In to Access Role Dashboard</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { role: "Patient",   icon: <Users className="h-5 w-5" />,   desc: "Live vitals, SOS button, medication reminders", route: "/login", color: "text-blue-400", border: "border-blue-700/30" },
              { role: "Doctor",    icon: <Shield className="h-5 w-5" />,   desc: "Patient fleet view, alerts, Groq AI insights", route: "/login", color: "text-violet-400", border: "border-violet-700/30" },
              { role: "Admin",     icon: <Database className="h-5 w-5" />, desc: "Device management, user roles, system config", route: "/login", color: "text-emerald-400", border: "border-emerald-700/30" },
            ].map(r => (
              <button
                key={r.role}
                onClick={() => navigate(r.route)}
                className={cn(
                  "flex flex-col items-start gap-3 rounded-lg border bg-panel-elevated p-5 text-left hover:scale-[1.02] transition-all",
                  r.border
                )}
              >
                <span className={r.color}>{r.icon}</span>
                <div>
                  <p className="font-semibold text-sm">{r.role}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{r.desc}</p>
                </div>
                <span className="text-xs text-muted-foreground flex items-center gap-1 mt-auto">
                  Sign in <LogIn className="h-3 w-3" />
                </span>
              </button>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
