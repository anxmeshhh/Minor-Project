import { useState, Fragment } from "react";
import { Search, HeartPulse, Filter, CheckCircle2, XCircle, Brain, Clock, FileText, Pill, Users, Send, AlertTriangle, ClipboardList, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkline } from "@/components/Sparkline";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { useHealthData, type DoctorRequest } from "@/context/HealthDataContext";
import { toast } from "sonner";

/* ─── Derive vitals display from member's DB data ─── */
function memberVitals(member: any, req: any) {
  const lastMl = member?.mlResults?.[0];
  const summary = lastMl?.input_summary || "";
  const parse = (key: string, fallback: number) => {
    const m = summary.match(new RegExp(key + "=(\\d+)"));
    return m ? parseInt(m[1]) : fallback;
  };
  const hr = parse("HR", 72);
  const spo2 = parse("SpO2", 98);
  const temp = parse("Temp", 36.5);
  const riskScore = req.risk_score || lastMl?.risk_score || 15;
  const risk = riskScore > 70 ? "Critical" : riskScore > 40 ? "Caution" : "Low";
  // Build a fake trend from the HR
  const history = Array.from({ length: 7 }, (_, i) => hr + Math.round(Math.sin(i * 0.9) * 5));
  return { hr, spo2, temp, history, risk };
}

const urgBadge: Record<string, string> = {
  safe: "bg-emerald-500/15 text-emerald-400 border-emerald-700/40",
  visit: "bg-amber-500/15 text-amber-400 border-amber-700/40",
  emergency: "bg-red-500/15 text-red-400 border-red-700/40 animate-pulse",
};

export default function DoctorDashboard() {
  const { doctorRequests, family, getAllForAi, getMember, respondToRequest, loading } = useHealthData();
  const [tab, setTab] = useState<"pending" | "accepted" | "all">("pending");
  const [expandedReq, setExpandedReq] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  // Doctor action form states
  const [noteInput, setNoteInput] = useState("");
  const [prescInput, setPrescInput] = useState("");
  const [apptInput, setApptInput] = useState("");

  const filtered = doctorRequests.filter(r => {
    if (tab === "pending" && r.status !== "pending") return false;
    if (tab === "accepted" && r.status !== "accepted") return false;
    if (search && !r.member_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleAcceptAndRespond = async (req: DoctorRequest) => {
    if (!noteInput.trim()) { toast.error("Please add clinical notes before accepting"); return; }
    await respondToRequest(req.id, {
      doctorName: "Dr. Mehra",
      notes: noteInput.trim(),
      prescription: prescInput.trim() || undefined,
      urgentAppointment: apptInput.trim() || undefined,
    });
    toast.success(`Response sent to ${req.member_name} and their family`);
    setNoteInput(""); setPrescInput(""); setApptInput("");
    setExpandedReq(null);
  };

  const pendingCount = doctorRequests.filter(r => r.status === "pending").length;

  if (loading) return <div className="container py-20 text-center text-muted-foreground">Loading patient requests...</div>;

  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-background">
      <div className="container py-8 max-w-7xl">
        {/* Header */}
        <header className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <p className="text-sm uppercase tracking-widest text-muted-foreground">Doctor Dashboard</p>
            <h1 className="text-3xl font-semibold tracking-tight">Patient Cases</h1>
            <p className="text-sm text-muted-foreground mt-1">Review patient data: User Input + Family Hub + ML + AI → your decision</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              {(["pending", "accepted", "all"] as const).map(t => (
                <Button key={t} size="sm" variant={tab === t ? "default" : "outline"} onClick={() => setTab(t)} className="capitalize text-xs">
                  {t} {t === "pending" && pendingCount > 0 && <Badge variant="destructive" className="ml-1 h-4 px-1.5 text-[9px]">{pendingCount}</Badge>}
                </Button>
              ))}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search patients..." className="pl-9 bg-background w-48" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
        </header>

        {/* Patient Cases */}
        <div className="space-y-4">
          {filtered.length === 0 && (
            <Card className="p-8 text-center text-muted-foreground">
              <p className="text-lg">No {tab === "all" ? "" : tab} cases found.</p>
            </Card>
          )}

          {filtered.map(req => {
            const member = getMember(req.member_id);
            const vitals = memberVitals(member, req);
            const isExpanded = expandedReq === req.id;

            return (
              <Card key={req.id} className={cn("overflow-hidden border transition-all",
                req.status === "pending" ? "border-amber-700/40" : "border-border/60")}>
                {/* Case Header */}
                <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-panel-elevated/50"
                  onClick={() => setExpandedReq(isExpanded ? null : req.id)}>
                  <div className="flex items-center gap-4">
                    <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/15 text-primary text-lg font-bold shrink-0">
                      {req.member_name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{req.member_name}</h3>
                        <Badge variant={req.status === "pending" ? "secondary" : "default"}
                          className={req.status === "pending" ? "bg-amber-900/20 text-amber-400 border-amber-700/40" : ""}>
                          {req.status}
                        </Badge>
                        {req.ai_urgency && (
                          <span className={cn("text-xs px-2 py-0.5 rounded-full border", urgBadge[req.ai_urgency] || urgBadge.safe)}>
                            {req.ai_urgency.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Requested: {req.created_at}
                        {member && ` · ${member.symptoms.length} symptoms · ${member.medications.length} meds · ${member.medicalHistory.length} history`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Quick vitals */}
                    <div className="hidden sm:flex items-center gap-4 text-xs">
                      <span className={cn("font-mono", vitals.hr > 120 && "text-critical font-bold")}>
                        ❤️ {vitals.hr} BPM
                      </span>
                      <span className={cn("font-mono", vitals.spo2 < 94 && "text-critical font-bold")}>
                        🩸 {vitals.spo2}%
                      </span>
                      <Sparkline data={vitals.history} width={80} height={24}
                        stroke={vitals.risk === "Critical" ? "hsl(var(--critical))" : "hsl(var(--primary))"}
                        fill={vitals.risk === "Critical" ? "hsl(var(--critical) / 0.2)" : "hsl(var(--primary) / 0.2)"} />
                    </div>
                    {req.ml_class && (
                      <span className="text-xs px-2 py-0.5 rounded-full border border-violet-700/40 bg-violet-900/20 text-violet-300 flex items-center gap-1">
                        <Brain className="h-3 w-3" />{req.ml_class.replace("_"," ")}
                      </span>
                    )}
                  </div>
                </div>

                {/* Expanded: Full Patient Case */}
                {isExpanded && (
                  <div className="border-t border-border/40">
                    {/* Data Pipeline Indicator */}
                    <div className="px-4 py-2 bg-blue-950/10 border-b border-blue-700/20 flex items-center gap-2 overflow-x-auto">
                      <span className="text-[10px] text-blue-400 shrink-0">DATA PIPELINE:</span>
                      {["User Input", "Family Hub", "Glove Data", "ML Engine", "Rule Engine", "AI Analysis"].map((step, i) => (
                        <Fragment key={step}>
                          {i > 0 && <span className="text-blue-600">→</span>}
                          <span className="text-[10px] px-2 py-0.5 rounded bg-blue-900/30 border border-blue-700/30 text-blue-300 whitespace-nowrap">{step}</span>
                        </Fragment>
                      ))}
                      <span className="text-blue-600">→</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-900/30 border border-emerald-700/30 text-emerald-300 font-medium whitespace-nowrap">YOUR DECISION</span>
                    </div>

                    {/* Patient Data Tabs */}
                    <Tabs defaultValue="overview" className="p-4">
                      <TabsList className="grid grid-cols-6 w-full">
                        <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
                        <TabsTrigger value="symptoms" className="text-xs">Symptoms</TabsTrigger>
                        <TabsTrigger value="medications" className="text-xs">Medications</TabsTrigger>
                        <TabsTrigger value="history" className="text-xs">History</TabsTrigger>
                        <TabsTrigger value="family" className="text-xs">Family</TabsTrigger>
                        <TabsTrigger value="ai" className="text-xs">AI + ML</TabsTrigger>
                      </TabsList>

                      {/* Overview */}
                      <TabsContent value="overview" className="mt-3">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                          <div className="rounded-lg border border-border/60 bg-panel p-3">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Vitals (Live)</p>
                            <p className="text-sm">HR: <span className="font-mono font-bold">{vitals.hr}</span> BPM</p>
                            <p className="text-sm">SpO₂: <span className="font-mono font-bold">{vitals.spo2}</span>%</p>
                            <p className="text-sm">Temp: <span className="font-mono font-bold">{vitals.temp}</span>°C</p>
                          </div>
                          <div className="rounded-lg border border-border/60 bg-panel p-3">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Symptoms ({member?.symptoms.length})</p>
                            {member?.symptoms.slice(0,3).map(s => <p key={s.id} className="text-xs mt-0.5">• {s.text}</p>)}
                          </div>
                          <div className="rounded-lg border border-border/60 bg-panel p-3">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Active Meds ({member?.medications.length})</p>
                            {member?.medications.slice(0,3).map(m => <p key={m.id} className="text-xs mt-0.5">💊 {m.text.split("—")[0]}</p>)}
                          </div>
                          <div className="rounded-lg border border-border/60 bg-panel p-3">
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Risk Assessment</p>
                            <Badge variant={vitals.risk === "Critical" ? "destructive" : "secondary"} className="text-sm">{vitals.risk}</Badge>
                            {req.risk_score && <p className="text-xs mt-1">Score: {req.risk_score}/100</p>}
                          </div>
                        </div>
                      </TabsContent>

                      {/* Symptoms */}
                      <TabsContent value="symptoms" className="mt-3">
                        <div className="space-y-2">
                          {member?.symptoms.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No symptoms reported</p>}
                          {member?.symptoms.map(s => (
                            <div key={s.id} className="flex justify-between items-start rounded-lg bg-panel-elevated px-3 py-2.5 border border-border/60">
                              <div><p className="text-sm">{s.text}</p><p className="text-[10px] text-muted-foreground">Added by {s.added_by} · {s.created_at}</p></div>
                            </div>
                          ))}
                        </div>
                      </TabsContent>

                      {/* Medications */}
                      <TabsContent value="medications" className="mt-3">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                          {member?.medications.map(m => (
                            <div key={m.id} className="flex items-start gap-2 rounded-lg bg-panel-elevated px-3 py-2.5 border border-border/60">
                              <Pill className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                              <div><p className="text-sm">{m.text}</p><p className="text-[10px] text-muted-foreground">Prescribed by {m.added_by} · {m.created_at}</p></div>
                            </div>
                          ))}
                          {member?.prescriptions.map(p => (
                            <div key={p.id} className="flex items-start gap-2 rounded-lg bg-amber-900/10 px-3 py-2.5 border border-amber-700/30">
                              <FileText className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                              <div><p className="text-sm">{p.text}</p><p className="text-[10px] text-muted-foreground">By {p.added_by} · {p.created_at}</p></div>
                            </div>
                          ))}
                        </div>
                      </TabsContent>

                      {/* Medical History */}
                      <TabsContent value="history" className="mt-3">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Medical History</p>
                            {member?.medicalHistory.map(h => (
                              <div key={h.id} className="flex items-start gap-2 rounded-lg bg-panel-elevated px-3 py-2 border border-border/60 mt-1.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-blue-400 mt-2 shrink-0" /><p className="text-sm">{h.text}</p>
                              </div>
                            ))}
                          </div>
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Previous Doctor Notes</p>
                            {member?.doctorNotes.map(d => (
                              <div key={d.id} className="rounded-lg bg-panel-elevated px-3 py-2 border border-border/60 mt-1.5">
                                <p className="text-[10px] text-muted-foreground">{d.added_by} · {d.created_at}</p>
                                <p className="text-sm">{d.text}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </TabsContent>

                      {/* Family Context */}
                      <TabsContent value="family" className="mt-3">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                          {family.members.map(fm => (
                            <div key={fm.id} className={cn("rounded-lg border p-3", fm.id === req.member_id ? "border-primary/40 bg-primary/5" : "border-border/60 bg-panel")}>
                              <div className="flex items-center gap-2 mb-2">
                                <div className="h-8 w-8 rounded-full bg-primary/15 grid place-items-center text-sm font-bold text-primary">{fm.name.charAt(0)}</div>
                                <div>
                                  <p className="text-sm font-medium">{fm.name} {fm.id === req.member_id && <span className="text-[10px] text-primary">(Patient)</span>}</p>
                                  <p className="text-[10px] text-muted-foreground capitalize">{fm.relation}</p>
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                History: {fm.medicalHistory.map(h => h.text).join(", ") || "None"}
                              </p>
                            </div>
                          ))}
                        </div>
                      </TabsContent>

                      {/* AI + ML Analysis */}
                      <TabsContent value="ai" className="mt-3">
                        {req.ai_summary ? (
                          <div className="space-y-3">
                            <div className="grid grid-cols-3 gap-2">
                              <div className="rounded-lg bg-violet-900/20 border border-violet-700/30 p-3">
                                <p className="text-[10px] text-violet-300">ML Classification</p>
                                <p className="text-sm text-violet-100 capitalize font-medium">{req.ml_class?.replace("_"," ")}</p>
                              </div>
                              <div className="rounded-lg bg-blue-900/20 border border-blue-700/30 p-3">
                                <p className="text-[10px] text-blue-300">Risk Score</p>
                                <p className="text-sm text-blue-100 font-medium">{req.risk_score}/100</p>
                              </div>
                              {req.doctor_specialty && (
                                <div className="rounded-lg bg-amber-900/20 border border-amber-700/30 p-3">
                                  <p className="text-[10px] text-amber-300">Specialist Needed</p>
                                  <p className="text-sm text-amber-100 font-medium">{req.doctor_specialty}</p>
                                </div>
                              )}
                            </div>
                            <div className="rounded-lg border border-blue-700/20 bg-blue-950/20 p-3">
                              <p className="text-xs text-blue-300 font-medium mb-1">AI Summary</p>
                              <p className="text-sm text-blue-100/80 whitespace-pre-line">{req.ai_summary}</p>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground text-center py-4">No AI scan data available for this request.</p>
                        )}
                      </TabsContent>
                    </Tabs>

                    {/* Doctor Action Panel */}
                    {req.status === "pending" && (
                      <div className="border-t border-border/40 p-4 bg-panel-elevated/30">
                        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                          <ClipboardList className="h-4 w-4 text-primary" />Your Response (flows to patient + family)
                        </h4>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-3">
                          <div>
                            <label className="text-xs text-muted-foreground block mb-1">Clinical Notes *</label>
                            <textarea value={noteInput} onChange={e => setNoteInput(e.target.value)}
                              placeholder="e.g. Increase Metoprolol to 100mg. Schedule ECG within 48 hours."
                              className="w-full h-24 rounded-md border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary" />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground block mb-1">Prescription (each line = 1 medicine)</label>
                            <textarea value={prescInput} onChange={e => setPrescInput(e.target.value)}
                              placeholder={"Metoprolol 100mg — morning\nAspirin 75mg — after lunch"}
                              className="w-full h-24 rounded-md border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary" />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground block mb-1">Urgent Appointment (optional)</label>
                            <Input value={apptInput} onChange={e => setApptInput(e.target.value)} placeholder="e.g. ECG Stress Test — Apr 30" />
                            <p className="text-[10px] text-muted-foreground mt-2">
                              ✓ Notes added to patient record<br />
                              ✓ Prescription saved to profile<br />
                              ✓ Patient + family notified instantly
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={() => handleAcceptAndRespond(req)} className="gap-1.5">
                            <CheckCircle2 className="h-4 w-4" />Accept & Send Response
                          </Button>
                          <Button variant="outline" className="gap-1.5 border-red-700/40 text-red-400 hover:bg-red-900/20"
                            onClick={() => { respondToRequest(req.id, { doctorName: "Dr. Mehra", notes: "Referred to specialist." }); setExpandedReq(null); }}>
                            <XCircle className="h-4 w-4" />Reject
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Already Responded */}
                    {req.status === "accepted" && req.doctor_notes && (
                      <div className="border-t border-emerald-700/30 p-4 bg-emerald-950/10">
                        <h4 className="text-sm font-semibold mb-2 text-emerald-400 flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4" />Your Response — sent to {req.member_name}
                        </h4>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 text-sm">
                          <div>
                            <p className="text-[10px] text-muted-foreground uppercase mb-1">Clinical Notes</p>
                            <p className="text-emerald-100/80">{req.doctor_notes}</p>
                          </div>
                          {req.prescription && (
                            <div>
                              <p className="text-[10px] text-muted-foreground uppercase mb-1">Prescription Sent</p>
                              <p className="text-emerald-100/80 whitespace-pre-line">{req.prescription}</p>
                            </div>
                          )}
                          {req.urgent_appointment && (
                            <div>
                              <p className="text-[10px] text-muted-foreground uppercase mb-1">Urgent Appointment</p>
                              <p className="text-emerald-100/80">{req.urgent_appointment}</p>
                            </div>
                          )}
                        </div>
                        <p className="text-[10px] text-emerald-400/60 mt-2">Responded at {req.responded_at} by {req.doctor_name}</p>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </main>
  );
}
