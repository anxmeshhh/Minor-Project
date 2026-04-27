import { useState } from "react";
import { Search, HeartPulse, Filter, CheckCircle2, XCircle, Brain, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Sparkline } from "@/components/Sparkline";
import { cn } from "@/lib/utils";

interface PatientReq {
  id: string; name: string; age: number; symptoms: string; mlClass: string;
  urgency: "safe"|"visit"|"emergency"; hr: number; spo2: number; temp: number;
  risk: string; status: "pending"|"accepted"|"rejected"; history: number[];
  recentAlert: string; meds: string;
  medicalHistory: string[]; prescriptions: string[]; doctorNotes: string[]; familyHealth: string[];
}

const MOCK_FLEET: PatientReq[] = [
  { id: "PT-001", name: "Riya Sharma", age: 64, symptoms: "Chest tightness, fatigue", mlClass: "tachycardia",
    urgency: "visit", hr: 135, spo2: 92, temp: 37.1, risk: "Critical", status: "pending",
    recentAlert: "Abnormal HR", history: [80,85,95,110,125,130,135], meds: "Metoprolol 50mg, Aspirin 75mg",
    medicalHistory: ["Hypertension (2022)", "Previous MI (2024)", "Type-2 Diabetes"],
    prescriptions: ["Metoprolol 50mg — 1 tab, 8AM", "Aspirin 75mg — 1 tab, 1PM", "Atorvastatin 20mg — 1 tab, 9PM"],
    doctorNotes: ["Apr 15: BP 140/90, advised salt reduction", "Mar 28: Lipid panel elevated, started Atorvastatin"],
    familyHealth: ["Father: Cardiac arrest at 68", "Spouse: Healthy"] },
  { id: "PT-002", name: "Amit Patel", age: 45, symptoms: "Shortness of breath, wheezing", mlClass: "hypoxia",
    urgency: "emergency", hr: 88, spo2: 87, temp: 36.8, risk: "Critical", status: "pending",
    recentAlert: "Low SpO2", history: [97,96,94,92,90,88,87], meds: "Salbutamol inhaler",
    medicalHistory: ["Chronic Asthma (childhood)", "Pneumonia (2023)"],
    prescriptions: ["Salbutamol inhaler — PRN", "Montelukast 10mg — 1 tab, night"],
    doctorNotes: ["Apr 10: SpO2 dipping on exertion, ordered PFT", "Mar 15: Chest X-ray clear"],
    familyHealth: ["Mother: COPD", "Brother: Healthy"] },
  { id: "PT-003", name: "Naomi Singh", age: 38, symptoms: "None", mlClass: "normal",
    urgency: "safe", hr: 65, spo2: 99, temp: 36.8, risk: "Low", status: "accepted",
    recentAlert: "None", history: [68,66,65,64,65,66,65], meds: "Vitamin D3",
    medicalHistory: ["No significant history"],
    prescriptions: ["Vitamin D3 60K — weekly"],
    doctorNotes: ["Apr 20: Routine checkup, all normal"],
    familyHealth: ["All family members healthy"] },
  { id: "PT-004", name: "Rajesh Kumar", age: 41, symptoms: "Mild fever, body ache, sore throat", mlClass: "fever",
    urgency: "visit", hr: 90, spo2: 95, temp: 38.2, risk: "Caution", status: "pending",
    recentAlert: "Slight Fever", history: [75,78,82,85,88,89,90], meds: "Paracetamol 500mg",
    medicalHistory: ["Seasonal allergies", "Appendectomy (2019)"],
    prescriptions: ["Paracetamol 500mg — SOS, max 4/day", "Cetirizine 10mg — 1 tab, night"],
    doctorNotes: ["Apr 22: Viral symptoms, advised rest and fluids"],
    familyHealth: ["Wife: Thyroid (managed)", "Son: Healthy"] },
  { id: "PT-005", name: "Priya Mehra", age: 55, symptoms: "Dizziness on standing, blurred vision", mlClass: "bradycardia",
    urgency: "visit", hr: 42, spo2: 97, temp: 36.6, risk: "Caution", status: "accepted",
    recentAlert: "Low HR", history: [55,52,48,45,43,42,42], meds: "Amlodipine 5mg",
    medicalHistory: ["Hypothyroidism (2020)", "Iron deficiency anemia"],
    prescriptions: ["Amlodipine 5mg — 1 tab, morning", "Levothyroxine 50mcg — empty stomach", "Iron supplement — after lunch"],
    doctorNotes: ["Apr 18: HR trending low, consider pacemaker evaluation", "Apr 5: Thyroid levels stable on current dose"],
    familyHealth: ["Mother: Hypothyroidism", "Sister: Anemia"] },
];

const urgBadge = { safe: "bg-emerald-500/15 text-emerald-400 border-emerald-700/40",
  visit: "bg-amber-500/15 text-amber-400 border-amber-700/40",
  emergency: "bg-red-500/15 text-red-400 border-red-700/40 animate-pulse" };
const urgLabel = { safe: "Safe", visit: "Needs Visit", emergency: "Emergency" };

export default function DoctorDashboard() {
  const [search, setSearch] = useState("");
  const [patients, setPatients] = useState(MOCK_FLEET);
  const [tab, setTab] = useState<"requests"|"accepted"|"all">("requests");
  const [expandedId, setExpandedId] = useState<string|null>(null);
  const navigate = useNavigate();

  const filtered = patients
    .filter(p => {
      if (tab === "requests") return p.status === "pending";
      if (tab === "accepted") return p.status === "accepted";
      return true;
    })
    .filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.id.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const s = (r: string) => r === "Critical" ? 3 : r === "Caution" ? 2 : 1;
      return s(b.risk) - s(a.risk);
    });

  const accept = (id: string) => setPatients(ps => ps.map(p => p.id === id ? {...p, status: "accepted"} : p));
  const reject = (id: string) => setPatients(ps => ps.map(p => p.id === id ? {...p, status: "rejected"} : p));

  const pendingCount = patients.filter(p => p.status === "pending").length;

  return (
    <main className="theme-clinical min-h-[calc(100vh-3.5rem)] bg-background text-foreground">
      <div className="container py-8 max-w-7xl">
        <header className="mb-6 flex items-end justify-between border-b pb-4">
          <div>
            <p className="text-sm font-semibold tracking-widest text-primary uppercase flex items-center gap-2">
              <HeartPulse className="h-4 w-4" /> Clinician Dashboard
            </p>
            <h1 className="text-3xl font-bold mt-1">Patient Fleet</h1>
          </div>
          <div className="flex gap-2">
            <Badge variant="secondary" className="text-sm px-3 py-1.5">{patients.filter(p=>p.status==="accepted").length} Active Patients</Badge>
            {pendingCount > 0 && <Badge variant="destructive" className="text-sm px-3 py-1.5 animate-pulse">{pendingCount} Pending Requests</Badge>}
          </div>
        </header>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {(["requests","accepted","all"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={cn("px-4 py-2 rounded-lg text-sm font-medium border transition-colors",
                tab===t ? "bg-primary text-primary-foreground border-primary" : "bg-panel border-border hover:bg-panel-elevated")}>
              {t === "requests" ? `Requests (${pendingCount})` : t === "accepted" ? "My Patients" : "All"}
            </button>
          ))}
        </div>

        <div className="bg-panel border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b bg-card/50 flex justify-between items-center">
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search patients..." className="pl-9 bg-background" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <p className="text-sm text-muted-foreground">Showing {filtered.length} patients</p>
          </div>

          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Symptoms / Meds</TableHead>
                <TableHead className="w-[100px]">HR Trend</TableHead>
                <TableHead className="text-right">HR</TableHead>
                <TableHead className="text-right">SpO2</TableHead>
                <TableHead>ML Class</TableHead>
                <TableHead>AI Urgency</TableHead>
                <TableHead>Risk</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(p => (
                <TableRow key={p.id} className={cn("transition-colors",
                  p.status==="pending"?"bg-amber-950/5":"",
                  p.status==="rejected"?"opacity-40":"")}>
                  <TableCell className="font-mono text-xs">{p.id}</TableCell>
                  <TableCell>
                    <p className="font-medium text-sm">{p.name}</p>
                    <p className="text-xs text-muted-foreground">Age {p.age}</p>
                  </TableCell>
                  <TableCell>
                    <p className="text-xs">{p.symptoms || "None"}</p>
                    <p className="text-[10px] text-muted-foreground">{p.meds}</p>
                  </TableCell>
                  <TableCell>
                    <Sparkline data={p.history} width={90} height={28}
                      stroke={p.risk==="Critical"?"hsl(var(--critical))":p.risk==="Caution"?"hsl(var(--caution))":"hsl(var(--primary))"}
                      fill={p.risk==="Critical"?"hsl(var(--critical) / 0.2)":p.risk==="Caution"?"hsl(var(--caution) / 0.2)":"hsl(var(--primary) / 0.2)"} />
                  </TableCell>
                  <TableCell className={cn("text-right font-mono text-sm", (p.hr>120||p.hr<50)&&"text-critical font-bold")}>{p.hr}</TableCell>
                  <TableCell className={cn("text-right font-mono text-sm", p.spo2<94&&"text-critical font-bold")}>{p.spo2}%</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border border-violet-700/40 bg-violet-900/20 text-violet-300">
                      <Brain className="h-3 w-3"/>{p.mlClass}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium", urgBadge[p.urgency])}>{urgLabel[p.urgency]}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={p.risk==="Critical"?"destructive":p.risk==="Caution"?"secondary":"outline"}
                      className={p.risk==="Critical"?"bg-critical text-critical-foreground animate-pulse":p.risk==="Caution"?"bg-caution text-caution-foreground":""}>
                      {p.risk}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {p.status === "pending" ? (
                      <div className="flex gap-1.5 justify-end">
                        <Button size="sm" variant="default" onClick={(e) => {e.stopPropagation(); accept(p.id);}} className="h-7 px-2.5 text-xs">
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1"/>Accept
                        </Button>
                        <Button size="sm" variant="outline" onClick={(e) => {e.stopPropagation(); reject(p.id);}} className="h-7 px-2.5 text-xs border-red-700/40 text-red-400 hover:bg-red-900/20">
                          <XCircle className="h-3.5 w-3.5 mr-1"/>Reject
                        </Button>
                      </div>
                    ) : p.status === "accepted" ? (
                      <Button size="sm" variant="outline" onClick={() => setExpandedId(expandedId === p.id ? null : p.id)} className="h-7 px-2.5 text-xs">
                        {expandedId === p.id ? "Collapse" : "View Full Profile"}
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">Rejected</span>
                    )}
                  </TableCell>
                </TableRow>
                {/* Expandable Patient Profile */}
                {expandedId === p.id && (
                  <TableRow>
                    <TableCell colSpan={10} className="bg-panel-elevated/50 p-0">
                      <div className="p-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
                        <div className="rounded-lg border border-border/60 bg-panel p-3">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Medical History</p>
                          {p.medicalHistory.map((h,i) => <p key={i} className="text-xs mt-1">• {h}</p>)}
                        </div>
                        <div className="rounded-lg border border-border/60 bg-panel p-3">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Active Prescriptions</p>
                          {p.prescriptions.map((r,i) => <p key={i} className="text-xs mt-1">💊 {r}</p>)}
                        </div>
                        <div className="rounded-lg border border-border/60 bg-panel p-3">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Doctor Notes</p>
                          {p.doctorNotes.map((n,i) => <p key={i} className="text-xs mt-1">📋 {n}</p>)}
                        </div>
                        <div className="rounded-lg border border-border/60 bg-panel p-3">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Family Health</p>
                          {p.familyHealth.map((f,i) => <p key={i} className="text-xs mt-1">👨‍👩‍👧 {f}</p>)}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">No patients found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </main>
  );
}
