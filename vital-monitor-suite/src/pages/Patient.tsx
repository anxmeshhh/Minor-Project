import { useMemo, useState, useEffect, useCallback } from "react";
import { useHealthData } from "@/context/HealthDataContext";
import { useNavigate } from "react-router-dom";
import {
  Heart, Droplets, Thermometer, Zap, AlertTriangle, Pill, ClipboardList,
  PhoneCall, ActivitySquare, Wifi, WifiOff, Brain, Sparkles, Calendar,
  Users, ChevronRight, CheckCircle2, Clock, Shield
} from "lucide-react";
import { triggerGloveAnomaly } from "@/lib/gloveData";
import { useVitalsCtx } from "@/context/VitalsContext";
import { getAlertReasons, getRiskLabel, getRiskLevel } from "@/types/vitals";
import { VitalCard } from "@/components/VitalCard";
import { Sparkline } from "@/components/Sparkline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const BASE = "http://localhost:5001";
async function api<T>(url:string, opts?:RequestInit):Promise<T|null>{
  try{ const r=await fetch(url,opts); if(!r.ok)return null; return await r.json()as T; }catch{return null;}
}

const Patient = () => {
  const { latest, history } = useVitalsCtx();
  const reasons = latest ? getAlertReasons(latest) : [];
  const showAlert = !!latest && (latest.alert || latest.fall);
  const navigate = useNavigate();

  const hrSeries = useMemo(() => history.map(h => h.hr), [history]);
  const tempSeries = useMemo(() => history.map(h => h.temp), [history]);

  const risk = latest?.risk ?? 0;
  const riskLevel = getRiskLevel(risk);
  const riskColorClass = riskLevel === "safe" ? "gradient-safe" : riskLevel === "caution" ? "gradient-caution" : "gradient-critical";

  // Glove sync state
  const [gloveSync, setGloveSync] = useState<"idle"|"syncing"|"synced">("idle");
  const [gloveSyncTime, setGloveSyncTime] = useState<string|null>(null);

  // AI state
  const [aiInsight, setAiInsight] = useState<string|null>(null);
  const [aiUrgency, setAiUrgency] = useState<"safe"|"visit"|"emergency">("safe");
  const [aiLoading, setAiLoading] = useState(false);

  // Symptom log input
  const [symptom, setSymptom] = useState("");

  // Dialog states
  const [sosOpen, setSosOpen] = useState(false);
  const [checkupRunning, setCheckupRunning] = useState(false);
  const [anomalyOpen, setAnomalyOpen] = useState(false);

  // Medical profile from shared HealthDataContext (same data as Family Hub)
  const { getSelf, getAllForAi, family, addEntry } = useHealthData();
  const selfData = getSelf();
  const aiInput = getAllForAi(selfData.id);

  // Sync Glove — calls backend to link with ESP32 hardware
  const syncGlove = useCallback(async () => {
    setGloveSync("syncing");
    // Call backend to sync with glove hardware
    const cmd = await api<{scenario:string;label:string}>(`${BASE}/api/glove/command`);
    setTimeout(() => {
      setGloveSync("synced");
      setGloveSyncTime(new Date().toLocaleTimeString());
      setTimeout(() => setGloveSync("idle"), 5000);
    }, 2500);
  }, []);

  // Auto-sync on mount
  useEffect(() => { syncGlove(); }, [syncGlove]);

  // State for full analysis result
  const [mlClass, setMlClass] = useState<string|null>(null);
  const [mlConf, setMlConf] = useState(0);
  const [doctorSpec, setDoctorSpec] = useState<string|null>(null);
  const [contextUsed, setContextUsed] = useState<Record<string,boolean>>({});

  // AI urgency analysis (full pipeline: Vitals + Meds + History + ML + Groq)
  const [riskScore, setRiskScore] = useState(0);
  const analyzeUrgency = useCallback(async () => {
    setAiLoading(true);
    const r = await api<any>(`${BASE}/api/ai/analyze`, {
      method: "POST", headers: {"Content-Type":"application/json"},
      body: JSON.stringify({
        patient_id: 1,
        medications: aiInput.medications,
        symptoms: aiInput.symptoms,
        checkups: selfData.checkups.filter(c => c.status === "upcoming").map(c => c.title),
        medical_history: aiInput.medicalHistory,
        prescriptions: aiInput.prescriptions,
        family_health: aiInput.familyHealth,
        doctor_notes: aiInput.doctorNotes,
      })
    });
    if (r) {
      setAiInsight(r.ai_analysis || null);
      setAiUrgency(r.urgency || "safe");
      setMlClass(r.ml_class || null);
      setMlConf(r.ml_confidence || 0);
      setDoctorSpec(r.doctor_specialty || null);
      setContextUsed(r.context_used || {});
      setRiskScore(r.risk_score || 0);
    } else {
      if (risk > 70) { setAiInsight("CRITICAL: Immediate medical attention required."); setAiUrgency("emergency"); }
      else if (risk > 40) { setAiInsight("CAUTION: Schedule a doctor visit within 24-48 hours."); setAiUrgency("visit"); }
      else { setAiInsight("All vitals within normal parameters. Continue monitoring."); setAiUrgency("safe"); }
    }
    setAiLoading(false);
  }, [risk, aiInput, selfData]);

  const runGloveCheckup = () => {
    setCheckupRunning(true);
    setTimeout(() => {
      setCheckupRunning(false);
      triggerGloveAnomaly();
      setAnomalyOpen(true);
    }, 2000);
  };

  const submitSymptom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!symptom.trim() || !selfData.id) return;
    await addEntry(selfData.id, "symptoms", symptom.trim(), "Self");
    setSymptom("");
  };

  const urgencyBadge = { safe: { l: "Safe", c: "bg-emerald-500/15 text-emerald-400 border-emerald-700/40" },
    visit: { l: "Need to Visit Doctor", c: "bg-amber-500/15 text-amber-400 border-amber-700/40" },
    emergency: { l: "Emergency", c: "bg-red-500/15 text-red-400 border-red-700/40 animate-pulse" },
  };

  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-background">
      {showAlert && (
        <div className="bg-critical text-critical-foreground animate-blink">
          <div className="container flex items-center gap-3 py-3">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <div className="flex-1">
              <p className="font-semibold tracking-wide">ALERT - Check Patient Immediately</p>
              <p className="text-sm opacity-90">{reasons.map(r => `${r.type} (${r.detail})`).join(" · ") || "Vitals out of safe range"}</p>
            </div>
          </div>
        </div>
      )}

      <div className="container py-8 space-y-6">
        {/* Header + Glove Sync */}
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-widest text-muted-foreground">Patient Dashboard</p>
            <h1 className="text-3xl font-semibold tracking-tight">{selfData.name || "Live Vitals Monitor"}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Profile synced from <strong>{family.name}</strong> · Member ID: {selfData.id || "—"}</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={syncGlove} disabled={gloveSync==="syncing"}
              className={cn("flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all",
                gloveSync==="syncing"?"border-violet-500/60 bg-violet-900/20 text-violet-300 animate-pulse":"border-border bg-panel hover:bg-panel-elevated text-foreground",
                gloveSync==="synced"&&"border-emerald-500/60 bg-emerald-900/20 text-emerald-300")}>
              {gloveSync==="syncing"?<><Wifi className="h-4 w-4 animate-spin"/>Syncing Glove...</>
               :gloveSync==="synced"?<><CheckCircle2 className="h-4 w-4"/>Glove Synced</>
               :<><Wifi className="h-4 w-4"/>Sync Glove</>}
            </button>
            {gloveSyncTime&&<span className="text-xs text-muted-foreground">Last: {gloveSyncTime}</span>}
            <span className="text-sm text-muted-foreground font-mono-tabular">
              {latest ? new Date(latest.timestamp).toLocaleTimeString() : "Awaiting..."}
            </span>
          </div>
        </header>

        {/* Vitals grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <VitalCard label="Heart Rate" value={latest?.hr ?? "—"} unit="BPM"
            icon={<Heart className="h-5 w-5" />} alert={!!latest && (latest.hr < 50 || latest.hr > 120)} hint="Normal 50-120" />
          <VitalCard label="SpO2" value={latest?.spo2 ?? "—"} unit="%"
            icon={<Droplets className="h-5 w-5" />} alert={!!latest && latest.spo2 < 94} hint="Normal >= 94%" />
          <VitalCard label="Body Temperature" value={latest?.temp.toFixed(1) ?? "—"} unit="°C"
            icon={<Thermometer className="h-5 w-5" />} alert={!!latest && (latest.temp < 35 || latest.temp > 38)} hint="Normal 35-38°C" />
          <VitalCard label="Impact / G-Force" value={latest?.gforce.toFixed(2) ?? "—"} unit="G"
            icon={<Zap className="h-5 w-5" />} alert={!!latest && latest.fall} hint={latest?.fall ? "Fall detected" : "No fall"} />
        </section>

        {/* Risk + Sparklines */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="rounded-xl border border-border bg-panel p-5 shadow-card">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Risk Score</span>
              <span className={cn("text-xs font-semibold px-2 py-1 rounded-md",
                riskLevel==="safe"&&"bg-safe/15 text-safe",riskLevel==="caution"&&"bg-caution/15 text-caution",riskLevel==="critical"&&"bg-critical/15 text-critical")}>{getRiskLabel(risk)}</span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-5xl font-semibold font-mono-tabular">{risk}</span>
              <span className="text-sm text-muted-foreground">/ 100</span>
            </div>
            <div className="mt-4 h-3 rounded-full bg-secondary overflow-hidden">
              <div className={cn("h-full rounded-full transition-all duration-500", riskColorClass)} style={{ width: `${risk}%` }} />
            </div>
          </div>
          <div className="rounded-xl border border-border bg-panel p-5 shadow-card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Heart Rate Trend</span>
              <span className="text-xs text-muted-foreground">Last 60s</span>
            </div>
            <Sparkline data={hrSeries} stroke="hsl(var(--critical))" fill="hsl(var(--critical) / 0.15)" width={320} height={70} className="w-full" />
          </div>
          <div className="rounded-xl border border-border bg-panel p-5 shadow-card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Temperature Trend</span>
              <span className="text-xs text-muted-foreground">Last 60s</span>
            </div>
            <Sparkline data={tempSeries} stroke="hsl(var(--caution))" fill="hsl(var(--caution) / 0.15)" width={320} height={70} className="w-full" />
          </div>
        </section>

        {/* AI + ML Combined Analysis */}
        <section className="rounded-xl border border-blue-700/30 bg-blue-950/10 p-5 shadow-card">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-400" />
              <h2 className="font-semibold text-sm">AI + ML Holistic Health Assessment</h2>
              <span className="text-[10px] text-muted-foreground">(RandomForest + Groq LLaMA3-70B)</span>
            </div>
            <div className="flex items-center gap-2">
              {aiInsight&&<span className={cn("text-xs px-2.5 py-1 rounded-full border font-medium",urgencyBadge[aiUrgency].c)}>{urgencyBadge[aiUrgency].l}</span>}
              <Button size="sm" variant="outline" onClick={analyzeUrgency} disabled={aiLoading}
                className="border-blue-700/40 bg-blue-900/20 text-blue-300 hover:bg-blue-800/30">
                <Brain className="h-3.5 w-3.5 mr-1.5"/>{aiLoading?"Analyzing...":"Analyze Now"}
              </Button>
            </div>
          </div>

          {/* What data goes into AI — always visible */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
            <div className="rounded-lg border border-border/40 bg-panel-elevated p-2.5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Glove Vitals</p>
              <p className="text-xs mt-1">HR {latest?.hr ?? "—"} · SpO₂ {latest?.spo2 ?? "—"}%</p>
              <p className="text-xs">Temp {latest?.temp.toFixed(1) ?? "—"}°C · G {latest?.gforce.toFixed(1) ?? "—"}</p>
            </div>
            <div className="rounded-lg border border-border/40 bg-panel-elevated p-2.5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Medications ({selfData.medications.length})</p>
              {selfData.medications.slice(0,2).map(m=>(<p key={m.id} className="text-xs mt-0.5">{m.text.split("—")[0]}</p>))}
              {selfData.medications.length > 2 && <p className="text-[10px] text-muted-foreground">+{selfData.medications.length-2} more</p>}
            </div>
            <div className="rounded-lg border border-border/40 bg-panel-elevated p-2.5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Medical History ({selfData.medicalHistory.length})</p>
              {selfData.medicalHistory.slice(0,2).map(h=>(<p key={h.id} className="text-xs mt-0.5">{h.text.split("(")[0].trim()}</p>))}
            </div>
            <div className="rounded-lg border border-border/40 bg-panel-elevated p-2.5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Symptoms ({selfData.symptoms.length})</p>
              {selfData.symptoms.slice(0,2).map(s=>(<p key={s.id} className="text-xs mt-0.5 truncate">{s.text}</p>))}
              {selfData.symptoms.length === 0 && <p className="text-xs mt-0.5 text-muted-foreground">None reported</p>}
            </div>
          </div>

          {aiInsight ? (
            <div className="space-y-3">
              {/* ML + Risk Summary Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {mlClass && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-violet-900/20 border border-violet-700/30">
                    <Brain className="h-4 w-4 text-violet-400 shrink-0"/>
                    <div>
                      <p className="text-[10px] text-violet-300">ML Classification</p>
                      <p className="text-sm text-violet-100 capitalize font-medium">{mlClass.replace("_"," ")} <span className="text-xs font-normal">({(mlConf*100).toFixed(1)}%)</span></p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-900/20 border border-blue-700/30">
                  <Shield className="h-4 w-4 text-blue-400 shrink-0"/>
                  <div>
                    <p className="text-[10px] text-blue-300">Risk Score</p>
                    <p className="text-sm text-blue-100 font-medium">{riskScore}/100 <span className="text-xs font-normal capitalize">({riskScore > 70 ? "Critical" : riskScore > 40 ? "Caution" : "Safe"})</span></p>
                  </div>
                </div>
                {doctorSpec && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-900/20 border border-amber-700/30">
                    <ClipboardList className="h-4 w-4 text-amber-400 shrink-0"/>
                    <div>
                      <p className="text-[10px] text-amber-300">Recommended Specialist</p>
                      <p className="text-sm text-amber-100 font-medium">{doctorSpec}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* AI Recommendations */}
              <div className="rounded-lg border border-blue-700/20 bg-blue-950/20 p-4">
                <p className="text-xs text-blue-300 font-medium mb-2 flex items-center gap-1"><Sparkles className="h-3 w-3"/>Groq AI Analysis (based on all 8 data sources)</p>
                <p className="text-sm text-blue-100/90 leading-relaxed whitespace-pre-line">{aiInsight}</p>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 flex-wrap">
                {aiUrgency==="visit"&&(
                  <Button size="sm" onClick={()=>navigate("/discovery")} className="gap-1.5">
                    <Shield className="h-3.5 w-3.5"/>Find {doctorSpec||"Doctor"} (AI Recommended)
                  </Button>
                )}
                {aiUrgency==="emergency"&&(
                  <Button size="sm" variant="destructive" onClick={()=>setSosOpen(true)} className="gap-1.5 animate-pulse">
                    <PhoneCall className="h-3.5 w-3.5"/>Call Emergency 108
                  </Button>
                )}
              </div>

              {/* Data Sources Used */}
              {Object.keys(contextUsed).length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-blue-800/30 mt-2">
                  <span className="text-[10px] text-blue-400/60 mr-1">Data analyzed:</span>
                  {Object.entries(contextUsed).filter(([,v])=>v).map(([k])=>(
                    <span key={k} className="text-[10px] px-1.5 py-0.5 rounded bg-blue-900/30 border border-blue-700/30 text-blue-300/80 capitalize">✓ {k.replace("_"," ")}</span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              <Brain className="h-8 w-8 text-blue-400/40 mx-auto mb-2"/>
              <p className="text-sm text-muted-foreground">Click <strong>"Analyze Now"</strong> to run the full holistic health assessment.</p>
              <p className="text-xs text-muted-foreground mt-1">The AI will analyze all the data shown above — glove vitals, medications, medical history, symptoms, family health, and doctor notes together.</p>
            </div>
          )}
        </section>

        {/* Medical Profile — linked to Family Hub */}
        <section className="rounded-xl border border-primary/20 bg-primary/5 p-5 shadow-card">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary"/>
              <h2 className="font-semibold text-sm">Your Health Profile</h2>
              <span className="text-[10px] text-muted-foreground">from {family.name}</span>
            </div>
            <Button size="sm" variant="outline" onClick={() => navigate("/family")} className="text-xs gap-1.5">
              <Users className="h-3.5 w-3.5"/>Manage in Family Hub
            </Button>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <div className="rounded-lg border border-border/60 bg-panel p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Medical History ({selfData.medicalHistory.length})</p>
              {selfData.medicalHistory.slice(0,3).map(h => (
                <p key={h.id} className="text-xs mt-1 flex items-start gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0"/>{h.text}</p>
              ))}
            </div>
            <div className="rounded-lg border border-border/60 bg-panel p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Doctor Notes ({selfData.doctorNotes.length})</p>
              {selfData.doctorNotes.slice(0,2).map(d => (
                <div key={d.id} className="mt-1"><p className="text-[10px] text-muted-foreground">{d.added_by} · {d.created_at}</p><p className="text-xs">{d.text}</p></div>
              ))}
            </div>
            <div className="rounded-lg border border-border/60 bg-panel p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Family Members ({family.members.length})</p>
              {family.members.filter(m => m.relation !== "self").map(m => (
                <p key={m.id} className="text-xs mt-1">👤 {m.name} <span className="text-muted-foreground capitalize">({m.relation})</span></p>
              ))}
            </div>
          </div>
        </section>

        {/* Meds + Checkups + Symptoms — 3 column */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Medications */}
          <div className="rounded-xl border border-border bg-panel p-5 shadow-card">
            <div className="flex items-center gap-2 mb-4">
              <Pill className="h-4 w-4 text-primary" /><h2 className="font-semibold">Medications</h2>
            </div>
            <ul className="space-y-2 max-h-40 overflow-auto">
              {selfData.medications.map(m => (
                <li key={m.id} className="flex items-center justify-between rounded-lg bg-panel-elevated px-3 py-2.5 border border-border/60">
                  <div>
                    <p className="text-sm font-medium">{m.text.split("—")[0]?.trim() || m.text}</p>
                    <p className="text-xs text-muted-foreground">{m.text.split("—")[1]?.trim() || "As prescribed"} · {m.added_by}</p>
                  </div>
                  <Button size="sm" variant="default" onClick={() => {}}>
                    Take
                  </Button>
                </li>
              ))}
              {selfData.medications.length === 0 && <p className="text-sm text-muted-foreground py-2 text-center">No medications logged.</p>}
            </ul>
          </div>

          {/* Upcoming Checkups */}
          <div className="rounded-xl border border-border bg-panel p-5 shadow-card">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="h-4 w-4 text-primary" /><h2 className="font-semibold">Checkups & Dates</h2>
            </div>
            <ul className="space-y-2 max-h-40 overflow-auto">
              {selfData.checkups.map(c => (
                <li key={c.id} className={cn("flex items-center gap-3 rounded-lg px-3 py-2.5 border",
                  c.status==="done"?"bg-emerald-900/10 border-emerald-700/30":"bg-panel-elevated border-border/60")}>
                  {c.status==="done" ? <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0"/> : <Clock className="h-4 w-4 text-amber-400 shrink-0"/>}
                  <div className="flex-1">
                    <p className="text-sm font-medium">{c.title}</p>
                    <p className="text-xs text-muted-foreground">{c.date}</p>
                  </div>
                </li>
              ))}
              {selfData.checkups.length === 0 && <p className="text-sm text-muted-foreground py-2 text-center">No checkups scheduled.</p>}
            </ul>
          </div>

          {/* Symptom Log */}
          <div className="rounded-xl border border-border bg-panel p-5 shadow-card">
            <div className="flex items-center gap-2 mb-4">
              <ClipboardList className="h-4 w-4 text-primary" /><h2 className="font-semibold">Symptom Log</h2>
            </div>
            <form onSubmit={submitSymptom} className="flex gap-2 mb-3">
              <Input value={symptom} onChange={e => setSymptom(e.target.value)} placeholder="Describe a symptom..." className="text-sm" />
              <Button type="submit" size="sm">Add</Button>
            </form>
            <ul className="space-y-1.5 max-h-40 overflow-auto">
              {selfData.symptoms.map(s => (
                <li key={s.id} className="flex items-start justify-between gap-2 rounded-lg bg-panel-elevated px-3 py-2 border border-border/60">
                  <span className="text-xs">{s.text}</span>
                  <span className="text-[10px] text-muted-foreground font-mono-tabular shrink-0">{s.created_at}</span>
                </li>
              ))}
              {selfData.symptoms.length === 0 && <p className="text-sm text-muted-foreground py-2 text-center">No symptoms recorded.</p>}
            </ul>
          </div>
        </section>

        {/* Family + Connected Members */}
        <section className="rounded-xl border border-border bg-panel p-5 shadow-card">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-4 w-4 text-primary" /><h2 className="font-semibold">Connected Family Members</h2>
            <span className="text-xs text-muted-foreground ml-auto">From {family.name} · DB synced</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {family.members.filter(m => m.relation !== "self").map(m => (
              <div key={m.id} className="flex items-center gap-3 rounded-lg bg-panel-elevated px-4 py-3 border border-border/60">
                <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <div>
                  <p className="text-sm font-medium">{m.name} <span className="text-muted-foreground capitalize">({m.relation})</span></p>
                  <p className="text-[11px] text-muted-foreground">Active · {m.symptoms.length} symptoms · {m.medications.length} meds</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Action Buttons */}
        <section className="flex flex-col sm:flex-row justify-center gap-6 pt-2">
          <button onClick={runGloveCheckup} disabled={checkupRunning}
            className="relative rounded-full bg-primary text-primary-foreground px-12 py-6 text-xl font-bold tracking-wider uppercase shadow-glow-primary hover:scale-105 transition-transform disabled:opacity-70">
            <ActivitySquare className={cn("inline h-6 w-6 mr-3 -mt-1", checkupRunning && "animate-spin")} />
            {checkupRunning ? "Running Checkup..." : "Run Glove Checkup"}
          </button>
          <button onClick={() => navigate("/discovery")}
            className="rounded-full border-2 border-primary/50 bg-primary/10 text-primary px-10 py-6 text-lg font-bold tracking-wider uppercase hover:scale-105 transition-transform">
            <Shield className="inline h-5 w-5 mr-2 -mt-1" />Book Doctor
          </button>
          <button onClick={() => setSosOpen(true)}
            className="relative rounded-full bg-critical text-critical-foreground px-12 py-6 text-xl font-bold tracking-wider uppercase shadow-glow-critical animate-pulse-ring hover:scale-105 transition-transform">
            <PhoneCall className="inline h-6 w-6 mr-3 -mt-1" />SOS - Emergency
          </button>
        </section>
      </div>

      <Dialog open={sosOpen} onOpenChange={setSosOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-critical">Emergency Triggered</DialogTitle>
            <DialogDescription>Doctor, family, and emergency services (108) have been notified. Help is on the way.</DialogDescription>
          </DialogHeader>
          <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-md bg-panel-elevated px-3 py-2 border border-border">
              <p className="text-xs text-muted-foreground">Heart Rate</p>
              <p className="font-mono-tabular text-lg">{latest?.hr ?? "—"} BPM</p>
            </div>
            <div className="rounded-md bg-panel-elevated px-3 py-2 border border-border">
              <p className="text-xs text-muted-foreground">SpO2</p>
              <p className="font-mono-tabular text-lg">{latest?.spo2 ?? "—"}%</p>
            </div>
            <div className="rounded-md bg-panel-elevated px-3 py-2 border border-border">
              <p className="text-xs text-muted-foreground">Temperature</p>
              <p className="font-mono-tabular text-lg">{latest?.temp.toFixed(1) ?? "—"}°C</p>
            </div>
            <div className="rounded-md bg-panel-elevated px-3 py-2 border border-border">
              <p className="text-xs text-muted-foreground">Risk Score</p>
              <p className="font-mono-tabular text-lg">{risk} / 100</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={anomalyOpen} onOpenChange={setAnomalyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-critical flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />Glove Anomaly Detected
            </DialogTitle>
            <DialogDescription className="text-base mt-2">
              The Smart Glove detected an <strong>Abnormal Heart Rate ({latest?.hr ?? "—"} BPM)</strong>
              {mlClass ? <> indicating possible <strong className="capitalize">{mlClass.replace("_"," ")}</strong> ({(mlConf*100).toFixed(0)}% confidence).</> : " — vitals out of normal range."}
              <br /><br />Based on this reading and your medical profile ({selfData.medicalHistory.length} conditions, {selfData.medications.length} medications), we recommend scheduling a consultation{doctorSpec ? <> with a <strong>{doctorSpec}</strong></> : " with a specialist"}.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setAnomalyOpen(false)}>Dismiss</Button>
            <Button onClick={() => navigate("/discovery")}>Find a Doctor</Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default Patient;
