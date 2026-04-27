import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarPlus, CalendarClock, MapPin, StickyNote, Trash2, Check, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFamilyHealth } from "@/hooks/useFamilyHealth";
import { appointmentsStore, type Appointment } from "@/lib/familyHealth";
import { toast } from "sonner";
import { format, isAfter, isBefore } from "date-fns";

const empty = (memberId: string): Appointment => ({
  id: crypto.randomUUID(),
  memberId,
  doctor: "",
  speciality: "",
  location: "",
  datetime: new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 16),
  notes: "",
  status: "scheduled",
  createdAt: Date.now(),
});

export default function Appointments() {
  const { email, members, appointments, refresh } = useFamilyHealth();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Appointment>(empty(""));
  const [date, setDate] = useState<Date | undefined>(new Date());

  const sorted = useMemo(
    () => [...appointments].sort((a, b) => +new Date(a.datetime) - +new Date(b.datetime)),
    [appointments],
  );
  
  const now = new Date();
  
  // Create an array of dates that have appointments for the calendar indicators
  const appointmentDates = useMemo(() => 
    appointments.map(a => new Date(a.datetime)), 
  [appointments]);

  const selectedDateAppointments = sorted.filter(a => {
    if (!date) return true;
    const aDate = new Date(a.datetime);
    return aDate.getDate() === date.getDate() && 
           aDate.getMonth() === date.getMonth() && 
           aDate.getFullYear() === date.getFullYear();
  });

  const onAdd = () => {
    setDraft(empty(members[0]?.id || ""));
    setOpen(true);
  };

  const save = () => {
    if (!draft.memberId) { toast.error("Pick a member"); return; }
    if (!draft.doctor.trim()) { toast.error("Doctor name required"); return; }
    if (!draft.datetime) { toast.error("Pick date & time"); return; }
    appointmentsStore.upsert(email, {
      ...draft,
      doctor: draft.doctor.trim(),
      speciality: draft.speciality?.trim(),
      location: draft.location?.trim(),
      notes: draft.notes?.trim(),
    });
    refresh();
    setOpen(false);
    toast.success("Appointment saved");
  };

  const setStatus = (a: Appointment, status: Appointment["status"]) => {
    appointmentsStore.upsert(email, { ...a, status });
    refresh();
  };
  const remove = (a: Appointment) => {
    appointmentsStore.remove(email, a.id);
    refresh();
  };

  const memberName = (id: string) => members.find((m) => m.id === id)?.name ?? "—";

  const renderCard = (a: Appointment) => {
    const dt = new Date(a.datetime);
    return (
      <motion.div
        key={a.id}
        layout
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{ duration: 0.2 }}
      >
        <Card className="p-4 bg-panel border-border/60 shadow-card">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-medium truncate">Dr. {a.doctor}</h3>
                {a.speciality && <Badge variant="secondary">{a.speciality}</Badge>}
                <Badge
                  className={
                    a.status === "scheduled" ? "bg-primary/15 text-primary border-0"
                    : a.status === "completed" ? "bg-safe/15 text-safe border-0"
                    : "bg-critical/15 text-critical border-0"
                  }
                >
                  {a.status}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">For {memberName(a.memberId)}</p>
              <div className="text-xs text-muted-foreground mt-2 flex flex-wrap gap-x-4 gap-y-1">
                <span className="inline-flex items-center gap-1.5"><CalendarClock className="h-3.5 w-3.5" /> {format(dt, "PPp")}</span>
                {a.location && <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {a.location}</span>}
              </div>
              {a.notes && (
                <p className="text-xs text-muted-foreground mt-2 inline-flex items-start gap-1.5">
                  <StickyNote className="h-3.5 w-3.5 mt-0.5" /> {a.notes}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              {a.status === "scheduled" && (
                <>
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setStatus(a, "completed")}>
                    <Check className="h-3.5 w-3.5" /> Done
                  </Button>
                  <Button size="sm" variant="ghost" className="gap-1.5 text-muted-foreground" onClick={() => setStatus(a, "cancelled")}>
                    <X className="h-3.5 w-3.5" /> Cancel
                  </Button>
                </>
              )}
              <Button size="sm" variant="ghost" className="gap-1.5 text-critical hover:text-critical" onClick={() => remove(a)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>
    );
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="container py-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" /> Appointments
          </h1>
          <p className="text-sm text-muted-foreground">Schedule and track doctor visits for the family.</p>
        </div>
        <Button onClick={onAdd} className="gap-2"><CalendarPlus className="h-4 w-4" /> New</Button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <Card className="p-4 bg-panel border-border/60 flex justify-center">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="rounded-md"
              modifiers={{ hasAppointment: appointmentDates }}
              modifiersStyles={{ hasAppointment: { fontWeight: 'bold', textDecoration: 'underline', color: 'var(--primary)' } }}
            />
          </Card>
        </div>

        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b pb-2 mb-4">
            <h2 className="text-lg font-medium">
              {date ? format(date, "EEEE, MMMM d, yyyy") : "All Appointments"}
            </h2>
            {date && (
              <Button variant="ghost" size="sm" onClick={() => setDate(undefined)}>
                Clear selection
              </Button>
            )}
          </div>
          
          <div className="space-y-3">
            {selectedDateAppointments.length === 0 ? (
              <Card className="p-8 text-center bg-panel border-border/60 text-sm text-muted-foreground">
                Nothing scheduled for this date. Hit “New” to add an appointment.
              </Card>
            ) : (
              <AnimatePresence>{selectedDateAppointments.map(renderCard)}</AnimatePresence>
            )}
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New appointment</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label>Member</Label>
              <Select value={draft.memberId} onValueChange={(v) => setDraft({ ...draft, memberId: v })}>
                <SelectTrigger><SelectValue placeholder="Pick a member" /></SelectTrigger>
                <SelectContent>
                  {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Doctor</Label>
                <Input value={draft.doctor} onChange={(e) => setDraft({ ...draft, doctor: e.target.value })} placeholder="Dr. Sharma" />
              </div>
              <div className="grid gap-1.5">
                <Label>Speciality</Label>
                <Input value={draft.speciality || ""} onChange={(e) => setDraft({ ...draft, speciality: e.target.value })} placeholder="Cardiology" />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Date & time</Label>
              <Input type="datetime-local" value={draft.datetime} onChange={(e) => setDraft({ ...draft, datetime: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label>Location</Label>
              <Input value={draft.location || ""} onChange={(e) => setDraft({ ...draft, location: e.target.value })} placeholder="Apollo Clinic, MG Road" />
            </div>
            <div className="grid gap-1.5">
              <Label>Notes</Label>
              <Textarea rows={2} value={draft.notes || ""} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Carry ECG report" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
