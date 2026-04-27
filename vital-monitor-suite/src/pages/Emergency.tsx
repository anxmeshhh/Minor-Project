import { useEffect, useRef, useState } from "react";
import { Heart, Droplets, Thermometer, Zap, MapPin, Phone, Users, Stethoscope, CheckCircle2, Clock, Circle } from "lucide-react";
import { useVitalsCtx } from "@/context/VitalsContext";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type StepStatus = "pending" | "triggered" | "done";
interface Step { key: "doctor" | "family" | "ambulance"; label: string; status: StepStatus; at: number | null; }
interface LogEntry { id: string; at: number; text: string; }

const PATIENT_ADDRESS = "Flat 402, Sunrise Apartments, MG Road, Bengaluru — 560001";

const Emergency = () => {
  const { latest } = useVitalsCtx();
  const risk = latest?.risk ?? 0;
  const isCritical = !!latest && (latest.fall || risk > 85);
  const isCaution = !isCritical && risk >= 70 && risk <= 85;

  const [steps, setSteps] = useState<Step[]>([
    { key: "doctor", label: "Doctor Alerted", status: "pending", at: null },
    { key: "family", label: "Family Notified", status: "pending", at: null },
    { key: "ambulance", label: "Ambulance Dispatched", status: "pending", at: null },
  ]);
  const [log, setLog] = useState<LogEntry[]>([]);
  const timersRef = useRef<{ family?: ReturnType<typeof setTimeout>; ambulance?: ReturnType<typeof setTimeout> }>({});

  const [doctorOpen, setDoctorOpen] = useState(false);
  const [familyOpen, setFamilyOpen] = useState(false);
  const [callOpen, setCallOpen] = useState(false);

  const addLog = (text: string) =>
    setLog((l) => [{ id: crypto.randomUUID(), at: Date.now(), text }, ...l]);

  const triggerStep = (key: Step["key"], text: string) => {
    setSteps((prev) => {
      const idx = prev.findIndex((s) => s.key === key);
      if (idx === -1 || prev[idx].status !== "pending") return prev;
      const next = [...prev];
      next[idx] = { ...next[idx], status: "triggered", at: Date.now() };
      return next;
    });
    addLog(text);
    // Mark as done shortly after trigger animation
    setTimeout(() => {
      setSteps((prev) => prev.map((s) => (s.key === key && s.status === "triggered" ? { ...s, status: "done" } : s)));
    }, 4000);
  };

  // Auto-escalation when alert is active
  useEffect(() => {
    if (!latest) return;
    const alertActive = latest.alert || latest.fall || risk > 85;
    if (alertActive) {
      setSteps((prev) => {
        if (prev[0].status !== "pending") return prev;
        addLog("Step 1 triggered — Doctor alerted automatically");
        return prev.map((s, i) =>
          i === 0 ? { ...s, status: "triggered", at: Date.now() } : s,
        );
      });
      // Schedule family at +30s if still high
      if (!timersRef.current.family) {
        timersRef.current.family = setTimeout(() => {
          triggerStep("family", "Step 2 triggered — Family notified (30s elapsed)");
          // Then ambulance at +60s
          timersRef.current.ambulance = setTimeout(() => {
            triggerStep("ambulance", "Step 3 triggered — Ambulance dispatched (60s elapsed)");
          }, 60000);
        }, 30000);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latest?.alert, latest?.fall, risk]);

  // Mark step1 done after 4s once triggered
  useEffect(() => {
    const s = steps.find((x) => x.key === "doctor");
    if (s?.status === "triggered") {
      const t = setTimeout(() => {
        setSteps((prev) => prev.map((x) => (x.key === "doctor" && x.status === "triggered" ? { ...x, status: "done" } : x)));
      }, 4000);
      return () => clearTimeout(t);
    }
  }, [steps]);

  useEffect(() => () => {
    if (timersRef.current.family) clearTimeout(timersRef.current.family);
    if (timersRef.current.ambulance) clearTimeout(timersRef.current.ambulance);
  }, []);

  const bannerClass = isCritical
    ? "gradient-critical text-critical-foreground animate-pulse-ring"
    : isCaution
    ? "gradient-caution text-caution-foreground"
    : "gradient-safe text-safe-foreground";

  const bannerLabel = isCritical
    ? "CRITICAL — Immediate Action Required"
    : isCaution
    ? "ELEVATED — Monitor Closely"
    : "STABLE — All Systems Normal";

  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-background">
      <div className="container py-8 space-y-6">
        <header>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Emergency Control</p>
          <h1 className="text-3xl font-semibold tracking-tight">VitalGlove — Response Center</h1>
        </header>

        {/* Status banner */}
        <section className={cn("rounded-2xl px-8 py-8 shadow-card flex flex-wrap items-center justify-between gap-6", bannerClass)}>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] opacity-90">Patient Status</p>
            <h2 className="text-4xl font-bold mt-1">{bannerLabel}</h2>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-widest opacity-90">Risk Score</p>
            <p className="text-6xl font-bold font-mono-tabular leading-none">{risk}</p>
          </div>
        </section>

        {/* Vitals snapshot */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Heart Rate", value: latest?.hr ?? "—", unit: "BPM", icon: Heart },
            { label: "SpO₂", value: latest?.spo2 ?? "—", unit: "%", icon: Droplets },
            { label: "Temperature", value: latest?.temp.toFixed(1) ?? "—", unit: "°C", icon: Thermometer },
            { label: "G-Force", value: latest?.gforce.toFixed(2) ?? "—", unit: "G", icon: Zap },
          ].map((c) => (
            <div key={c.label} className="rounded-xl border border-border bg-panel p-6 shadow-card">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="text-xs uppercase tracking-widest">{c.label}</span>
                <c.icon className="h-5 w-5" />
              </div>
              <p className="mt-3 text-5xl font-bold font-mono-tabular">{c.value}<span className="text-base font-normal text-muted-foreground ml-1">{c.unit}</span></p>
            </div>
          ))}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Escalation timeline */}
          <section className="lg:col-span-2 rounded-xl border border-border bg-panel p-6 shadow-card">
            <h2 className="font-semibold text-lg mb-6">Escalation Timeline</h2>
            <ol className="relative space-y-6 before:absolute before:left-4 before:top-2 before:bottom-2 before:w-px before:bg-border">
              {steps.map((s, i) => {
                const Icon = s.status === "done" ? CheckCircle2 : s.status === "triggered" ? Clock : Circle;
                return (
                  <li key={s.key} className="relative flex items-start gap-4 pl-0">
                    <span
                      className={cn(
                        "relative z-10 grid h-8 w-8 place-items-center rounded-full border-2",
                        s.status === "pending" && "bg-panel border-border text-muted-foreground",
                        s.status === "triggered" && "bg-caution border-caution text-caution-foreground animate-pulse",
                        s.status === "done" && "bg-safe border-safe text-safe-foreground",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="flex-1">
                      <p className="font-medium">Step {i + 1}: {s.label}</p>
                      <p className="text-sm text-muted-foreground">
                        Status: <span className={cn(
                          "font-semibold",
                          s.status === "pending" && "text-muted-foreground",
                          s.status === "triggered" && "text-caution",
                          s.status === "done" && "text-safe",
                        )}>{s.status.toUpperCase()}</span>
                        {s.at && <span className="ml-2 font-mono-tabular">· {new Date(s.at).toLocaleTimeString()}</span>}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
            <p className="mt-6 text-xs text-muted-foreground">
              Auto-escalation activates when alert conditions are detected. Steps 2 and 3 trigger 30s and 90s after the initial alert.
            </p>
          </section>

          {/* Patient location */}
          <section className="rounded-xl border border-border bg-panel p-6 shadow-card">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="h-4 w-4 text-primary" />
              <h2 className="font-semibold">Patient Location</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-3">{PATIENT_ADDRESS}</p>
            <div className="relative h-44 rounded-lg overflow-hidden border border-border bg-panel-elevated">
              <div className="absolute inset-0 opacity-40"
                style={{
                  backgroundImage:
                    "linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)",
                  backgroundSize: "24px 24px",
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative">
                  <span className="absolute inset-0 rounded-full bg-critical/40 animate-ping" />
                  <MapPin className="relative h-10 w-10 text-critical drop-shadow" fill="currentColor" />
                </div>
              </div>
              <div className="absolute bottom-2 left-2 text-[10px] uppercase tracking-wider text-muted-foreground">12.9716°N · 77.5946°E</div>
            </div>
          </section>
        </div>

        {/* Manual override */}
        <section className="rounded-xl border border-border bg-panel p-6 shadow-card">
          <h2 className="font-semibold text-lg mb-4">Manual Override</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Button size="lg" variant="secondary" onClick={() => setDoctorOpen(true)}>
              <Stethoscope className="h-4 w-4 mr-2" /> Alert Doctor Now
            </Button>
            <Button size="lg" variant="secondary" onClick={() => setFamilyOpen(true)}>
              <Users className="h-4 w-4 mr-2" /> Notify Family Now
            </Button>
            <Button size="lg" variant="destructive" onClick={() => setCallOpen(true)}>
              <Phone className="h-4 w-4 mr-2" /> Call 108 Now
            </Button>
          </div>
        </section>

        {/* Incident log */}
        <section className="rounded-xl border border-border bg-panel p-6 shadow-card">
          <h2 className="font-semibold text-lg mb-3">Incident Log</h2>
          {log.length === 0 ? (
            <p className="text-sm text-muted-foreground">No incidents recorded this session.</p>
          ) : (
            <ul className="divide-y divide-border">
              {log.map((e) => (
                <li key={e.id} className="py-2 flex items-start gap-3 animate-fade-in">
                  <span className="font-mono-tabular text-xs text-muted-foreground shrink-0 mt-0.5">
                    {new Date(e.at).toLocaleTimeString()}
                  </span>
                  <span className="text-sm">{e.text}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <Dialog open={doctorOpen} onOpenChange={setDoctorOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alert Doctor?</DialogTitle>
            <DialogDescription>Dr. Mehta will be paged immediately with the patient's current vitals.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDoctorOpen(false)}>Cancel</Button>
            <Button onClick={() => { addLog("Manual override — Doctor alerted"); setDoctorOpen(false); }}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={familyOpen} onOpenChange={setFamilyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Notify Family?</DialogTitle>
            <DialogDescription>SMS + call will be sent to registered emergency contacts.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setFamilyOpen(false)}>Cancel</Button>
            <Button onClick={() => { addLog("Manual override — Family notified"); setFamilyOpen(false); }}>Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={callOpen} onOpenChange={setCallOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-critical">Call Emergency Services (108)</DialogTitle>
            <DialogDescription>Confirm to dial. Patient vitals will be relayed.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-md bg-panel-elevated px-3 py-2 border border-border"><p className="text-xs text-muted-foreground">HR</p><p className="font-mono-tabular text-lg">{latest?.hr ?? "—"} BPM</p></div>
            <div className="rounded-md bg-panel-elevated px-3 py-2 border border-border"><p className="text-xs text-muted-foreground">SpO₂</p><p className="font-mono-tabular text-lg">{latest?.spo2 ?? "—"}%</p></div>
            <div className="rounded-md bg-panel-elevated px-3 py-2 border border-border"><p className="text-xs text-muted-foreground">Temp</p><p className="font-mono-tabular text-lg">{latest?.temp.toFixed(1) ?? "—"}°C</p></div>
            <div className="rounded-md bg-panel-elevated px-3 py-2 border border-border"><p className="text-xs text-muted-foreground">G-Force</p><p className="font-mono-tabular text-lg">{latest?.gforce.toFixed(2) ?? "—"} G</p></div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Location: {PATIENT_ADDRESS}</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCallOpen(false)}>Cancel</Button>
            <Button asChild variant="destructive" onClick={() => { addLog("Manual override — 108 dialed"); }}>
              <a href="tel:108">Dial 108</a>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default Emergency;
