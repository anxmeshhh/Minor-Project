import { useState } from "react";
import { Search, HeartPulse, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Sparkline } from "@/components/Sparkline";

const MOCK_FLEET = [
  { id: "PT-001", name: "Riya Patient", hr: 72, spo2: 98, temp: 36.5, risk: "Low", status: "Stable", recentAlert: "None", history: [70, 72, 71, 74, 72, 71, 72] },
  { id: "PT-002", name: "James Holden", hr: 135, spo2: 92, temp: 37.1, risk: "Critical", status: "Needs Attention", recentAlert: "Abnormal HR", history: [80, 85, 95, 110, 125, 130, 135] },
  { id: "PT-003", name: "Naomi Nagata", hr: 65, spo2: 99, temp: 36.8, risk: "Low", status: "Stable", recentAlert: "None", history: [68, 66, 65, 64, 65, 66, 65] },
  { id: "PT-004", name: "Amos Burton", hr: 90, spo2: 95, temp: 38.2, risk: "Caution", status: "Observation", recentAlert: "Slight Fever", history: [75, 78, 82, 85, 88, 89, 90] },
  { id: "PT-005", name: "Alex Kamal", hr: 68, spo2: 97, temp: 36.6, risk: "Low", status: "Stable", recentAlert: "None", history: [70, 69, 68, 68, 67, 68, 68] },
];

export default function DoctorDashboard() {
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  // Smart Logic: Sort patients by Risk Level (Critical first, Caution second, Low last)
  const sortedFleet = [...MOCK_FLEET].sort((a, b) => {
    const riskScore = (risk: string) => risk === "Critical" ? 3 : risk === "Caution" ? 2 : 1;
    return riskScore(b.risk) - riskScore(a.risk);
  });

  const filteredFleet = sortedFleet.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="theme-clinical min-h-[calc(100vh-3.5rem)] bg-background text-foreground">
      <div className="container py-8 max-w-6xl">
        <header className="mb-8 flex items-end justify-between border-b pb-4">
          <div>
            <p className="text-sm font-semibold tracking-widest text-primary uppercase flex items-center gap-2">
              <HeartPulse className="h-4 w-4" /> Clinician Dashboard
            </p>
            <h1 className="text-3xl font-bold mt-1">Patient Fleet</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline"><Filter className="h-4 w-4 mr-2" /> Filter Views</Button>
          </div>
        </header>

        <div className="bg-panel border border-border rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b bg-card/50 flex justify-between items-center">
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search assigned patients..." 
                className="pl-9 bg-background"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <p className="text-sm text-muted-foreground">Showing {filteredFleet.length} patients</p>
          </div>
          
          <Table>
            <TableHeader className="bg-muted/30">
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Patient Name</TableHead>
                <TableHead className="text-right">HR (BPM)</TableHead>
                <TableHead className="w-[120px]">HR Trend (1h)</TableHead>
                <TableHead className="text-right">SpO₂ (%)</TableHead>
                <TableHead>Recent Alert</TableHead>
                <TableHead className="text-right">Risk Level</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFleet.map((patient) => (
                <TableRow 
                  key={patient.id} 
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => navigate(`/doctor/patient/${patient.id}`)}
                >
                  <TableCell className="font-mono text-xs">{patient.id}</TableCell>
                  <TableCell className="font-medium">{patient.name}</TableCell>
                  <TableCell className={`text-right font-mono ${patient.hr > 100 || patient.hr < 60 ? 'text-critical font-bold' : ''}`}>
                    {patient.hr}
                  </TableCell>
                  <TableCell>
                    <Sparkline 
                      data={patient.history} 
                      width={100} 
                      height={30} 
                      stroke={patient.risk === "Critical" ? "hsl(var(--critical))" : patient.risk === "Caution" ? "hsl(var(--caution))" : "hsl(var(--primary))"}
                      fill={patient.risk === "Critical" ? "hsl(var(--critical) / 0.2)" : patient.risk === "Caution" ? "hsl(var(--caution) / 0.2)" : "hsl(var(--primary) / 0.2)"}
                    />
                  </TableCell>
                  <TableCell className={`text-right font-mono ${patient.spo2 < 95 ? 'text-caution font-bold' : ''}`}>
                    {patient.spo2}%
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{patient.recentAlert}</TableCell>
                  <TableCell className="text-right">
                    <Badge 
                      variant={patient.risk === "Critical" ? "destructive" : patient.risk === "Caution" ? "secondary" : "outline"}
                      className={patient.risk === "Critical" ? "bg-critical text-critical-foreground animate-pulse" : patient.risk === "Caution" ? "bg-caution text-caution-foreground" : ""}
                    >
                      {patient.risk}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {filteredFleet.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No patients found matching your search.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </main>
  );
}
