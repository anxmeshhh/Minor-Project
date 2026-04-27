import { useMemo, useState, useEffect, useCallback } from "react";
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

interface Reminder { id: string; label: string; time: string; taken: boolean; dose: string; }
interface Checkup { id: string; title: string; date: string; status: "upcoming"|"done"; }

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

  // Medication reminders
  const [reminders, setReminders] = useState<Reminder[]>([
    { id: "1", label: "Metoprolol 50mg", time: "8:00 AM", taken: false, dose: "1 tablet" },
    { id: "2", label: "Aspirin 75mg",    time: "1:00 PM", taken: false, dose: "1 tablet" },
    { id: "3", label: "Atorvastatin 20mg", time: "9:00 PM", taken: false, dose: "1 tablet" },
    { id: "4", label: "Vitamin D3",      time: "9:00 AM", taken: true,  dose: "1 capsule" },
  ]);

  // Upcoming checkups
  const [checkups] = useState<Checkup[]>([
    { id: "1", title: "Cardiology Follow-up", date: "May 5, 2026", status: "upcoming" },
    { id: "2", title: "Blood Work (CBC + Lipid)", date: "May 12, 2026", status: "upcoming" },
    { id: "3", title: "ECG Stress Test", date: "Apr 20, 2026", status: "done" },
  ]);

  // Symptom log
  const [symptom, setSymptom] = useState("");
  const [symptoms, setSymptoms] = useState<{id:string;text:string;at:string}[]>([
    { id: "pre1", text: "Mild chest tightness after walking", at: "10:30 AM" },
    { id: "pre2", text: "Slight dizziness on standing", at: "Yesterday" },
  ]);

  // Dialog states
  const [sosOpen, setSosOpen] = useState(false);
  const [checkupRunning, setCheckupRunning] = useState(false);
  const [anomalyOpen, setAnomalyOpen] = useState(false);

  // Medical profile (feeds into AI analysis)
  const medicalHistory = ["Hypertension (diagnosed 2022)", "Type-2 Diabetes (managed)", "Previous MI (2024)"];
  const prescriptions = reminders.map(m => `${m.label} — ${m.dose} at ${m.time}`);
  const familyHealth = [
    { name: "Priya Sharma (Spouse)", condition: "Healthy, regular checkups" },
    { name: "Raj Sharma (Son)", condition: "Asthma (childhood, managed)" },
    { name: "Late Shri Sharma (Father)", condition: "Cardiac arrest at age 68" },
  ];
  const doctorNotes = [
    { date: "Apr 15, 2026", note: "BP 140/90 — advised lifestyle modification, reduce salt intake" },
    { date: "Mar 28, 2026", note: "Lipid panel elevated — started Atorvastatin 20mg" },
  ];

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
        medications: reminders.filter(m => !m.taken).map(m => m.label),
        symptoms: symptoms.map(s => s.text),
        checkups: checkups.filter(c => c.status === "upcoming").map(c => c.title),
        medical_history: medicalHistory,
        prescriptions: prescriptions,
        family_health: familyHealth.map(f => `${f.name}: ${f.condition}`),
        doctor_notes: doctorNotes.map(d => `[${d.date}] ${d.note}`),
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
  }, [risk, reminders, symptoms, checkups, medicalHistory, prescriptions, familyHealth, doctorNotes]);

  const runGloveCheckup = () => {
    setCheckupRunning(true);
    setTimeout(() => {
      setCheckupRunning(false);
      triggerGloveAnomaly();
      setAnomalyOpen(true);
    }, 2000);
  };

  const submitSymptom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!symptom.trim()) return;
    setSymptoms(s => [{ id: crypto.randomUUID(), text: symptom.trim(), at: new Date().toLocaleTimeString() }, ...s]);
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
            <h1 className="text-3xl font-semibold tracking-tight">Live Vitals Monitor</h1>
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
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Medications ({reminders.filter(m=>!m.taken).length} active)</p>
              {reminders.filter(m=>!m.taken).slice(0,2).map(m=>(<p key={m.id} className="text-xs mt-0.5">{m.label}</p>))}
              {reminders.filter(m=>!m.taken).length > 2 && <p className="text-[10px] text-muted-foreground">+{reminders.filter(m=>!m.taken).length-2} more</p>}
            </div>
            <div className="rounded-lg border border-border/40 bg-panel-elevated p-2.5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Medical History</p>
              {medicalHistory.slice(0,2).map((h,i)=>(<p key={i} className="text-xs mt-0.5">{h.split("(")[0].trim()}</p>))}
            </div>
            <div className="rounded-lg border border-border/40 bg-panel-elevated p-2.5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Symptoms ({symptoms.length})</p>
              {symptoms.slice(0,2).map(s=>(<p key={s.id} className="text-xs mt-0.5 truncate">{s.text}</p>))}
              {symptoms.length === 0 && <p className="text-xs mt-0.5 text-muted-foreground">None reported</p>}
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

        {/* Medical Profile — History + Doctor Notes + Family Health */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="rounded-xl border border-border bg-panel p-5 shadow-card">
            <div className="flex items-center gap-2 mb-3"><ClipboardList className="h-4 w-4 text-primary"/><h2 className="font-semibold text-sm">Medical History</h2></div>
            <ul className="space-y-2">
              {medicalHistory.map((h,i) => (
                <li key={i} className="flex items-start gap-2 text-xs rounded-lg bg-panel-elevated px-3 py-2 border border-border/60">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0"/>{h}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-border bg-panel p-5 shadow-card">
            <div className="flex items-center gap-2 mb-3"><Calendar className="h-4 w-4 text-primary"/><h2 className="font-semibold text-sm">Doctor Notes</h2></div>
            <ul className="space-y-2">
              {doctorNotes.map((d,i) => (
                <li key={i} className="rounded-lg bg-panel-elevated px-3 py-2 border border-border/60">
                  <p className="text-[10px] text-muted-foreground font-mono-tabular">{d.date}</p>
                  <p className="text-xs mt-0.5">{d.note}</p>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-border bg-panel p-5 shadow-card">
            <div className="flex items-center gap-2 mb-3"><Users className="h-4 w-4 text-primary"/><h2 className="font-semibold text-sm">Family Health Risks</h2></div>
            <ul className="space-y-2">
              {familyHealth.map((f,i) => (
                <li key={i} className="rounded-lg bg-panel-elevated px-3 py-2 border border-border/60">
                  <p className="text-xs font-medium">{f.name}</p>
                  <p className="text-[11px] text-muted-foreground">{f.condition}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Meds + Checkups + Symptoms — 3 column */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Medications */}
          <div className="rounded-xl border border-border bg-panel p-5 shadow-card">
            <div className="flex items-center gap-2 mb-4">
              <Pill className="h-4 w-4 text-primary" /><h2 className="font-semibold">Medications</h2>
            </div>
            <ul className="space-y-2">
              {reminders.map(r => (
                <li key={r.id} className="flex items-center justify-between rounded-lg bg-panel-elevated px-3 py-2.5 border border-border/60">
                  <div>
                    <p className={cn("text-sm font-medium", r.taken && "line-through text-muted-foreground")}>{r.label}</p>
                    <p className="text-xs text-muted-foreground">{r.time} · {r.dose}</p>
                  </div>
                  <Button size="sm" variant={r.taken?"secondary":"default"} disabled={r.taken}
                    onClick={() => setReminders(rs => rs.map(x => x.id===r.id ? {...x,taken:true} : x))}>
                    {r.taken ? "Done ✓" : "Take"}
                  </Button>
                </li>
              ))}
            </ul>
          </div>

          {/* Upcoming Checkups */}
          <div className="rounded-xl border border-border bg-panel p-5 shadow-card">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="h-4 w-4 text-primary" /><h2 className="font-semibold">Checkups & Dates</h2>
            </div>
            <ul className="space-y-2">
              {checkups.map(c => (
                <li key={c.id} className={cn("flex items-center gap-3 rounded-lg px-3 py-2.5 border",
                  c.status==="done"?"bg-emerald-900/10 border-emerald-700/30":"bg-panel-elevated border-border/60")}>
                  {c.status==="done" ? <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0"/> : <Clock className="h-4 w-4 text-amber-400 shrink-0"/>}
                  <div className="flex-1">
                    <p className="text-sm font-medium">{c.title}</p>
                    <p className="text-xs text-muted-foreground">{c.date}</p>
                  </div>
                </li>
              ))}
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
              {symptoms.map(s => (
                <li key={s.id} className="flex items-start justify-between gap-2 rounded-lg bg-panel-elevated px-3 py-2 border border-border/60">
                  <span className="text-xs">{s.text}</span>
                  <span className="text-[10px] text-muted-foreground font-mono-tabular shrink-0">{s.at}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Family + Connected Members */}
        <section className="rounded-xl border border-border bg-panel p-5 shadow-card">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-4 w-4 text-primary" /><h2 className="font-semibold">Connected Family Members</h2>
            <span className="text-xs text-muted-foreground ml-auto">Viewing your activity in real-time</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { name: "Priya Sharma (Spouse)", status: "online", lastSeen: "Now" },
              { name: "Raj Sharma (Son)", status: "online", lastSeen: "Now" },
              { name: "Dr. Mehra (Primary)", status: "offline", lastSeen: "2h ago" },
            ].map(m => (
              <div key={m.name} className="flex items-center gap-3 rounded-lg bg-panel-elevated px-4 py-3 border border-border/60">
                <div className={cn("h-2.5 w-2.5 rounded-full", m.status==="online"?"bg-emerald-400 animate-pulse":"bg-zinc-500")} />
                <div>
                  <p className="text-sm font-medium">{m.name}</p>
                  <p className="text-[11px] text-muted-foreground">{m.lastSeen}</p>
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
              The Smart Glove detected an <strong>Abnormal Heart Rate (135 BPM)</strong> indicating possible Arrhythmia.
              <br /><br />Based on this reading, we recommend scheduling a consultation with a specialist.
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
