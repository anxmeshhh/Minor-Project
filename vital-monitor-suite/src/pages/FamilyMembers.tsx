import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Pencil, Trash2, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useFamilyHealth } from "@/hooks/useFamilyHealth";
import { membersStore, type FamilyMember, type Relation } from "@/lib/familyHealth";
import { toast } from "sonner";

const RELATIONS: Relation[] = ["self", "spouse", "child", "parent", "sibling", "other"];

const empty = (): FamilyMember => ({
  id: crypto.randomUUID(),
  name: "",
  relation: "child",
  createdAt: Date.now(),
});

export default function FamilyMembers() {
  const { email, members, refresh } = useFamilyHealth();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<FamilyMember>(empty());
  const [editing, setEditing] = useState(false);

  const onAdd = () => { setDraft(empty()); setEditing(false); setOpen(true); };
  const onEdit = (m: FamilyMember) => { setDraft({ ...m }); setEditing(true); setOpen(true); };

  const save = () => {
    if (!draft.name.trim()) { toast.error("Name is required"); return; }
    membersStore.upsert(email, { ...draft, name: draft.name.trim() });
    refresh();
    setOpen(false);
    toast.success(editing ? "Member updated" : "Member added");
  };

  const remove = (m: FamilyMember) => {
    if (m.relation === "self") { toast.error("Can't remove your own profile"); return; }
    membersStore.remove(email, m.id);
    refresh();
    toast.success("Member removed");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="container py-8 max-w-5xl"
    >
      <div className="flex items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" /> Family Members
          </h1>
          <p className="text-sm text-muted-foreground">Profiles for everyone you care for.</p>
        </div>
        <Button onClick={onAdd} className="gap-2"><Plus className="h-4 w-4" />Add member</Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {members.map((m) => (
            <motion.div
              key={m.id}
              layout
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="p-5 bg-panel border-border/60 shadow-card h-full flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/15 text-primary font-semibold">
                    {m.name.slice(0, 1).toUpperCase()}
                  </div>
                  <Badge variant="secondary" className="capitalize">{m.relation}</Badge>
                </div>
                <h3 className="mt-3 font-medium">{m.name}</h3>
                <dl className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {m.dob && <div>DOB: <span className="text-foreground font-mono-tabular">{m.dob}</span></div>}
                  {m.bloodGroup && <div>Blood: <span className="text-foreground">{m.bloodGroup}</span></div>}
                  {m.allergies && <div>Allergies: <span className="text-foreground">{m.allergies}</span></div>}
                  {m.conditions && <div>Conditions: <span className="text-foreground">{m.conditions}</span></div>}
                </dl>
                <div className="mt-auto pt-4 flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => onEdit(m)} className="gap-1.5">
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Button>
                  {m.relation !== "self" && (
                    <Button size="sm" variant="ghost" onClick={() => remove(m)} className="gap-1.5 text-critical hover:text-critical">
                      <Trash2 className="h-3.5 w-3.5" /> Remove
                    </Button>
                  )}
                </div>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit member" : "Add member"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="m-name">Name</Label>
              <Input id="m-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label>Relation</Label>
              <Select
                value={draft.relation}
                onValueChange={(v) => setDraft({ ...draft, relation: v as Relation })}
                disabled={editing && draft.relation === "self"}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RELATIONS.map((r) => (
                    <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="m-dob">Date of birth</Label>
                <Input id="m-dob" type="date" value={draft.dob || ""} onChange={(e) => setDraft({ ...draft, dob: e.target.value })} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="m-blood">Blood group</Label>
                <Input id="m-blood" placeholder="O+" value={draft.bloodGroup || ""} onChange={(e) => setDraft({ ...draft, bloodGroup: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="m-allergies">Allergies</Label>
              <Input id="m-allergies" placeholder="e.g. Penicillin" value={draft.allergies || ""} onChange={(e) => setDraft({ ...draft, allergies: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="m-cond">Chronic conditions</Label>
              <Textarea id="m-cond" rows={2} placeholder="e.g. Hypertension" value={draft.conditions || ""} onChange={(e) => setDraft({ ...draft, conditions: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>{editing ? "Save" : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
