import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pill, Plus, Trash2, Power } from "lucide-react";
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
import { useFamilyHealth } from "@/hooks/useFamilyHealth";
import { medicationsStore, type Medication } from "@/lib/familyHealth";
import { toast } from "sonner";

const empty = (memberId: string): Medication => ({
  id: crypto.randomUUID(),
  memberId,
  name: "",
  dosage: "",
  frequency: "1-0-1",
  startDate: new Date().toISOString().slice(0, 10),
  endDate: "",
  notes: "",
  active: true,
  createdAt: Date.now(),
});

export default function Medications() {
  const { email, members, medications, refresh } = useFamilyHealth();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Medication>(empty(""));
  const [filterMember, setFilterMember] = useState<string>("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () => medications
      .filter((m) => filterMember === "all" || m.memberId === filterMember)
      .filter((m) => m.name.toLowerCase().includes(search.toLowerCase()) || (m.notes?.toLowerCase().includes(search.toLowerCase())))
      .sort((a, b) => Number(b.active) - Number(a.active) || b.createdAt - a.createdAt),
    [medications, filterMember, search],
  );

  const onAdd = () => { setDraft(empty(members[0]?.id || "")); setOpen(true); };

  const save = () => {
    if (!draft.memberId) { toast.error("Pick a member"); return; }
    if (!draft.name.trim()) { toast.error("Name required"); return; }
    medicationsStore.upsert(email, {
      ...draft,
      name: draft.name.trim(),
      dosage: draft.dosage.trim(),
      frequency: draft.frequency.trim(),
      notes: draft.notes?.trim(),
    });
    refresh();
    setOpen(false);
    toast.success("Medication saved");
  };

  const toggle = (m: Medication) => {
    medicationsStore.upsert(email, { ...m, active: !m.active });
    refresh();
  };
  const remove = (m: Medication) => {
    medicationsStore.remove(email, m.id);
    refresh();
  };

  const memberName = (id: string) => members.find((mm) => mm.id === id)?.name ?? "—";

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="container py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Pill className="h-5 w-5 text-primary" /> Medications
          </h1>
          <p className="text-sm text-muted-foreground">Track ongoing medicines for each family member.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filterMember} onValueChange={setFilterMember}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All members</SelectItem>
              {members.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="relative w-48">
            <Input 
              placeholder="Search meds..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-background"
            />
          </div>
          <Button onClick={onAdd} className="gap-2"><Plus className="h-4 w-4" /> Add</Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-10 text-center bg-panel border-border/60 text-sm text-muted-foreground">
          No medications added yet.
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filtered.map((m) => (
              <motion.div key={m.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97 }} transition={{ duration: 0.2 }}>
                <Card className={`p-4 border-border/60 shadow-card h-full flex flex-col ${m.active ? "bg-panel" : "bg-panel/50 opacity-70"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-medium truncate">{m.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{memberName(m.memberId)}</p>
                    </div>
                    <Badge className={m.active ? "bg-safe/15 text-safe border-0" : "bg-muted text-muted-foreground border-0"}>
                      {m.active ? "Active" : "Stopped"}
                    </Badge>
                  </div>
                  <dl className="mt-3 space-y-1 text-xs">
                    <div className="flex justify-between"><dt className="text-muted-foreground">Dosage</dt><dd className="font-mono-tabular">{m.dosage || "—"}</dd></div>
                    <div className="flex justify-between"><dt className="text-muted-foreground">Schedule</dt><dd className="font-mono-tabular">{m.frequency}</dd></div>
                    {m.startDate && <div className="flex justify-between"><dt className="text-muted-foreground">Start</dt><dd className="font-mono-tabular">{m.startDate}</dd></div>}
                    {m.endDate && <div className="flex justify-between"><dt className="text-muted-foreground">End</dt><dd className="font-mono-tabular">{m.endDate}</dd></div>}
                  </dl>
                  {m.notes && <p className="text-xs text-muted-foreground mt-3 line-clamp-3">{m.notes}</p>}
                  <div className="mt-auto pt-4 flex items-center gap-1">
                    <Button size="sm" variant="outline" onClick={() => toggle(m)} className="gap-1.5">
                      <Power className="h-3.5 w-3.5" /> {m.active ? "Stop" : "Resume"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(m)} className="ml-auto text-critical hover:text-critical">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New medication</DialogTitle></DialogHeader>
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
                <Label>Name</Label>
                <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Atorvastatin" />
              </div>
              <div className="grid gap-1.5">
                <Label>Dosage</Label>
                <Input value={draft.dosage} onChange={(e) => setDraft({ ...draft, dosage: e.target.value })} placeholder="10 mg" />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Schedule</Label>
              <Input value={draft.frequency} onChange={(e) => setDraft({ ...draft, frequency: e.target.value })} placeholder="1-0-1 (morning-noon-night)" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Start date</Label>
                <Input type="date" value={draft.startDate || ""} onChange={(e) => setDraft({ ...draft, startDate: e.target.value })} />
              </div>
              <div className="grid gap-1.5">
                <Label>End date</Label>
                <Input type="date" value={draft.endDate || ""} onChange={(e) => setDraft({ ...draft, endDate: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Notes</Label>
              <Textarea rows={2} value={draft.notes || ""} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="After food" />
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
