import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Activity, Heart, Droplets, Thermometer, Zap, Wifi, WifiOff,
  FlaskConical, RadioTower, CheckCircle2, AlertTriangle, Play,
  Shield, Database, Users, Bell, LogIn, UserPlus,
  ChevronRight, Cpu, Brain, Sparkles, TrendingUp
} from "lucide-react";

interface ScenarioMeta {
  id: string; label: string; description: string; medical_ref: string;
  gaps: string[]; expected_risk_range: [number, number]; expected_escalation_tier: number;
  system_response?: string[];
}
interface Vitals {
  hr: number; spo2: number; temp: number; gforce: number; fall: boolean;
  risk: number; alert: boolean; source?: string; scenario?: string;
  ml_class?: string; ml_confidence?: number; ml_algorithm?: string; ml_ready?: boolean;
  escalation_tier?: number; escalation_label?: string; alert_reasons?: {type:string;severity:string;detail:string}[];
  escalation_actions?: string[];
}

const GAP_LABELS: Record<string,string> = {
  G1:"Real HW Deploy", G2:"Patient UI", G3:"Scalability",
  G4:"Emergency Escalation", G5:"Privacy/Roles", G6:"Edge+Cloud AI", G7:"Doctor/EHR"
};
const GAP_CLS: Record<string,string> = {
  G1:"bg-violet-900/40 text-violet-300 border-violet-700/50",
  G2:"bg-blue-900/40 text-blue-300 border-blue-700/50",
  G3:"bg-teal-900/40 text-teal-300 border-teal-700/50",
  G4:"bg-red-900/40 text-red-300 border-red-700/50",
  G5:"bg-pink-900/40 text-pink-300 border-pink-700/50",
  G6:"bg-emerald-900/40 text-emerald-300 border-emerald-700/50",
  G7:"bg-amber-900/40 text-amber-300 border-amber-700/50",
};
const TIER: Record<number,{l:string;c:string}> = {
  0:{l:"No Escalation",c:"bg-emerald-900/40 text-emerald-300 border-emerald-700/40"},
  1:{l:"L1 - Doctor Alert",c:"bg-amber-900/40 text-amber-300 border-amber-700/40"},
  2:{l:"L2 - Family Notified",c:"bg-orange-900/40 text-orange-300 border-orange-700/40"},
  3:{l:"L3 - Emergency 108",c:"bg-red-900/40 text-red-300 border-red-700/40 animate-pulse"},
};

const BASE = "http://localhost:5001";
async function api<T>(url:string, opts?:RequestInit):Promise<T|null>{
  try{ const r=await fetch(url,opts); if(!r.ok)return null; return await r.json()as T; }catch{return null;}
}

export default function DemoPanel() {
  const nav = useNavigate();
  const [scenarios,setScenarios] = useState<ScenarioMeta[]>([]);
  const [vitals,setVitals] = useState<Vitals|null>(null);
  const [activeId,setActiveId] = useState("normal");
  const [loading,setLoading] = useState<string|null>(null);
  const [flask,setFlask] = useState(false);
  const [esp32,setEsp32] = useState(false);
  const [aiInsight,setAiInsight] = useState<string|null>(null);
  const [aiLoading,setAiLoading] = useState(false);
  const histRef = useRef<number[]>([]);

  // Load scenarios
  useEffect(()=>{
    (async()=>{
      const d=await api<ScenarioMeta[]>(`${BASE}/api/demo/scenarios`);
      if(d&&d.length){setScenarios(d);setFlask(true);}
    })();
  },[]);

  // Poll vitals 800ms
  useEffect(()=>{
    let alive=true;
    const poll=async()=>{
      const v=await api<Vitals>(flask?`${BASE}/api/latest`:"/api/latest");
      if(v&&alive){
        setVitals(v);
        histRef.current=[...histRef.current.slice(-59),v.hr];
      }
      if(alive)setTimeout(poll,800);
    };
    poll();
    return()=>{alive=false;};
  },[flask]);

  // Poll status 2s
  useEffect(()=>{
    let alive=true;
    const poll=async()=>{
      const s=await api<any>(`${BASE}/api/demo/status`);
      if(s&&alive){setEsp32(s.esp32Connected);if(s.scenario)setActiveId(s.scenario);else setActiveId("normal");}
      if(alive)setTimeout(poll,2000);
    };
    poll();
    return()=>{alive=false;};
  },[]);

  const trigger = useCallback(async(id:string)=>{
    setLoading(id); setAiInsight(null);
    await api(`${BASE}/api/demo/trigger`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({scene:id})});
    setActiveId(id); setLoading(null);
  },[]);

  const fetchAI = useCallback(async()=>{
    setAiLoading(true);
    const r=await api<{insight:string}>(`${BASE}/api/ai/insight`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({patient_id:1})});
    if(r)setAiInsight(r.insight);
    setAiLoading(false);
  },[]);

  const meta = scenarios.find(s=>s.id===activeId)??null;
  const rc = (r:number)=>r>70?"bg-red-500":r>40?"bg-amber-500":"bg-emerald-500";
  const rl = (r:number)=>r>70?"CRITICAL":r>40?"CAUTION":"SAFE";
  const tier = vitals?.escalation_tier??meta?.expected_escalation_tier??0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero Banner */}
      <div className="border-b border-border/60 bg-gradient-to-r from-violet-950/30 via-background to-blue-950/20">
        <div className="container flex flex-col md:flex-row md:items-center justify-between gap-4 py-8">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 text-xs border border-violet-700/50 bg-violet-900/30 text-violet-300 rounded-full px-3 py-1">
                <FlaskConical className="h-3 w-3"/>Research Demo
              </span>
              <span className={cn("inline-flex items-center gap-1.5 text-xs border rounded-full px-3 py-1",
                flask?"border-emerald-700/50 bg-emerald-900/30 text-emerald-300":"border-zinc-700/50 bg-zinc-900/40 text-zinc-400")}>
                {flask?<><Wifi className="h-3 w-3"/>Flask Online</>:<><WifiOff className="h-3 w-3"/>Offline</>}
              </span>
              <span className={cn("inline-flex items-center gap-1.5 text-xs border rounded-full px-3 py-1",
                esp32?"border-emerald-700/50 bg-emerald-900/30 text-emerald-300":"border-zinc-700/50 bg-zinc-900/40 text-zinc-400")}>
                <RadioTower className="h-3 w-3"/>{esp32?"ESP32 Connected":"Glove Offline"}
              </span>
              {vitals?.ml_ready&&(
                <span className="inline-flex items-center gap-1.5 text-xs border border-violet-700/50 bg-violet-900/30 text-violet-300 rounded-full px-3 py-1">
                  <Brain className="h-3 w-3"/>ML: {vitals.ml_algorithm}
                </span>
              )}
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">VitalGlove System Demo</h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-xl">
              Select a clinical scenario below. All vitals, ML classification, risk scoring, and escalation
              update in real-time. <strong>Normal mode uses actual glove hardware</strong> — all others run simulation.
            </p>
          </div>
          <div className="flex gap-3 shrink-0">
            <button onClick={()=>nav("/login")} className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-violet-700/50 bg-violet-900/30 text-violet-200 text-sm font-medium hover:bg-violet-800/40 transition-colors">
              <LogIn className="h-4 w-4"/>Sign In
            </button>
            <button onClick={()=>nav("/signup")} className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors">
              <UserPlus className="h-4 w-4"/>Sign Up
            </button>
          </div>
        </div>
      </div>

      <div className="container py-8 space-y-8">
        {/* Scenario Grid */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs uppercase tracking-widest text-muted-foreground">
              Clinical Scenarios ({scenarios.length}) — click to activate
            </h2>
            {activeId==="normal"&&(
              <span className="text-xs text-emerald-400 flex items-center gap-1"><RadioTower className="h-3 w-3"/>Using real glove data when connected</span>
            )}
          </div>
          {scenarios.length===0?(
            <div className="rounded-xl border border-dashed border-border/60 bg-panel/50 p-12 text-center text-muted-foreground text-sm">
              Start Flask (<code className="bg-zinc-800 px-1 rounded">python app.py</code>) to load scenarios.
            </div>
          ):(
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {scenarios.map(s=>{
                const active=activeId===s.id;
                const t=TIER[s.expected_escalation_tier]??TIER[0];
                return(
                  <button key={s.id} onClick={()=>trigger(s.id)} disabled={loading===s.id}
                    className={cn("relative group flex flex-col gap-2 rounded-xl border bg-panel p-4 text-left transition-all duration-200 hover:scale-[1.02]",
                      active?"border-violet-500/70 shadow-[0_0_20px_rgba(139,92,246,0.25)] bg-panel-elevated":"border-border hover:border-border/80")}>
                    {active&&<CheckCircle2 className="absolute top-2.5 right-2.5 h-4 w-4 text-violet-400"/>}
                    <p className={cn("font-semibold text-sm",active?"text-violet-200":"text-foreground")}>{s.label}</p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">{s.description}</p>
                    <span className={cn("inline-flex items-center self-start rounded-full border px-2 py-0.5 text-[10px] font-medium",t.c)}>{t.l}</span>
                    <div className="flex flex-wrap gap-1">
                      {s.gaps.map(g=><span key={g} className={cn("rounded-full border px-1.5 py-0.5 text-[9px] font-medium",GAP_CLS[g]??"")}>{g}</span>)}
                    </div>
                    {loading===s.id&&<div className="absolute inset-0 rounded-xl bg-background/60 flex items-center justify-center"><Play className="h-5 w-5 animate-spin text-violet-400"/></div>}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Main dashboard: vitals + ML + escalation */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* LEFT: Live Vitals (8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            <div className="flex items-center gap-3">
              <h2 className="text-xs uppercase tracking-widest text-muted-foreground">Live Output</h2>
              <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium",
                vitals?.source==="device"?"border-emerald-700/50 bg-emerald-900/30 text-emerald-300":"border-violet-700/50 bg-violet-900/30 text-violet-300")}>
                {vitals?.source==="device"?"Hardware":"Simulation"}
              </span>
            </div>

            {/* 4 vital cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                {l:"Heart Rate",v:vitals?.hr??"--",u:"BPM",a:!!vitals&&(vitals.hr>120||vitals.hr<50),c:"text-red-400",i:<Heart className="h-4 w-4"/>},
                {l:"SpO2",v:vitals?.spo2??"--",u:"%",a:!!vitals&&vitals.spo2<94,c:"text-blue-400",i:<Droplets className="h-4 w-4"/>},
                {l:"Temperature",v:vitals?vitals.temp.toFixed(1):"--",u:"C",a:!!vitals&&(vitals.temp>38||vitals.temp<35),c:"text-amber-400",i:<Thermometer className="h-4 w-4"/>},
                {l:"G-Force",v:vitals?vitals.gforce.toFixed(2):"--",u:"G",a:!!vitals&&vitals.fall,c:"text-orange-400",i:<Zap className="h-4 w-4"/>},
              ].map(x=>(
                <div key={x.l} className={cn("rounded-xl border bg-panel p-4 transition-all",x.a?"border-red-500/60 bg-red-950/20 animate-pulse":"border-border")}>
                  <div className="flex items-center gap-1.5 text-muted-foreground mb-2">
                    <span className={x.c}>{x.i}</span><span className="text-xs">{x.l}</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-semibold font-mono">{x.v}</span>
                    <span className="text-xs text-muted-foreground">{x.u}</span>
                  </div>
                  {x.a&&<p className="text-[10px] text-red-400 mt-1 flex items-center gap-1"><AlertTriangle className="h-2.5 w-2.5"/>ALERT</p>}
                </div>
              ))}
            </div>

            {/* Risk + ML prediction row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Risk Score */}
              <div className="rounded-xl border border-border bg-panel p-5">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Activity className="h-3.5 w-3.5"/>Risk Score</span>
                  <span className={cn("text-xs font-semibold px-2.5 py-0.5 rounded-full border",TIER[tier]?.c)}>{TIER[tier]?.l}</span>
                </div>
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-5xl font-bold font-mono">{vitals?.risk??0}</span>
                  <span className="text-muted-foreground text-sm">/ 100</span>
                  <span className={cn("ml-auto text-xs font-bold px-2 py-1 rounded",
                    (vitals?.risk??0)>70?"bg-red-500/20 text-red-300":(vitals?.risk??0)>40?"bg-amber-500/20 text-amber-300":"bg-emerald-500/20 text-emerald-300")}>
                    {rl(vitals?.risk??0)}
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-zinc-800 overflow-hidden">
                  <div className={cn("h-full rounded-full transition-all duration-700",rc(vitals?.risk??0))} style={{width:`${vitals?.risk??0}%`}}/>
                </div>
              </div>

              {/* ML Classification */}
              <div className="rounded-xl border border-violet-700/30 bg-violet-950/10 p-5">
                <div className="flex items-center gap-1.5 mb-3">
                  <Brain className="h-4 w-4 text-violet-400"/>
                  <span className="text-xs uppercase tracking-wider text-violet-300">ML Classification</span>
                </div>
                {vitals?.ml_ready?(
                  <>
                    <p className="text-2xl font-bold text-violet-200 capitalize">{vitals.ml_class?.replace("_"," ")??"--"}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="h-1.5 flex-1 rounded-full bg-zinc-800 overflow-hidden">
                        <div className="h-full rounded-full bg-violet-500 transition-all duration-500" style={{width:`${(vitals.ml_confidence??0)*100}%`}}/>
                      </div>
                      <span className="text-xs text-violet-300 font-mono">{((vitals.ml_confidence??0)*100).toFixed(1)}%</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2">Algorithm: {vitals.ml_algorithm} | 9 features | 5400 training samples</p>
                  </>
                ):(
                  <p className="text-sm text-muted-foreground">Run <code className="bg-zinc-800 px-1 rounded text-xs">python ml/trainer.py</code> to activate</p>
                )}
              </div>
            </div>

            {/* HR Sparkline */}
            {histRef.current.length>5&&(
              <div className="rounded-xl border border-border bg-panel p-4">
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5"/>HR Trend (last 60 readings)</p>
                <svg viewBox={`0 0 ${histRef.current.length} 100`} className="w-full h-16" preserveAspectRatio="none">
                  <polyline fill="none" stroke="hsl(var(--primary))" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                    points={histRef.current.map((v,i)=>`${i},${100-((v-40)/(180-40))*100}`).join(" ")}/>
                </svg>
              </div>
            )}

            {/* Alert Reasons */}
            {vitals?.alert_reasons&&vitals.alert_reasons.length>0&&(
              <div className="rounded-xl border border-red-700/40 bg-red-950/10 p-4 space-y-2">
                <p className="text-xs uppercase tracking-wider text-red-300 flex items-center gap-1.5"><Bell className="h-3.5 w-3.5"/>Active Alerts</p>
                {vitals.alert_reasons.map((r,i)=>(
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <AlertTriangle className={cn("h-3.5 w-3.5",r.severity==="critical"?"text-red-400":"text-amber-400")}/>
                    <span className="font-medium text-foreground">{r.type}</span>
                    <span className="text-muted-foreground">{r.detail}</span>
                  </div>
                ))}
                {vitals.escalation_actions&&vitals.escalation_actions.length>0&&(
                  <div className="mt-2 pt-2 border-t border-red-700/30">
                    <p className="text-[11px] text-red-300 font-medium mb-1">Escalation Actions:</p>
                    {vitals.escalation_actions.map((a,i)=>(
                      <p key={i} className="text-xs text-muted-foreground flex items-center gap-1"><ChevronRight className="h-3 w-3 text-red-400"/>{a}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Medical Reference */}
            {meta&&(
              <div className="rounded-xl border border-border/50 bg-panel/50 px-4 py-3">
                <p className="text-[11px] text-muted-foreground"><span className="text-violet-400 font-medium">Research Ref:</span> {meta.medical_ref}</p>
              </div>
            )}
          </div>

          {/* RIGHT: System Status + AI + Gaps (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            {/* System Response */}
            <div className="rounded-xl border border-border bg-panel p-4">
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Expected System Response</p>
              {(meta?.system_response??["Monitoring vitals continuously..."]).map((r,i)=>(
                <div key={i} className="flex items-start gap-2 text-xs mb-1.5">
                  <ChevronRight className="h-3 w-3 text-violet-400 mt-0.5 shrink-0"/>
                  <span className="text-muted-foreground leading-relaxed">{r}</span>
                </div>
              ))}
            </div>

            {/* Groq AI Insight */}
            <div className="rounded-xl border border-blue-700/30 bg-blue-950/10 p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs uppercase tracking-widest text-blue-300 flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5"/>Groq AI Insight</p>
                <button onClick={fetchAI} disabled={aiLoading}
                  className="text-[10px] px-2 py-1 rounded border border-blue-700/40 bg-blue-900/30 text-blue-300 hover:bg-blue-800/40 transition-colors disabled:opacity-50">
                  {aiLoading?"Analyzing...":"Generate"}
                </button>
              </div>
              {aiInsight?(
                <p className="text-xs text-blue-100/80 leading-relaxed whitespace-pre-line">{aiInsight}</p>
              ):(
                <p className="text-xs text-muted-foreground">Click Generate for a LLaMA3-70B health analysis of current vitals.</p>
              )}
            </div>

            {/* Gap Coverage */}
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Research Gap Coverage</p>
              <div className="space-y-1.5">
                {Object.entries(GAP_LABELS).map(([k,label])=>{
                  const covered=meta?.gaps.includes(k)??false;
                  return(
                    <div key={k} className={cn("flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-all",
                      covered?(GAP_CLS[k]+" shadow-sm"):"border-border/40 bg-panel text-muted-foreground")}>
                      <span className="font-mono font-bold w-5">{k}</span>
                      <span className="flex-1">{label}</span>
                      {covered&&<CheckCircle2 className="h-3 w-3 shrink-0 opacity-70"/>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Glove Sync */}
            <div className="rounded-xl border border-border bg-panel p-4">
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Wireless Glove Sync</p>
              <div className="flex items-center gap-2 mb-2">
                <div className={cn("h-2 w-2 rounded-full",esp32?"bg-emerald-400 animate-pulse":"bg-zinc-600")}/>
                <span className="text-xs">{esp32?"ESP32 receiving commands":"ESP32 offline - simulation only"}</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Active: <span className="text-violet-300">{meta?.label??"Normal Monitoring"}</span><br/>
                Glove polls <code className="text-xs bg-zinc-800 px-1 rounded">/api/glove/command</code> every 3s
              </p>
            </div>
          </div>
        </div>

        {/* Role Access Cards */}
        <section className="rounded-xl border border-border bg-panel p-6">
          <h2 className="text-xs uppercase tracking-widest text-muted-foreground mb-4">Role-Based Dashboards</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {role:"Patient",icon:<Users className="h-5 w-5"/>,desc:"Live vitals, SOS button, medication reminders, symptom log",color:"text-blue-400",border:"border-blue-700/30"},
              {role:"Doctor",icon:<Shield className="h-5 w-5"/>,desc:"Risk-sorted patient fleet, trend graphs, Groq AI insights",color:"text-violet-400",border:"border-violet-700/30"},
              {role:"Admin",icon:<Database className="h-5 w-5"/>,desc:"Device management, user roles, system configuration",color:"text-emerald-400",border:"border-emerald-700/30"},
            ].map(r=>(
              <button key={r.role} onClick={()=>nav("/login")}
                className={cn("flex flex-col items-start gap-3 rounded-lg border bg-panel-elevated p-5 text-left hover:scale-[1.02] transition-all",r.border)}>
                <span className={r.color}>{r.icon}</span>
                <div>
                  <p className="font-semibold text-sm">{r.role}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{r.desc}</p>
                </div>
                <span className="text-xs text-muted-foreground flex items-center gap-1 mt-auto">Sign in <LogIn className="h-3 w-3"/></span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
