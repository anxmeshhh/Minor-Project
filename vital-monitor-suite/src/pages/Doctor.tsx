import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Heart, Droplets, Thermometer, Zap, AlertOctagon, PhoneCall, Siren, ArrowLeft } from "lucide-react";
import { useVitalsCtx } from "@/context/VitalsContext";
import { getAlertReasons, getRiskLabel, getRiskLevel, type AlertReason, type VitalsReading } from "@/types/vitals";
import { VitalCard } from "@/components/VitalCard";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface FeedAlert extends AlertReason { id: string; at: number; }

const Doctor = () => {
  const { id } = useParams();
  const { latest, history } = useVitalsCtx();
  const [feed, setFeed] = useState<FeedAlert[]>([]);
  const [notes, setNotes] = useState("");
  const [savedNotes, setSavedNotes] = useState<{ id: string; at: string; text: string }[]>([]);
  const [callOpen, setCallOpen] = useState(false);
  const [dispatchOpen, setDispatchOpen] = useState(false);
  const lastTsRef = useRef<number>(0);

  // Append new alerts to the feed when a fresh reading arrives
  useEffect(() => {
    if (!latest || latest.timestamp === lastTsRef.current) return;
    lastTsRef.current = latest.timestamp;
    const reasons = getAlertReasons(latest);
    if (reasons.length > 0) {
      setFeed((prev) => [
        ...reasons.map((r) => ({ ...r, id: crypto.randomUUID(), at: latest.timestamp })),
        ...prev,
      ].slice(0, 50));
    }
  }, [latest]);

  const risk = latest?.risk ?? 0;
  const lvl = getRiskLevel(risk);
  const showEmergency = !!latest && (latest.fall || risk > 85);

  const last20 = useMemo(() => [...history].slice(-20).reverse(), [history]);

  const saveNote = () => {
    if (!notes.trim()) return;
    setSavedNotes((s) => [{ id: crypto.randomUUID(), at: new Date().toLocaleString(), text: notes.trim() }, ...s]);
    setNotes("");
  };

  return (
    <main className="theme-clinical min-h-[calc(100vh-3.5rem)] bg-background text-foreground">
      <div className="container py-8 space-y-6">
        <header>
          <Link to="/doctor" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary mb-4 transition-colors">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Fleet
          </Link>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Clinician Dashboard</p>
          <h1 className="text-3xl font-semibold tracking-tight text-primary">Patient Details</h1>
        </header>

        {/* Patient summary */}
        <section className="rounded-xl border border-border bg-card p-5 shadow-card flex flex-wrap items-center justify-between gap-6">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Patient</p>
            <p className="text-2xl font-semibold">Demo Patient</p>
            <p className="text-sm text-muted-foreground">ID {id || "#VG-0001"} · Age 64 · Male</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Risk</span>
            <span
              className={cn(
                "px-3 py-1.5 rounded-md text-sm font-bold",
                lvl === "safe" && "bg-safe text-safe-foreground",
                lvl === "caution" && "bg-caution text-caution-foreground",
                lvl === "critical" && "bg-critical text-critical-foreground",
              )}
            >
              {risk} · {getRiskLabel(risk)}
            </span>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Last Updated</p>
            <p className="font-mono-tabular text-sm">{latest ? new Date(latest.timestamp).toLocaleTimeString() : "—"}</p>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Monitoring panel */}
          <div className="lg:col-span-2 space-y-6">
            <section className="grid grid-cols-2 gap-4">
              <VitalCard label="Heart Rate" unit="BPM" icon={<Heart className="h-5 w-5" />}
                value={latest?.hr ?? "—"} alert={!!latest && (latest.hr < 50 || latest.hr > 120)} />
              <VitalCard label="SpO₂" unit="%" icon={<Droplets className="h-5 w-5" />}
                value={latest?.spo2 ?? "—"} alert={!!latest && latest.spo2 < 94} />
              <VitalCard label="Temperature" unit="°C" icon={<Thermometer className="h-5 w-5" />}
                value={latest?.temp.toFixed(1) ?? "—"} alert={!!latest && (latest.temp < 15 || latest.temp > 50)} />
              <VitalCard label="G-Force" unit="G" icon={<Zap className="h-5 w-5" />}
                value={latest?.gforce.toFixed(2) ?? "—"} alert={!!latest && latest.fall} />
            </section>

            {/* History table */}
            <section className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <h2 className="font-semibold">Vitals History</h2>
                <span className="text-xs text-muted-foreground">Last 20 readings</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
                    <tr>
                      <th className="text-left px-4 py-2">Time</th>
                      <th className="text-right px-4 py-2">HR</th>
                      <th className="text-right px-4 py-2">SpO₂</th>
                      <th className="text-right px-4 py-2">Temp</th>
                      <th className="text-center px-4 py-2">Fall</th>
                      <th className="text-right px-4 py-2">Risk</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono-tabular">
                    {last20.length === 0 && (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No data yet</td></tr>
                    )}
                    {last20.map((r: VitalsReading, i) => (
                      <tr
                        key={`${r.timestamp}-${i}`}
                        className={cn(
                          "border-t border-border",
                          r.alert && "bg-critical/10",
                        )}
                      >
                        <td className="px-4 py-2">{new Date(r.timestamp).toLocaleTimeString()}</td>
                        <td className="px-4 py-2 text-right">{r.hr}</td>
                        <td className="px-4 py-2 text-right">{r.spo2}</td>
                        <td className="px-4 py-2 text-right">{r.temp.toFixed(1)}</td>
                        <td className="px-4 py-2 text-center">{r.fall ? <span className="text-critical font-bold">YES</span> : "—"}</td>
                        <td className="px-4 py-2 text-right font-semibold">{r.risk}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Notes */}
            <section className="rounded-xl border border-border bg-card p-5 shadow-card">
              <h2 className="font-semibold mb-3">Clinician Notes</h2>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add observations, prescriptions, follow-ups…" rows={3} />
              <div className="mt-2 flex justify-end">
                <Button onClick={saveNote}>Save Note</Button>
              </div>
              <ul className="mt-4 space-y-2 max-h-48 overflow-auto">
                {savedNotes.map((n) => (
                  <li key={n.id} className="rounded-md border border-border bg-panel-elevated px-3 py-2">
                    <p className="text-xs text-muted-foreground">{n.at}</p>
                    <p className="text-sm whitespace-pre-wrap">{n.text}</p>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {/* Right column: Live alert feed */}
          <aside className="space-y-6">
            <section className="rounded-xl border border-border bg-card shadow-card">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <h2 className="font-semibold">Live Alert Feed</h2>
                <span className="text-xs text-muted-foreground">{feed.length} events</span>
              </div>
              <ul className="max-h-[480px] overflow-auto divide-y divide-border">
                {feed.length === 0 && (
                  <li className="px-5 py-8 text-center text-sm text-muted-foreground">No alerts</li>
                )}
                {feed.map((a) => (
                  <li key={a.id} className="px-5 py-3 flex items-start gap-3 animate-fade-in">
                    <span
                      className={cn(
                        "mt-0.5 inline-block h-2 w-2 rounded-full shrink-0",
                        a.severity === "critical" ? "bg-critical" : "bg-caution",
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium truncate">{a.type}</p>
                        <span className={cn(
                          "text-[10px] uppercase font-bold px-1.5 py-0.5 rounded",
                          a.severity === "critical" ? "bg-critical text-critical-foreground" : "bg-caution text-caution-foreground",
                        )}>{a.severity}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{a.detail}</p>
                      <p className="text-[11px] text-muted-foreground font-mono-tabular">
                        {new Date(a.at).toLocaleTimeString()}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            {showEmergency && (
              <section className="rounded-xl border-2 border-critical bg-critical/5 p-5 shadow-card animate-fade-in">
                <div className="flex items-center gap-2 text-critical mb-2">
                  <AlertOctagon className="h-5 w-5" />
                  <h3 className="font-bold uppercase tracking-wide">Critical Condition Detected</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Risk score {risk}/100{latest?.fall ? " · Fall detected" : ""}. Immediate action required.
                </p>
                <div className="flex flex-col gap-2">
                  <Button variant="destructive" onClick={() => setCallOpen(true)}>
                    <PhoneCall className="h-4 w-4 mr-2" /> Call Patient
                  </Button>
                  <Button variant="destructive" onClick={() => setDispatchOpen(true)}>
                    <Siren className="h-4 w-4 mr-2" /> Dispatch Emergency
                  </Button>
                </div>
              </section>
            )}
          </aside>
        </div>
      </div>

      <Dialog open={callOpen} onOpenChange={setCallOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Calling Demo Patient</DialogTitle>
            <DialogDescription>Connecting via secure VoIP… (demo)</DialogDescription>
          </DialogHeader>
          <DialogFooter><Button onClick={() => setCallOpen(false)}>End</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dispatchOpen} onOpenChange={setDispatchOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-critical">Confirm Emergency Dispatch</DialogTitle>
            <DialogDescription>An ambulance will be dispatched to the patient's location.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-md bg-muted px-3 py-2"><p className="text-xs text-muted-foreground">HR</p><p className="font-mono-tabular text-lg">{latest?.hr ?? "—"} BPM</p></div>
            <div className="rounded-md bg-muted px-3 py-2"><p className="text-xs text-muted-foreground">SpO₂</p><p className="font-mono-tabular text-lg">{latest?.spo2 ?? "—"}%</p></div>
            <div className="rounded-md bg-muted px-3 py-2"><p className="text-xs text-muted-foreground">Temp</p><p className="font-mono-tabular text-lg">{latest?.temp.toFixed(1) ?? "—"}°C</p></div>
            <div className="rounded-md bg-muted px-3 py-2"><p className="text-xs text-muted-foreground">G-Force</p><p className="font-mono-tabular text-lg">{latest?.gforce.toFixed(2) ?? "—"} G</p></div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDispatchOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => setDispatchOpen(false)}>Confirm Dispatch</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default Doctor;
