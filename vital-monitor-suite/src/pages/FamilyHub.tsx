import { useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Users, FileText, CalendarClock, Pill, Activity, ArrowRight, HeartPulse, AlertTriangle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useFamilyHealth } from "@/hooks/useFamilyHealth";
import { useAuth } from "@/context/AuthContext";
import { format, isAfter } from "date-fns";
import { useGloveCheckup } from "@/lib/gloveData";
import { useNavigate } from "react-router-dom";

interface TileProps {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count: number | string;
  hint: string;
}

function Tile({ to, icon: Icon, label, count, hint }: TileProps) {
  return (
    <Link to={to} className="group">
      <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.15 }}>
        <Card className="p-5 bg-panel border-border/60 shadow-card h-full">
          <div className="flex items-start justify-between">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <div className="mt-4">
            <div className="text-2xl font-semibold font-mono-tabular">{count}</div>
            <div className="text-sm font-medium mt-0.5">{label}</div>
            <div className="text-xs text-muted-foreground mt-1">{hint}</div>
          </div>
        </Card>
      </motion.div>
    </Link>
  );
}

export default function FamilyHub() {
  const { user } = useAuth();
  const { members, documents, appointments, medications } = useFamilyHealth();
  const checkup = useGloveCheckup();
  const navigate = useNavigate();

  const upcoming = useMemo(
    () => appointments
      .filter((a) => a.status === "scheduled" && isAfter(new Date(a.datetime), new Date()))
      .sort((a, b) => +new Date(a.datetime) - +new Date(b.datetime))
      .slice(0, 4),
    [appointments],
  );

  const recentDocs = useMemo(
    () => [...documents].sort((a, b) => b.uploadedAt - a.uploadedAt).slice(0, 5),
    [documents],
  );

  const activeMeds = medications.filter((m) => m.active).length;
  const memberName = (id: string) => members.find((m) => m.id === id)?.name ?? "—";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="container py-8 max-w-6xl"
    >
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <HeartPulse className="h-6 w-6 text-primary" /> Family Health Hub
        </h1>
        <p className="text-sm text-muted-foreground">
          Welcome{user ? `, ${user.name}` : ""}. Everything for your family's health, in one calm space.
        </p>
      </div>

      {checkup?.hasAnomaly && (
        <Card className="p-4 mb-6 bg-critical/10 border-critical/30 border shadow-sm cursor-pointer hover:bg-critical/15 transition-colors" onClick={() => navigate("/discovery")}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-critical/20 p-2 rounded-full">
                <AlertTriangle className="h-5 w-5 text-critical animate-pulse" />
              </div>
              <div>
                <h3 className="font-semibold text-critical">Smart Glove Alert</h3>
                <p className="text-sm">Abnormal checkup detected: {checkup.details}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-sm font-medium text-critical">
              Find Specialist <ArrowRight className="h-4 w-4" />
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Tile to="/family/members" icon={Users} label="Members" count={members.length}
          hint="Profiles & medical info" />
        <Tile to="/family/documents" icon={FileText} label="Documents" count={documents.length}
          hint="Prescriptions & reports" />
        <Tile to="/family/appointments" icon={CalendarClock} label="Appointments" count={upcoming.length}
          hint="Upcoming visits" />
        <Tile to="/family/medications" icon={Pill} label="Medications" count={activeMeds}
          hint="Currently active" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mt-6">
        <Card className="p-5 bg-panel border-border/60 shadow-card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-medium flex items-center gap-2"><CalendarClock className="h-4 w-4 text-primary" /> Next appointments</h2>
            <Link to="/family/appointments" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Nothing scheduled.</p>
          ) : (
            <ul className="divide-y divide-border/60">
              {upcoming.map((a) => (
                <li key={a.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">Dr. {a.doctor}</div>
                    <div className="text-xs text-muted-foreground">{memberName(a.memberId)} · {a.location || "—"}</div>
                  </div>
                  <Badge variant="secondary" className="font-mono-tabular shrink-0">
                    {format(new Date(a.datetime), "d MMM, p")}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5 bg-panel border-border/60 shadow-card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-medium flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Recent documents</h2>
            <Link to="/family/documents" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          {recentDocs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No documents uploaded yet.</p>
          ) : (
            <ul className="divide-y divide-border/60">
              {recentDocs.map((d) => (
                <li key={d.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{d.title}</div>
                    <div className="text-xs text-muted-foreground">{memberName(d.memberId)} · <span className="capitalize">{d.type}</span></div>
                  </div>
                  <Badge variant="secondary" className="font-mono-tabular shrink-0">
                    {format(d.uploadedAt, "d MMM")}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card className="mt-6 p-5 bg-panel-elevated border-border/60 flex items-center gap-4 flex-wrap">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary">
          <Activity className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium">Live wearable monitoring</p>
          <p className="text-sm text-muted-foreground">See real-time vitals from your VitalGlove device.</p>
        </div>
        <Link to="/" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
          Open Patient View <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </Card>
    </motion.div>
  );
}
