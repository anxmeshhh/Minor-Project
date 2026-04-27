import { useState } from "react";
import { ShieldCheck, Activity, Users, Settings, Database, ServerCrash, Search, FileText, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { cn } from "@/lib/utils";

const MOCK_PATIENTS = [
  { id: "PT-001", name: "Riya Sharma", age: 64, gloveStatus: "Online", lastSync: "2 mins ago", risk: "Critical", role: "patient" },
  { id: "PT-002", name: "Amit Patel", age: 45, gloveStatus: "Online", lastSync: "Just now", risk: "Critical", role: "patient" },
  { id: "PT-003", name: "Naomi Singh", age: 38, gloveStatus: "Offline", lastSync: "2 hours ago", risk: "Low", role: "patient" },
  { id: "PT-004", name: "Rajesh Kumar", age: 41, gloveStatus: "Online", lastSync: "1 min ago", risk: "Caution", role: "patient" },
  { id: "PT-005", name: "Priya Mehra", age: 55, gloveStatus: "Online", lastSync: "5 mins ago", risk: "Low", role: "patient" },
];

const MOCK_DOCTORS = [
  { id: "DR-001", name: "Dr. Mehra", specialty: "Cardiology", patients: 3, status: "Active" },
  { id: "DR-002", name: "Dr. Jenkins", specialty: "Pulmonology", patients: 1, status: "Active" },
  { id: "DR-003", name: "Dr. Chen", specialty: "General Practice", patients: 2, status: "On Leave" },
];

const ANALYTICS_DATA = [
  { day: "Mon", activeGloves: 45, alerts: 12 }, { day: "Tue", activeGloves: 48, alerts: 18 },
  { day: "Wed", activeGloves: 46, alerts: 9 },  { day: "Thu", activeGloves: 50, alerts: 14 },
  { day: "Fri", activeGloves: 52, alerts: 22 }, { day: "Sat", activeGloves: 49, alerts: 8 },
  { day: "Sun", activeGloves: 51, alerts: 11 },
];

const SYSTEM_LOGS = [
  { id: 1, ts: "03:38:22", type: "info", source: "ML Engine", msg: "Model prediction: normal (95.4% conf)", user: "System" },
  { id: 2, ts: "03:37:45", type: "alert", source: "Risk Engine", msg: "PT-001 risk score elevated to 72/100", user: "System" },
  { id: 3, ts: "03:36:10", type: "action", source: "Doctor Panel", msg: "Dr. Mehra accepted patient PT-002", user: "DR-001" },
  { id: 4, ts: "03:35:50", type: "info", source: "Glove Sync", msg: "ESP32 scenario updated: hypoxia", user: "System" },
  { id: 5, ts: "03:34:20", type: "alert", source: "Escalation", msg: "L2 alert triggered for PT-002 (SpO2: 87%)", user: "System" },
  { id: 6, ts: "03:33:00", type: "action", source: "Patient App", msg: "PT-004 logged symptom: mild fever", user: "PT-004" },
  { id: 7, ts: "03:32:15", type: "info", source: "AI Engine", msg: "Groq insight generated for PT-001", user: "System" },
  { id: 8, ts: "03:31:00", type: "action", source: "Family Hub", msg: "Priya Sharma added family member: Raj Sharma", user: "PT-005" },
  { id: 9, ts: "03:30:45", type: "alert", source: "Emergency", msg: "SOS triggered by PT-001, L3 escalation initiated", user: "PT-001" },
  { id: 10, ts: "03:29:10", type: "info", source: "Database", msg: "Telemetry reading saved: patient_id=1", user: "System" },
  { id: 11, ts: "03:28:00", type: "action", source: "Auth", msg: "doctor@vitalglove.dev signed in (role: doctor)", user: "DR-001" },
  { id: 12, ts: "03:27:30", type: "info", source: "ML Engine", msg: "Model retrained: 95.96% CV accuracy, RF selected", user: "Admin" },
  { id: 13, ts: "03:26:00", type: "action", source: "Admin", msg: "System simulation mode changed to: hypoxia", user: "AD-001" },
  { id: 14, ts: "03:25:00", type: "info", source: "Startup", msg: "Flask server started on port 5001, DB connected", user: "System" },
];

const logTypeStyle = {
  info: "bg-blue-900/20 text-blue-300 border-blue-700/40",
  alert: "bg-red-900/20 text-red-300 border-red-700/40",
  action: "bg-emerald-900/20 text-emerald-300 border-emerald-700/40",
};

export default function AdminDashboard() {
  const [search, setSearch] = useState("");
  const [logFilter, setLogFilter] = useState<"all"|"info"|"alert"|"action">("all");

  const filteredLogs = SYSTEM_LOGS.filter(l => logFilter === "all" || l.type === logFilter);

  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-background text-foreground">
      <div className="container py-8 max-w-7xl">
        <header className="mb-6 flex items-end justify-between border-b pb-4">
          <div>
            <p className="text-sm font-semibold tracking-widest text-primary uppercase flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" /> Global Control Center
            </p>
            <h1 className="text-3xl font-bold mt-1">Admin Dashboard</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline"><Database className="h-4 w-4 mr-2" /> Export Logs</Button>
            <Button><Settings className="h-4 w-4 mr-2" /> System Settings</Button>
          </div>
        </header>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-panel border border-border p-5 rounded-xl shadow-sm">
            <h3 className="text-muted-foreground font-medium flex items-center gap-2 text-sm"><Users className="h-4 w-4" /> Total Users</h3>
            <p className="text-3xl font-bold mt-2">{MOCK_PATIENTS.length + MOCK_DOCTORS.length + 1}</p>
            <p className="text-xs text-muted-foreground mt-1">{MOCK_PATIENTS.length} patients, {MOCK_DOCTORS.length} doctors, 1 admin</p>
          </div>
          <div className="bg-panel border border-border p-5 rounded-xl shadow-sm">
            <h3 className="text-muted-foreground font-medium flex items-center gap-2 text-sm"><Activity className="h-4 w-4" /> Active Gloves</h3>
            <p className="text-3xl font-bold mt-2 text-primary">{MOCK_PATIENTS.filter(p=>p.gloveStatus==="Online").length} <span className="text-sm font-normal text-muted-foreground">Online</span></p>
          </div>
          <div className="bg-panel border border-border p-5 rounded-xl shadow-sm">
            <h3 className="text-muted-foreground font-medium flex items-center gap-2 text-sm"><AlertTriangle className="h-4 w-4" /> Critical Alerts</h3>
            <p className="text-3xl font-bold mt-2 text-critical">{MOCK_PATIENTS.filter(p=>p.risk==="Critical").length}</p>
          </div>
          <div className="bg-panel border border-border p-5 rounded-xl shadow-sm">
            <h3 className="text-muted-foreground font-medium flex items-center gap-2 text-sm"><FileText className="h-4 w-4" /> System Logs</h3>
            <p className="text-3xl font-bold mt-2">{SYSTEM_LOGS.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Today's activity</p>
          </div>
        </div>

        <Tabs defaultValue="logs" className="w-full">
          <TabsList className="mb-6 bg-muted/50 p-1 border">
            <TabsTrigger value="logs" className="px-6">System Logs</TabsTrigger>
            <TabsTrigger value="patients" className="px-6">Patient Fleet</TabsTrigger>
            <TabsTrigger value="doctors" className="px-6">Doctors</TabsTrigger>
            <TabsTrigger value="analytics" className="px-6">Analytics</TabsTrigger>
          </TabsList>

          {/* SYSTEM LOGS */}
          <TabsContent value="logs">
            <div className="bg-panel border border-border rounded-xl shadow-sm overflow-hidden">
              <div className="p-4 border-b bg-card/50 flex justify-between items-center">
                <div className="flex gap-2">
                  {(["all","info","alert","action"] as const).map(f => (
                    <button key={f} onClick={() => setLogFilter(f)}
                      className={cn("px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors capitalize",
                        logFilter===f?"bg-primary text-primary-foreground border-primary":"bg-panel border-border hover:bg-panel-elevated")}>
                      {f} {f!=="all"&&`(${SYSTEM_LOGS.filter(l=>l.type===f).length})`}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground"><Clock className="inline h-3 w-3 mr-1"/>Live system activity</p>
              </div>
              <div className="divide-y divide-border/60 max-h-[500px] overflow-auto">
                {filteredLogs.map(log => (
                  <div key={log.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                    <span className="text-xs text-muted-foreground font-mono w-16 shrink-0">{log.ts}</span>
                    <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-medium uppercase w-14 text-center shrink-0",
                      logTypeStyle[log.type as keyof typeof logTypeStyle])}>{log.type}</span>
                    <span className="text-xs text-violet-300 font-medium w-24 shrink-0">{log.source}</span>
                    <span className="text-sm flex-1">{log.msg}</span>
                    <span className="text-xs text-muted-foreground font-mono shrink-0">{log.user}</span>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* PATIENTS */}
          <TabsContent value="patients">
            <div className="bg-panel border border-border rounded-xl shadow-sm overflow-hidden">
              <div className="p-4 border-b bg-card/50 flex justify-between items-center">
                <div className="relative w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search patients..." className="pl-9 bg-background" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
              </div>
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead>Patient ID</TableHead><TableHead>Name</TableHead><TableHead>Age</TableHead>
                    <TableHead>Role</TableHead><TableHead>Glove</TableHead><TableHead>Last Sync</TableHead>
                    <TableHead className="text-right">Risk</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_PATIENTS.filter(p => p.name.toLowerCase().includes(search.toLowerCase())).map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs">{p.id}</TableCell>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>{p.age}</TableCell>
                      <TableCell><Badge variant="secondary" className="capitalize">{p.role}</Badge></TableCell>
                      <TableCell><Badge variant={p.gloveStatus==="Online"?"default":"secondary"}>{p.gloveStatus}</Badge></TableCell>
                      <TableCell className="text-muted-foreground">{p.lastSync}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={p.risk==="Critical"?"destructive":"outline"} className={p.risk==="Critical"?"bg-critical":""}>{p.risk}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* DOCTORS */}
          <TabsContent value="doctors">
            <div className="bg-panel border border-border rounded-xl shadow-sm overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead>Doctor ID</TableHead><TableHead>Name</TableHead><TableHead>Specialty</TableHead>
                    <TableHead>Assigned Patients</TableHead><TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_DOCTORS.map(doc => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-mono text-xs">{doc.id}</TableCell>
                      <TableCell className="font-medium">{doc.name}</TableCell>
                      <TableCell>{doc.specialty}</TableCell>
                      <TableCell>{doc.patients}</TableCell>
                      <TableCell className="text-right"><Badge variant={doc.status==="Active"?"default":"secondary"}>{doc.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* ANALYTICS */}
          <TabsContent value="analytics">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-panel border border-border rounded-xl shadow-sm p-6">
                <h3 className="font-semibold mb-6 flex items-center gap-2"><Activity className="h-5 w-5 text-primary" /> Active Gloves (7 Days)</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={ANALYTICS_DATA}>
                      <defs><linearGradient id="colorGloves" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/><stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/></linearGradient></defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                      <RechartsTooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }} />
                      <Area type="monotone" dataKey="activeGloves" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorGloves)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="bg-panel border border-border rounded-xl shadow-sm p-6">
                <h3 className="font-semibold mb-6 flex items-center gap-2"><ServerCrash className="h-5 w-5 text-critical" /> Alerts (7 Days)</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={ANALYTICS_DATA}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                      <RechartsTooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }} />
                      <Line type="monotone" dataKey="alerts" stroke="hsl(var(--critical))" strokeWidth={3} dot={{ r: 4, fill: "hsl(var(--critical))" }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
