import { useState } from "react";
import { ShieldCheck, Activity, Users, Settings, Database, ServerCrash, Search } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Area, AreaChart } from "recharts";

const MOCK_PATIENTS = [
  { id: "PT-001", name: "Riya Patient", age: 64, gloveStatus: "Online", lastSync: "2 mins ago", risk: "Low" },
  { id: "PT-002", name: "James Holden", age: 45, gloveStatus: "Online", lastSync: "Just now", risk: "Critical" },
  { id: "PT-003", name: "Naomi Nagata", age: 38, gloveStatus: "Offline", lastSync: "2 hours ago", risk: "Medium" },
  { id: "PT-004", name: "Amos Burton", age: 41, gloveStatus: "Online", lastSync: "1 min ago", risk: "Low" },
];

const MOCK_DOCTORS = [
  { id: "DR-001", name: "Dr. Mehra", specialty: "Cardiology", patients: 142, status: "Active" },
  { id: "DR-002", name: "Dr. Jenkins", specialty: "Neurology", patients: 89, status: "Active" },
  { id: "DR-003", name: "Dr. Chen", specialty: "General Practice", patients: 310, status: "On Leave" },
];

const ANALYTICS_DATA = [
  { day: "Mon", activeGloves: 8120, alerts: 12 },
  { day: "Tue", activeGloves: 8145, alerts: 18 },
  { day: "Wed", activeGloves: 8150, alerts: 9 },
  { day: "Thu", activeGloves: 8190, alerts: 14 },
  { day: "Fri", activeGloves: 8205, alerts: 22 },
  { day: "Sat", activeGloves: 8180, alerts: 8 },
  { day: "Sun", activeGloves: 8194, alerts: 11 },
];

export default function AdminDashboard() {
  const [search, setSearch] = useState("");

  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-background text-foreground">
      <div className="container py-8 max-w-7xl">
        <header className="mb-8 flex items-end justify-between border-b pb-4">
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-panel border border-border p-5 rounded-xl shadow-sm">
            <h3 className="text-muted-foreground font-medium flex items-center gap-2"><Users className="h-4 w-4" /> Total Users</h3>
            <p className="text-3xl font-bold mt-2">12,482</p>
          </div>
          <div className="bg-panel border border-border p-5 rounded-xl shadow-sm">
            <h3 className="text-muted-foreground font-medium flex items-center gap-2"><Activity className="h-4 w-4" /> Active Gloves</h3>
            <p className="text-3xl font-bold mt-2 text-primary">8,194 <span className="text-sm font-normal text-muted-foreground tracking-wide">Online</span></p>
          </div>
          <div className="bg-critical/10 border border-critical/30 p-5 rounded-xl shadow-sm">
            <h3 className="text-critical font-medium flex items-center gap-2"><ServerCrash className="h-4 w-4" /> Hardware Anomalies</h3>
            <p className="text-3xl font-bold mt-2 text-critical">14 <span className="text-sm font-normal text-foreground tracking-wide">Requires attention</span></p>
          </div>
        </div>

        <Tabs defaultValue="patients" className="w-full">
          <TabsList className="mb-6 bg-muted/50 p-1 border">
            <TabsTrigger value="patients" className="px-6">Patient Fleet</TabsTrigger>
            <TabsTrigger value="doctors" className="px-6">Doctors Directory</TabsTrigger>
            <TabsTrigger value="alerts" className="px-6">System Alerts</TabsTrigger>
          </TabsList>

          <TabsContent value="patients">
            <div className="bg-panel border border-border rounded-xl shadow-sm overflow-hidden">
              <div className="p-4 border-b bg-card/50 flex justify-between items-center">
                <div className="relative w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search patients by ID or name..." 
                    className="pl-9 bg-background"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Button variant="secondary" size="sm">Filter by Risk</Button>
              </div>
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead>Patient ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Age</TableHead>
                    <TableHead>Glove Status</TableHead>
                    <TableHead>Last Sync</TableHead>
                    <TableHead className="text-right">Risk Level</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_PATIENTS.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.id.toLowerCase().includes(search.toLowerCase())).map((patient) => (
                    <TableRow key={patient.id}>
                      <TableCell className="font-mono text-xs">{patient.id}</TableCell>
                      <TableCell className="font-medium">{patient.name}</TableCell>
                      <TableCell>{patient.age}</TableCell>
                      <TableCell>
                        <Badge variant={patient.gloveStatus === "Online" ? "default" : "secondary"}>
                          {patient.gloveStatus}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{patient.lastSync}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={patient.risk === "Critical" ? "destructive" : "outline"} className={patient.risk === "Critical" ? "bg-critical" : ""}>
                          {patient.risk}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="doctors">
            <div className="bg-panel border border-border rounded-xl shadow-sm overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead>Doctor ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Specialty</TableHead>
                    <TableHead>Assigned Patients</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_DOCTORS.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-mono text-xs">{doc.id}</TableCell>
                      <TableCell className="font-medium">{doc.name}</TableCell>
                      <TableCell>{doc.specialty}</TableCell>
                      <TableCell>{doc.patients}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={doc.status === "Active" ? "default" : "secondary"}>
                          {doc.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
          
          <TabsContent value="alerts">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-panel border border-border rounded-xl shadow-sm p-6">
                <h3 className="font-semibold mb-6 flex items-center gap-2"><Activity className="h-5 w-5 text-primary" /> Active Gloves (7 Days)</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={ANALYTICS_DATA}>
                      <defs>
                        <linearGradient id="colorGloves" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} domain={['dataMin - 100', 'dataMax + 100']} />
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                        itemStyle={{ color: 'hsl(var(--foreground))' }}
                      />
                      <Area type="monotone" dataKey="activeGloves" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorGloves)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
              
              <div className="bg-panel border border-border rounded-xl shadow-sm p-6">
                <h3 className="font-semibold mb-6 flex items-center gap-2"><ServerCrash className="h-5 w-5 text-critical" /> Hardware Anomalies (7 Days)</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={ANALYTICS_DATA}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                      <RechartsTooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                        itemStyle={{ color: 'hsl(var(--foreground))' }}
                      />
                      <Line type="monotone" dataKey="alerts" stroke="hsl(var(--critical))" strokeWidth={3} dot={{ r: 4, fill: "hsl(var(--critical))" }} activeDot={{ r: 6 }} />
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
