import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, Droplets, Thermometer, Zap, AlertTriangle, Pill, ClipboardList, PhoneCall, ActivitySquare } from "lucide-react";
import { triggerGloveAnomaly } from "@/lib/gloveData";
import { useVitalsCtx } from "@/context/VitalsContext";
import { getAlertReasons, getRiskLabel, getRiskLevel } from "@/types/vitals";
import { VitalCard } from "@/components/VitalCard";
import { Sparkline } from "@/components/Sparkline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface Reminder { id: string; label: string; time: string; taken: boolean; }

const Patient = () => {
  const { latest, history } = useVitalsCtx();
  const reasons = latest ? getAlertReasons(latest) : [];
  const showAlert = !!latest && (latest.alert || latest.fall);

  const hrSeries = useMemo(() => history.map((h) => h.hr), [history]);
  const tempSeries = useMemo(() => history.map((h) => h.temp), [history]);

  const risk = latest?.risk ?? 0;
  const riskLevel = getRiskLevel(risk);
  const riskColorClass =
    riskLevel === "safe" ? "gradient-safe" : riskLevel === "caution" ? "gradient-caution" : "gradient-critical";

  const [reminders, setReminders] = useState<Reminder[]>([
    { id: "1", label: "Morning meds", time: "8:00 AM", taken: false },
    { id: "2", label: "Afternoon meds", time: "2:00 PM", taken: false },
    { id: "3", label: "Night meds", time: "9:00 PM", taken: false },
  ]);
  const [symptom, setSymptom] = useState("");
  const [symptoms, setSymptoms] = useState<{ id: string; text: string; at: string }[]>([]);
  const [sosOpen, setSosOpen] = useState(false);
  const [checkupRunning, setCheckupRunning] = useState(false);
  const [anomalyOpen, setAnomalyOpen] = useState(false);
  const navigate = useNavigate();

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
    setSymptoms((s) => [
      { id: crypto.randomUUID(), text: symptom.trim(), at: new Date().toLocaleTimeString() },
      ...s,
    ]);
    setSymptom("");
  };

  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-background">
      {showAlert && (
        <div className="bg-critical text-critical-foreground animate-blink">
          <div className="container flex items-center gap-3 py-3">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <div className="flex-1">
              <p className="font-semibold tracking-wide">ALERT — Check Patient Immediately</p>
              <p className="text-sm opacity-90">
                {reasons.map((r) => `${r.type} (${r.detail})`).join(" · ") || "Vitals out of safe range"}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="container py-8 space-y-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-widest text-muted-foreground">Patient Dashboard</p>
            <h1 className="text-3xl font-semibold tracking-tight">Live Vitals Monitor</h1>
          </div>
          <p className="text-sm text-muted-foreground font-mono-tabular">
            {latest ? new Date(latest.timestamp).toLocaleTimeString() : "Awaiting data…"}
          </p>
        </header>

        {/* Vitals grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <VitalCard
            label="Heart Rate"
            value={latest?.hr ?? "—"}
            unit="BPM"
            icon={<Heart className="h-5 w-5" />}
            alert={!!latest && (latest.hr < 50 || latest.hr > 120)}
            hint="Normal 50–120"
          />
          <VitalCard
            label="SpO₂"
            value={latest?.spo2 ?? "—"}
            unit="%"
            icon={<Droplets className="h-5 w-5" />}
            alert={!!latest && latest.spo2 < 94}
            hint="Normal ≥ 94%"
          />
          <VitalCard
            label="Body Temperature"
            value={latest?.temp.toFixed(1) ?? "—"}
            unit="°C"
            icon={<Thermometer className="h-5 w-5" />}
            alert={!!latest && (latest.temp < 15 || latest.temp > 50)}
            hint="Safe 15–50°C"
          />
          <VitalCard
            label="Impact / G-Force"
            value={latest?.gforce.toFixed(2) ?? "—"}
            unit="G"
            icon={<Zap className="h-5 w-5" />}
            alert={!!latest && latest.fall}
            hint={latest?.fall ? "Fall detected" : "No fall"}
          />
        </section>

        {/* Risk + sparklines */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="rounded-xl border border-border bg-panel p-5 shadow-card lg:col-span-1">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Risk Score</span>
              <span
                className={cn(
                  "text-xs font-semibold px-2 py-1 rounded-md",
                  riskLevel === "safe" && "bg-safe/15 text-safe",
                  riskLevel === "caution" && "bg-caution/15 text-caution",
                  riskLevel === "critical" && "bg-critical/15 text-critical",
                )}
              >
                {getRiskLabel(risk)}
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-5xl font-semibold font-mono-tabular">{risk}</span>
              <span className="text-sm text-muted-foreground">/ 100</span>
            </div>
            <div className="mt-4 h-3 rounded-full bg-secondary overflow-hidden">
              <div className={cn("h-full rounded-full transition-all duration-500", riskColorClass)} style={{ width: `${risk}%` }} />
            </div>
            <div className="mt-2 flex justify-between text-[10px] text-muted-foreground uppercase tracking-wider">
              <span>Safe</span><span>Caution</span><span>Critical</span>
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

        {/* Meds + Symptoms */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border bg-panel p-5 shadow-card">
            <div className="flex items-center gap-2 mb-4">
              <Pill className="h-4 w-4 text-primary" />
              <h2 className="font-semibold">Medication Reminders</h2>
            </div>
            <ul className="space-y-2">
              {reminders.map((r) => (
                <li key={r.id} className="flex items-center justify-between rounded-lg bg-panel-elevated px-4 py-3 border border-border/60">
                  <div>
                    <p className={cn("font-medium", r.taken && "line-through text-muted-foreground")}>{r.label}</p>
                    <p className="text-xs text-muted-foreground">{r.time}</p>
                  </div>
                  <Button
                    size="sm"
                    variant={r.taken ? "secondary" : "default"}
                    disabled={r.taken}
                    onClick={() => setReminders((rs) => rs.map((x) => (x.id === r.id ? { ...x, taken: true } : x)))}
                  >
                    {r.taken ? "Taken ✓" : "Mark as Taken"}
                  </Button>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-border bg-panel p-5 shadow-card">
            <div className="flex items-center gap-2 mb-4">
              <ClipboardList className="h-4 w-4 text-primary" />
              <h2 className="font-semibold">Symptom Log</h2>
            </div>
            <form onSubmit={submitSymptom} className="flex gap-2">
              <Input value={symptom} onChange={(e) => setSymptom(e.target.value)} placeholder="Describe a symptom…" />
              <Button type="submit">Add</Button>
            </form>
            <ul className="mt-4 space-y-2 max-h-56 overflow-auto pr-1">
              {symptoms.length === 0 && <li className="text-sm text-muted-foreground">No symptoms logged.</li>}
              {symptoms.map((s) => (
                <li key={s.id} className="flex items-start justify-between gap-3 rounded-lg bg-panel-elevated px-3 py-2 border border-border/60">
                  <span className="text-sm">{s.text}</span>
                  <span className="text-xs text-muted-foreground font-mono-tabular shrink-0">{s.at}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Actions */}
        <section className="flex flex-col sm:flex-row justify-center gap-6 pt-4">
          <button
            onClick={runGloveCheckup}
            disabled={checkupRunning}
            className="relative rounded-full bg-primary text-primary-foreground px-12 py-6 text-xl font-bold tracking-wider uppercase shadow-glow-primary hover:scale-105 transition-transform disabled:opacity-70 disabled:hover:scale-100"
          >
            <ActivitySquare className={cn("inline h-6 w-6 mr-3 -mt-1", checkupRunning && "animate-spin")} />
            {checkupRunning ? "Running Checkup..." : "Run Glove Checkup"}
          </button>
          
          <button
            onClick={() => setSosOpen(true)}
            className="relative rounded-full bg-critical text-critical-foreground px-12 py-6 text-xl font-bold tracking-wider uppercase shadow-glow-critical animate-pulse-ring hover:scale-105 transition-transform"
          >
            <PhoneCall className="inline h-6 w-6 mr-3 -mt-1" />
            SOS — Emergency
          </button>
        </section>
      </div>

      <Dialog open={sosOpen} onOpenChange={setSosOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-critical">Emergency Triggered</DialogTitle>
            <DialogDescription>Doctor and family have been notified.</DialogDescription>
          </DialogHeader>
          <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-md bg-panel-elevated px-3 py-2 border border-border">
              <p className="text-xs text-muted-foreground">Heart Rate</p>
              <p className="font-mono-tabular text-lg">{latest?.hr ?? "—"} BPM</p>
            </div>
            <div className="rounded-md bg-panel-elevated px-3 py-2 border border-border">
              <p className="text-xs text-muted-foreground">SpO₂</p>
              <p className="font-mono-tabular text-lg">{latest?.spo2 ?? "—"}%</p>
            </div>
            <div className="rounded-md bg-panel-elevated px-3 py-2 border border-border">
              <p className="text-xs text-muted-foreground">Temperature</p>
              <p className="font-mono-tabular text-lg">{latest?.temp.toFixed(1) ?? "—"}°C</p>
            </div>
            <div className="rounded-md bg-panel-elevated px-3 py-2 border border-border">
              <p className="text-xs text-muted-foreground">G-Force</p>
              <p className="font-mono-tabular text-lg">{latest?.gforce.toFixed(2) ?? "—"} G</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={anomalyOpen} onOpenChange={setAnomalyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-critical flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Glove Anomaly Detected
            </DialogTitle>
            <DialogDescription className="text-base mt-2">
              The Smart Glove detected an <strong>Abnormal Heart Rate (135 BPM)</strong> indicating possible Arrhythmia.
              <br /><br />
              Based on this reading, we highly recommend scheduling a consultation with a specialist immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setAnomalyOpen(false)}>Dismiss</Button>
            <Button onClick={() => navigate("/discovery")} className="bg-primary text-primary-foreground">
              Find a Doctor
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default Patient;
