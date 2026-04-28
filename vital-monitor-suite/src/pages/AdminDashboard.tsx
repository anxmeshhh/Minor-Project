import { useState, useEffect, useCallback } from "react";
import {
  ShieldCheck, Activity, Users, Settings, Database, ServerCrash,
  Search, FileText, Clock, AlertTriangle, CheckCircle2, Brain,
  Sparkles, Bell, RefreshCw, Heart, Pill
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const BASE = "http://localhost:5001";
async function api<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

interface AdminStats {
  total_patients: number;
  total_family_members: number;
  total_family_groups: number;
  total_health_entries: number;
  total_checkups: number;
  total_documents: number;
  total_ml_results: number;
  total_ai_results: number;
  total_doctor_requests: number;
  pending_requests: number;
  total_notifications: number;
  unread_notifications: number;
  total_telemetry: number;
  total_alerts: number;
  total_doctors: number;
}

interface MemberRow {
  id: number;
  name: string;
  relation: string;
  role: string;
  group_name: string;
  entry_count: number;
  checkup_count: number;
  ml_count: number;
  ai_count: number;
  created_at: string;
}

interface ActivityLog {
  source: string;
  sub_type: string;
  title: string;
  detail: string;
  created_at: string;
}

interface DoctorProfile {
  id: number;
  user_id: number;
  name: string;
  specialization: string;
  experience_years: number;
  availability: string;
  hospital: string;
  phone: string;
}

const logTypeStyle: Record<string, string> = {
  alert: "bg-red-900/20 text-red-300 border-red-700/40",
  doctor_response: "bg-emerald-900/20 text-emerald-300 border-emerald-700/40",
  ai_scan: "bg-violet-900/20 text-violet-300 border-violet-700/40",
  member_update: "bg-blue-900/20 text-blue-300 border-blue-700/40",
  appointment: "bg-amber-900/20 text-amber-300 border-amber-700/40",
  pending: "bg-amber-900/20 text-amber-300 border-amber-700/40",
  accepted: "bg-emerald-900/20 text-emerald-300 border-emerald-700/40",
  rejected: "bg-red-900/20 text-red-300 border-red-700/40",
  notification: "bg-blue-900/20 text-blue-300 border-blue-700/40",
  doctor_request: "bg-violet-900/20 text-violet-300 border-violet-700/40",
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [mlInfo, setMlInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [logFilter, setLogFilter] = useState<"all" | "notification" | "doctor_request">("all");

  const reload = useCallback(async () => {
    setLoading(true);
    const [s, m, l, d, ml] = await Promise.all([
      api<AdminStats>(`${BASE}/api/admin/stats`),
      api<MemberRow[]>(`${BASE}/api/admin/users`),
      api<ActivityLog[]>(`${BASE}/api/admin/logs`),
      api<DoctorProfile[]>(`${BASE}/api/admin/doctors`),
      api<any>(`${BASE}/api/ml/info`),
    ]);
    if (s) setStats(s);
    if (m) setMembers(m);
    if (l) setLogs(l);
    if (d) setDoctors(d);
    if (ml) setMlInfo(ml);
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const filteredLogs = logs.filter(
    (l) => logFilter === "all" || l.source === logFilter
  );

  if (loading) {
    return (
      <div className="container py-20 text-center text-muted-foreground">
        Loading admin data from database...
      </div>
    );
  }

  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-background text-foreground">
      <div className="container py-8 max-w-7xl">
        <header className="mb-6 flex items-end justify-between border-b pb-4">
          <div>
            <p className="text-sm font-semibold tracking-widest text-primary uppercase flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" /> Global Control Center
            </p>
            <h1 className="text-3xl font-bold mt-1">Admin Dashboard</h1>
            <p className="text-xs text-muted-foreground mt-1">
              All data from MySQL database — zero hardcoding
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={reload}>
              <RefreshCw className="h-4 w-4 mr-2" /> Refresh
            </Button>
            <Button>
              <Settings className="h-4 w-4 mr-2" /> System Settings
            </Button>
          </div>
        </header>

        {/* Summary Cards — all from DB */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-panel border border-border p-5 rounded-xl shadow-sm">
            <h3 className="text-muted-foreground font-medium flex items-center gap-2 text-sm">
              <Users className="h-4 w-4" /> Total Members
            </h3>
            <p className="text-3xl font-bold mt-2">{stats?.total_family_members ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.total_family_groups ?? 0} families · {stats?.total_doctors ?? 0} doctors
            </p>
          </div>
          <div className="bg-panel border border-border p-5 rounded-xl shadow-sm">
            <h3 className="text-muted-foreground font-medium flex items-center gap-2 text-sm">
              <Pill className="h-4 w-4" /> Health Entries
            </h3>
            <p className="text-3xl font-bold mt-2 text-primary">{stats?.total_health_entries ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.total_checkups ?? 0} checkups · {stats?.total_documents ?? 0} docs
            </p>
          </div>
          <div className="bg-panel border border-border p-5 rounded-xl shadow-sm">
            <h3 className="text-muted-foreground font-medium flex items-center gap-2 text-sm">
              <Brain className="h-4 w-4" /> ML Results
            </h3>
            <p className="text-3xl font-bold mt-2 text-violet-400">{stats?.total_ml_results ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {mlInfo?.model_ready ? `${mlInfo.best_algorithm} · ${(mlInfo.cv_accuracy * 100).toFixed(1)}%` : "Model not ready"}
            </p>
          </div>
          <div className="bg-panel border border-border p-5 rounded-xl shadow-sm">
            <h3 className="text-muted-foreground font-medium flex items-center gap-2 text-sm">
              <Sparkles className="h-4 w-4" /> AI Results
            </h3>
            <p className="text-3xl font-bold mt-2 text-blue-400">{stats?.total_ai_results ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.total_doctor_requests ?? 0} doctor requests · {stats?.pending_requests ?? 0} pending
            </p>
          </div>
          <div className="bg-panel border border-border p-5 rounded-xl shadow-sm">
            <h3 className="text-muted-foreground font-medium flex items-center gap-2 text-sm">
              <Bell className="h-4 w-4" /> Notifications
            </h3>
            <p className="text-3xl font-bold mt-2">{stats?.total_notifications ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.unread_notifications ?? 0} unread · {stats?.total_alerts ?? 0} alerts
            </p>
          </div>
        </div>

        <Tabs defaultValue="logs" className="w-full">
          <TabsList className="mb-6 bg-muted/50 p-1 border">
            <TabsTrigger value="logs" className="px-6">Activity Logs</TabsTrigger>
            <TabsTrigger value="users" className="px-6">Users & Members</TabsTrigger>
            <TabsTrigger value="doctors" className="px-6">Doctors</TabsTrigger>
            <TabsTrigger value="mlai" className="px-6">ML + AI Monitor</TabsTrigger>
          </TabsList>

          {/* ACTIVITY LOGS — from DB */}
          <TabsContent value="logs">
            <div className="bg-panel border border-border rounded-xl shadow-sm overflow-hidden">
              <div className="p-4 border-b bg-card/50 flex justify-between items-center">
                <div className="flex gap-2">
                  {(["all", "notification", "doctor_request"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setLogFilter(f)}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors capitalize",
                        logFilter === f
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-panel border-border hover:bg-panel-elevated"
                      )}
                    >
                      {f === "all" ? "All" : f.replace("_", " ")} {f !== "all" && `(${logs.filter((l) => l.source === f).length})`}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  <Database className="inline h-3 w-3 mr-1" />
                  From MySQL — {logs.length} entries
                </p>
              </div>
              <div className="divide-y divide-border/60 max-h-[500px] overflow-auto">
                {filteredLogs.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">No activity logs found.</div>
                ) : (
                  filteredLogs.map((log, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
                    >
                      <span className="text-xs text-muted-foreground font-mono w-36 shrink-0">
                        {log.created_at}
                      </span>
                      <span
                        className={cn(
                          "text-[10px] px-2 py-0.5 rounded-full border font-medium uppercase w-24 text-center shrink-0",
                          logTypeStyle[log.sub_type] || logTypeStyle[log.source] || "bg-zinc-900/20 text-zinc-300 border-zinc-700/40"
                        )}
                      >
                        {log.sub_type}
                      </span>
                      <span className="text-xs text-violet-300 font-medium w-28 shrink-0 capitalize">
                        {log.source.replace("_", " ")}
                      </span>
                      <span className="text-sm flex-1">{log.title}</span>
                      <span className="text-xs text-muted-foreground max-w-xs truncate shrink-0">
                        {log.detail}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </TabsContent>

          {/* USERS — from DB */}
          <TabsContent value="users">
            <div className="bg-panel border border-border rounded-xl shadow-sm overflow-hidden">
              <div className="p-4 border-b bg-card/50 flex justify-between items-center">
                <div className="relative w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search members..."
                    className="pl-9 bg-background"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  <Database className="inline h-3 w-3 mr-1" />
                  {members.length} members from DB
                </p>
              </div>
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Relation</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Family</TableHead>
                    <TableHead>Entries</TableHead>
                    <TableHead>Checkups</TableHead>
                    <TableHead>ML</TableHead>
                    <TableHead className="text-right">AI</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members
                    .filter((m) =>
                      m.name.toLowerCase().includes(search.toLowerCase())
                    )
                    .map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="font-mono text-xs">{m.id}</TableCell>
                        <TableCell className="font-medium">{m.name}</TableCell>
                        <TableCell className="capitalize">{m.relation}</TableCell>
                        <TableCell>
                          <Badge variant={m.role === "admin" ? "default" : "secondary"} className="capitalize">
                            {m.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{m.group_name}</TableCell>
                        <TableCell>{m.entry_count}</TableCell>
                        <TableCell>{m.checkup_count}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-violet-300 bg-violet-900/20 border-violet-700/40">
                            {m.ml_count}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant="secondary" className="text-blue-300 bg-blue-900/20 border-blue-700/40">
                            {m.ai_count}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* DOCTORS — from DB */}
          <TabsContent value="doctors">
            <div className="bg-panel border border-border rounded-xl shadow-sm overflow-hidden">
              <div className="p-4 border-b bg-card/50">
                <p className="text-xs text-muted-foreground">
                  <Database className="inline h-3 w-3 mr-1" />
                  Doctor profiles from <code className="bg-zinc-800 px-1 rounded text-xs">doctor_profiles</code> table
                </p>
              </div>
              {doctors.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  No doctor profiles found in database.
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Specialization</TableHead>
                      <TableHead>Experience</TableHead>
                      <TableHead>Hospital</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {doctors.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-mono text-xs">DR-{String(doc.id).padStart(3, "0")}</TableCell>
                        <TableCell className="font-medium">{doc.name}</TableCell>
                        <TableCell>{doc.specialization}</TableCell>
                        <TableCell>{doc.experience_years} years</TableCell>
                        <TableCell className="text-muted-foreground">{doc.hospital}</TableCell>
                        <TableCell className="font-mono text-xs">{doc.phone}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={doc.availability === "Available" ? "default" : "secondary"}>
                            {doc.availability}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </TabsContent>

          {/* ML + AI MONITOR — from DB */}
          <TabsContent value="mlai">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* ML Monitor */}
              <div className="bg-panel border border-violet-700/30 rounded-xl shadow-sm p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Brain className="h-5 w-5 text-violet-400" /> ML Pipeline Status
                </h3>
                {mlInfo?.model_ready ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg bg-violet-900/20 border border-violet-700/30 p-3">
                        <p className="text-[10px] text-violet-300 uppercase">Algorithm</p>
                        <p className="text-sm font-medium text-violet-100">{mlInfo.best_algorithm}</p>
                      </div>
                      <div className="rounded-lg bg-violet-900/20 border border-violet-700/30 p-3">
                        <p className="text-[10px] text-violet-300 uppercase">CV Accuracy</p>
                        <p className="text-sm font-medium text-violet-100">{(mlInfo.cv_accuracy * 100).toFixed(2)}%</p>
                      </div>
                      <div className="rounded-lg bg-violet-900/20 border border-violet-700/30 p-3">
                        <p className="text-[10px] text-violet-300 uppercase">Classes</p>
                        <p className="text-sm font-medium text-violet-100">{mlInfo.classes?.length || 0}</p>
                      </div>
                      <div className="rounded-lg bg-violet-900/20 border border-violet-700/30 p-3">
                        <p className="text-[10px] text-violet-300 uppercase">Total Predictions</p>
                        <p className="text-sm font-medium text-violet-100">{stats?.total_ml_results ?? 0}</p>
                      </div>
                    </div>
                    {mlInfo.classes && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">Detectable Conditions:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {mlInfo.classes.map((cls: string) => (
                            <span key={cls} className="text-[10px] px-2 py-0.5 rounded-full border border-violet-700/40 bg-violet-900/20 text-violet-300 capitalize">
                              {cls.replace("_", " ")}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Brain className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">ML model not trained yet</p>
                    <p className="text-xs mt-1">Run: <code className="bg-zinc-800 px-1 rounded">python ml/trainer.py</code></p>
                  </div>
                )}
              </div>

              {/* AI Monitor */}
              <div className="bg-panel border border-blue-700/30 rounded-xl shadow-sm p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-blue-400" /> AI Pipeline Status
                </h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-blue-900/20 border border-blue-700/30 p-3">
                      <p className="text-[10px] text-blue-300 uppercase">Total Analyses</p>
                      <p className="text-sm font-medium text-blue-100">{stats?.total_ai_results ?? 0}</p>
                    </div>
                    <div className="rounded-lg bg-blue-900/20 border border-blue-700/30 p-3">
                      <p className="text-[10px] text-blue-300 uppercase">Model</p>
                      <p className="text-sm font-medium text-blue-100">LLaMA3-70B</p>
                    </div>
                    <div className="rounded-lg bg-blue-900/20 border border-blue-700/30 p-3">
                      <p className="text-[10px] text-blue-300 uppercase">Doctor Requests</p>
                      <p className="text-sm font-medium text-blue-100">{stats?.total_doctor_requests ?? 0}</p>
                    </div>
                    <div className="rounded-lg bg-blue-900/20 border border-blue-700/30 p-3">
                      <p className="text-[10px] text-blue-300 uppercase">Pending</p>
                      <p className="text-sm font-medium text-blue-100">{stats?.pending_requests ?? 0}</p>
                    </div>
                  </div>
                  <div className="rounded-lg border border-blue-700/20 bg-blue-950/20 p-3">
                    <p className="text-xs text-blue-300 font-medium mb-1">Pipeline Flow</p>
                    <p className="text-xs text-blue-100/70">
                      User Profile → Family Hub → Sensor Data → ML Classification → Rule Engine → Groq AI Analysis → Doctor Review → Patient + Family Notification
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
