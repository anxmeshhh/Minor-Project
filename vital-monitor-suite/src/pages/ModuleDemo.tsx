import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Database, Users, ClipboardList, Brain, Sparkles, Shield,
  Heart, Bell, Settings, CheckCircle2, XCircle, Activity,
  ArrowRight, Pill, Calendar, FileText, Zap, RefreshCw
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useHealthData } from "@/context/HealthDataContext";

const BASE = "http://localhost:5001";
async function api<T>(url: string): Promise<T | null> {
  try { const r = await fetch(url); if (!r.ok) return null; return await r.json() as T; } catch { return null; }
}

interface ModuleInfo {
  id: string;
  icon: any;
  title: string;
  description: string;
  color: string;
  borderColor: string;
  bgColor: string;
}

const MODULES: ModuleInfo[] = [
  { id: "database", icon: Database, title: "Module 1: Database", description: "Auto-created MySQL tables with full schema", color: "text-emerald-400", borderColor: "border-emerald-700/40", bgColor: "bg-emerald-900/15" },
  { id: "profile", icon: ClipboardList, title: "Module 2: User Profile", description: "Main data intake — CRUD for meds, checkups, docs", color: "text-blue-400", borderColor: "border-blue-700/40", bgColor: "bg-blue-900/15" },
  { id: "dataflow", icon: Activity, title: "Module 3: Data Flow", description: "Real-time pipeline: Input → DB → ML → AI → Output", color: "text-violet-400", borderColor: "border-violet-700/40", bgColor: "bg-violet-900/15" },
  { id: "ml", icon: Brain, title: "Module 4: ML Pipeline", description: "RandomForest pattern detection — separate from AI", color: "text-pink-400", borderColor: "border-pink-700/40", bgColor: "bg-pink-900/15" },
  { id: "ai", icon: Sparkles, title: "Module 5: AI Pipeline", description: "Groq LLaMA3-70B reasoning — separate from ML", color: "text-cyan-400", borderColor: "border-cyan-700/40", bgColor: "bg-cyan-900/15" },
  { id: "dashboard", icon: Heart, title: "Module 6: Dashboard", description: "Dynamic combined view — no hardcoding", color: "text-red-400", borderColor: "border-red-700/40", bgColor: "bg-red-900/15" },
  { id: "family", icon: Users, title: "Module 7: Family Hub", description: "WhatsApp-like group for shared health data", color: "text-amber-400", borderColor: "border-amber-700/40", bgColor: "bg-amber-900/15" },
  { id: "doctor", icon: Shield, title: "Module 8: Doctor System", description: "Doctor profile + patient request + response flow", color: "text-teal-400", borderColor: "border-teal-700/40", bgColor: "bg-teal-900/15" },
  { id: "notifications", icon: Bell, title: "Module 9: Notifications", description: "Patient + family notified on all events", color: "text-orange-400", borderColor: "border-orange-700/40", bgColor: "bg-orange-900/15" },
  { id: "admin", icon: Settings, title: "Module 10: Admin Panel", description: "View all users, logs, ML/AI outputs", color: "text-indigo-400", borderColor: "border-indigo-700/40", bgColor: "bg-indigo-900/15" },
];

export default function ModuleDemo() {
  const { family, notifications, doctorRequests, getSelf, loading } = useHealthData();
  const self = getSelf();

  const [stats, setStats] = useState<any>(null);
  const [mlInfo, setMlInfo] = useState<any>(null);
  const [flaskOnline, setFlaskOnline] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = useCallback(async () => {
    setRefreshing(true);
    const [s, ml, health] = await Promise.all([
      api<any>(`${BASE}/api/admin/stats`),
      api<any>(`${BASE}/api/ml/info`),
      api<any>(`${BASE}/health`),
    ]);
    if (s) { setStats(s); setFlaskOnline(true); }
    if (ml) setMlInfo(ml);
    setRefreshing(false);
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  const moduleStatus = (id: string): { ok: boolean; detail: string } => {
    switch (id) {
      case "database":
        return { ok: !!stats, detail: stats ? `${stats.total_family_members} members · ${stats.total_health_entries} entries · ${stats.total_ml_results} ML · ${stats.total_ai_results} AI` : "Server offline" };
      case "profile":
        return { ok: self.medications.length > 0 || self.medicalHistory.length > 0, detail: `${self.medications.length} meds · ${self.checkups.length} checkups · ${self.medicalHistory.length} history · ${self.prescriptions.length} prescriptions` };
      case "dataflow":
        return { ok: !!stats && stats.total_ml_results > 0, detail: `${stats?.total_telemetry || 0} telemetry readings → ${stats?.total_ml_results || 0} ML results → ${stats?.total_ai_results || 0} AI results` };
      case "ml":
        return { ok: !!mlInfo?.model_ready, detail: mlInfo?.model_ready ? `${mlInfo.best_algorithm} · ${(mlInfo.cv_accuracy * 100).toFixed(1)}% accuracy · ${mlInfo.classes?.length || 0} classes` : "Model not trained" };
      case "ai":
        return { ok: self.aiResults.length > 0, detail: self.aiResults.length > 0 ? `${self.aiResults.length} results · Latest: ${self.aiResults[0]?.urgency || "—"} urgency` : "No AI results yet — run scan from Family Hub" };
      case "dashboard":
        return { ok: self.medications.length > 0 && self.mlResults.length > 0, detail: "Vitals + Meds + Checkups + ML + AI — all from DB" };
      case "family":
        return { ok: family.members.length > 0, detail: `${family.name} · ${family.members.length} members` };
      case "doctor":
        return { ok: doctorRequests.length > 0, detail: `${doctorRequests.length} requests · ${doctorRequests.filter(r => r.status === "accepted").length} accepted` };
      case "notifications":
        return { ok: notifications.length > 0, detail: `${notifications.length} notifications · ${notifications.filter(n => !n.is_read).length} unread` };
      case "admin":
        return { ok: !!stats, detail: stats ? `${stats.total_patients} patients · ${stats.total_doctors} doctors · ${stats.total_notifications} notifications` : "Server offline" };
      default:
        return { ok: false, detail: "Unknown" };
    }
  };

  const workingCount = MODULES.filter(m => moduleStatus(m.id).ok).length;

  return (
    <motion.main
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-[calc(100vh-3.5rem)] bg-background"
    >
      <div className="container py-8 max-w-6xl space-y-6">
        {/* Header */}
        <header className="flex items-end justify-between">
          <div>
            <p className="text-sm uppercase tracking-widest text-muted-foreground">System Demonstration</p>
            <h1 className="text-3xl font-semibold tracking-tight">Module-by-Module Proof</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Each module shown separately — proves ML ≠ AI, data flows from DB, zero hardcoding
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className={cn("h-2.5 w-2.5 rounded-full", flaskOnline ? "bg-emerald-400 animate-pulse" : "bg-red-400")} />
              <span className="text-xs text-muted-foreground">{flaskOnline ? "Flask Online" : "Flask Offline"}</span>
            </div>
            <Button size="sm" variant="outline" onClick={loadStats} disabled={refreshing}>
              <RefreshCw className={cn("h-3.5 w-3.5 mr-1", refreshing && "animate-spin")} />Refresh
            </Button>
          </div>
        </header>

        {/* Score Badge */}
        <div className="flex items-center gap-4 px-5 py-4 rounded-xl border border-primary/30 bg-primary/5">
          <div className="text-center">
            <p className="text-4xl font-bold text-primary">{workingCount}/{MODULES.length}</p>
            <p className="text-xs text-muted-foreground">Modules Active</p>
          </div>
          <div className="flex-1">
            <div className="h-3 rounded-full bg-secondary overflow-hidden">
              <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${(workingCount / MODULES.length) * 100}%` }} />
            </div>
          </div>
          {workingCount === MODULES.length && (
            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-700/40 animate-pulse">All Systems Go ✓</Badge>
          )}
        </div>

        {/* Pipeline Visualization */}
        <Card className="p-5 border-violet-700/30 bg-violet-950/10">
          <p className="text-xs uppercase tracking-wider text-violet-300 mb-3 font-medium">Complete Data Pipeline</p>
          <div className="flex items-center gap-1 overflow-x-auto pb-2">
            {["PROFILE INPUT", "FAMILY HUB", "SENSOR DATA", "DATABASE (CRUD)", "ML PIPELINE", "AI PIPELINE", "DOCTOR ANALYSIS", "PATIENT + FAMILY OUTPUT"].map((step, i) => (
              <div key={i} className="flex items-center gap-1 shrink-0">
                {i > 0 && <ArrowRight className="h-3.5 w-3.5 text-violet-500 shrink-0" />}
                <span className={cn(
                  "text-[10px] px-2.5 py-1 rounded-md border font-medium whitespace-nowrap",
                  i === 0 ? "bg-emerald-900/30 border-emerald-700/30 text-emerald-300" :
                  i === 7 ? "bg-emerald-900/30 border-emerald-700/30 text-emerald-300" :
                  i === 4 ? "bg-pink-900/30 border-pink-700/30 text-pink-300" :
                  i === 5 ? "bg-cyan-900/30 border-cyan-700/30 text-cyan-300" :
                  "bg-violet-900/20 border-violet-700/30 text-violet-300"
                )}>{step}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Module Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {MODULES.map(mod => {
            const Icon = mod.icon;
            const status = moduleStatus(mod.id);
            return (
              <Card key={mod.id} className={cn("p-5 border transition-all", mod.borderColor, status.ok && mod.bgColor)}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className={cn("grid h-9 w-9 place-items-center rounded-lg border", mod.borderColor, mod.bgColor)}>
                      <Icon className={cn("h-4.5 w-4.5", mod.color)} />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold">{mod.title}</h3>
                      <p className="text-[11px] text-muted-foreground">{mod.description}</p>
                    </div>
                  </div>
                  {status.ok ? (
                    <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-700/40 shrink-0">
                      <CheckCircle2 className="h-3 w-3 mr-1" />Active
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="shrink-0">
                      <XCircle className="h-3 w-3 mr-1" />Inactive
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{status.detail}</p>

                {/* Module-specific details */}
                {mod.id === "ml" && mlInfo?.model_ready && (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <div className="rounded bg-pink-900/20 border border-pink-700/30 px-2 py-1.5 text-center">
                      <p className="text-[10px] text-pink-300">Algorithm</p>
                      <p className="text-xs font-medium text-pink-100">{mlInfo.best_algorithm}</p>
                    </div>
                    <div className="rounded bg-pink-900/20 border border-pink-700/30 px-2 py-1.5 text-center">
                      <p className="text-[10px] text-pink-300">Accuracy</p>
                      <p className="text-xs font-medium text-pink-100">{(mlInfo.cv_accuracy * 100).toFixed(1)}%</p>
                    </div>
                    <div className="rounded bg-pink-900/20 border border-pink-700/30 px-2 py-1.5 text-center">
                      <p className="text-[10px] text-pink-300">Classes</p>
                      <p className="text-xs font-medium text-pink-100">{mlInfo.classes?.length || 0}</p>
                    </div>
                  </div>
                )}

                {mod.id === "ai" && self.aiResults.length > 0 && (
                  <div className="mt-3 rounded bg-cyan-900/20 border border-cyan-700/30 px-3 py-2">
                    <p className="text-[10px] text-cyan-300 mb-1">Latest AI Advice</p>
                    <p className="text-xs text-cyan-100/80 line-clamp-2">{self.aiResults[0]?.advice}</p>
                  </div>
                )}

                {mod.id === "database" && stats && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {Object.entries(stats).slice(0, 8).map(([k, v]) => (
                      <span key={k} className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-900/20 border border-emerald-700/30 text-emerald-300">
                        {k.replace("total_", "").replace("_", " ")}: {v as number}
                      </span>
                    ))}
                  </div>
                )}

                {mod.id === "profile" && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {[
                      { l: "Medications", c: self.medications.length },
                      { l: "Checkups", c: self.checkups.length },
                      { l: "History", c: self.medicalHistory.length },
                      { l: "Prescriptions", c: self.prescriptions.length },
                      { l: "Doctor Notes", c: self.doctorNotes.length },
                    ].map(i => (
                      <span key={i.l} className={cn("text-[9px] px-1.5 py-0.5 rounded border",
                        i.c > 0 ? "bg-blue-900/20 border-blue-700/30 text-blue-300" : "bg-zinc-900/40 border-zinc-700/30 text-zinc-400")}>
                        {i.l}: {i.c}
                      </span>
                    ))}
                  </div>
                )}

                {mod.id === "family" && (
                  <div className="mt-3 flex gap-2">
                    {family.members.map(m => (
                      <span key={m.id} className="text-[9px] px-2 py-0.5 rounded-full bg-amber-900/20 border border-amber-700/30 text-amber-300">
                        {m.name} ({m.relation})
                      </span>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        {/* ML ≠ AI Clarification */}
        <Card className="p-5 border-primary/30 bg-primary/5">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">⚠️ Critical Rule: ML ≠ AI</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg bg-pink-900/20 border border-pink-700/30 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="h-4 w-4 text-pink-400" />
                <p className="text-sm font-semibold text-pink-200">ML Pipeline (DETECTS)</p>
              </div>
              <ul className="space-y-1 text-xs text-pink-100/80">
                <li>• Input: Sensor data + basic health data</li>
                <li>• Process: RandomForest classification</li>
                <li>• Output: Tachycardia / Hypoxia / Fall / etc.</li>
                <li>• Confidence %</li>
                <li>• Stored in: <code className="bg-pink-900/40 px-1 rounded">ml_results</code> table</li>
              </ul>
            </div>
            <div className="rounded-lg bg-cyan-900/20 border border-cyan-700/30 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-cyan-400" />
                <p className="text-sm font-semibold text-cyan-200">AI Pipeline (EXPLAINS)</p>
              </div>
              <ul className="space-y-1 text-xs text-cyan-100/80">
                <li>• Input: Profile + Family + ML Output + Rules</li>
                <li>• Process: Groq LLaMA3-70B reasoning</li>
                <li>• Output: Advice + Urgency + Timeline</li>
                <li>• Doctor suggestion</li>
                <li>• Stored in: <code className="bg-cyan-900/40 px-1 rounded">ai_results</code> table</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </motion.main>
  );
}
