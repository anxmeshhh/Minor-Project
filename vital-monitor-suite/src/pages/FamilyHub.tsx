import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Users, Plus, Brain, Sparkles, Shield, Pill, ClipboardList, FileText,
  Heart, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Send, Pencil, Bell, Calendar, Clock
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useHealthData, type FamilyMember, type HealthEntry } from "@/context/HealthDataContext";
import { toast } from "sonner";

const BASE = "http://localhost:5001";

const CATEGORY_META: Record<string, { icon: any; label: string; color: string; placeholder: string }> = {
  symptoms:       { icon: AlertTriangle, label: "Symptoms",       color: "text-red-400",    placeholder: "e.g. Chest tightness after walking..." },
  medications:    { icon: Pill,           label: "Medications",    color: "text-emerald-400", placeholder: "e.g. Metoprolol 50mg — 1 tab, morning..." },
  medicalHistory: { icon: ClipboardList,  label: "Medical History", color: "text-blue-400",   placeholder: "e.g. Hypertension diagnosed 2022..." },
  prescriptions:  { icon: FileText,       label: "Prescriptions",  color: "text-amber-400",  placeholder: "e.g. Atorvastatin 20mg — bedtime..." },
  doctorNotes:    { icon: Pencil,         label: "Doctor Notes",   color: "text-violet-400", placeholder: "e.g. BP 140/90, advised salt reduction..." },
};

export default function FamilyHub() {
  const { family, setFamilyName, addEntry, removeEntry, getAllForAi, updateAiScan, addMember, notifications, doctorRequests, createDoctorRequest, markRead, unreadCount } = useHealthData();
  const navigate = useNavigate();
  const [selectedMember, setSelectedMember] = useState("self");
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(family.name);
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [scanLoading, setScanLoading] = useState<string | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);

  // Add new member
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberRelation, setNewMemberRelation] = useState("");

  const member = family.members.find(m => m.id === selectedMember) || family.members[0];

  const handleAddEntry = (category: string) => {
    const text = inputValues[category]?.trim();
    if (!text) return;
    addEntry(selectedMember, category as any, {
      id: crypto.randomUUID(), text, addedBy: "Self", addedAt: new Date().toLocaleTimeString(),
    });
    setInputValues(v => ({ ...v, [category]: "" }));
    toast.success(`Added to ${CATEGORY_META[category].label}`);
  };

  const handleAddMember = () => {
    if (!newMemberName.trim() || !newMemberRelation.trim()) return;
    addMember({
      id: crypto.randomUUID(), name: newMemberName.trim(), relation: newMemberRelation.trim().toLowerCase(),
      role: "member", symptoms: [], medications: [], medicalHistory: [], prescriptions: [], doctorNotes: [],
    });
    toast.success(`${newMemberName} added to ${family.name}`);
    setNewMemberName(""); setNewMemberRelation(""); setShowAddMember(false);
  };

  // Run AI + ML scan for a member
  const runAiScan = useCallback(async (memberId: string) => {
    setScanLoading(memberId);
    const data = getAllForAi(memberId);
    try {
      const r = await fetch(`${BASE}/api/ai/analyze`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patient_id: 1,
          symptoms: data.symptoms, medications: data.medications,
          medical_history: data.medicalHistory, prescriptions: data.prescriptions,
          doctor_notes: data.doctorNotes, family_health: data.familyHealth,
          checkups: [],
        }),
      });
      const res = await r.json();
      updateAiScan(memberId, {
        urgency: res.urgency, summary: res.ai_analysis, ts: new Date().toLocaleTimeString(),
        mlClass: res.ml_class, riskScore: res.risk_score, specialty: res.doctor_specialty,
      });
      toast.success(`AI scan complete for ${family.members.find(m => m.id === memberId)?.name}`);
    } catch {
      toast.error("AI scan failed — is the server running?");
    }
    setScanLoading(null);
  }, [getAllForAi, updateAiScan, family.members]);

  const urgBadge: Record<string, string> = {
    safe: "bg-emerald-500/15 text-emerald-400 border-emerald-700/40",
    visit: "bg-amber-500/15 text-amber-400 border-amber-700/40",
    emergency: "bg-red-500/15 text-red-400 border-red-700/40 animate-pulse",
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="container py-8 max-w-6xl">
      {/* Family Group Header */}
      <header className="flex items-center justify-between mb-6">
        <div>
          {editingName ? (
            <div className="flex gap-2">
              <Input value={nameVal} onChange={e => setNameVal(e.target.value)} className="text-xl font-bold w-64" autoFocus
                onKeyDown={e => { if (e.key === "Enter") { setFamilyName(nameVal); setEditingName(false); }}} />
              <Button size="sm" onClick={() => { setFamilyName(nameVal); setEditingName(false); }}>Save</Button>
            </div>
          ) : (
            <h1 className="text-2xl font-bold tracking-tight cursor-pointer hover:text-primary transition-colors"
              onClick={() => setEditingName(true)}>
              {family.name} <Pencil className="inline h-4 w-4 text-muted-foreground ml-1" />
            </h1>
          )}
          <p className="text-sm text-muted-foreground mt-1">Central health hub — all family data feeds into AI + ML pipeline</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Button variant="outline" size="sm" onClick={() => setShowNotifications(!showNotifications)} className="relative">
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-critical text-[9px] text-white grid place-items-center animate-pulse">{unreadCount}</span>
              )}
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowAddMember(!showAddMember)}>
            <Plus className="h-4 w-4 mr-1" />Add Member
          </Button>
        </div>
      </header>

      {/* Notifications Panel */}
      {showNotifications && (
        <Card className="p-4 mb-4 border-blue-700/30 bg-blue-950/10 max-h-64 overflow-auto">
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <Bell className="h-4 w-4 text-blue-400" />Notifications & Alerts
          </h3>
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-2">No notifications</p>
          ) : (
            <div className="space-y-2">
              {notifications.slice(0, 8).map(n => (
                <div key={n.id} onClick={() => markRead(n.id)}
                  className={cn("rounded-lg px-3 py-2 border cursor-pointer transition-all",
                    n.read ? "border-border/40 bg-panel opacity-60" : "border-blue-700/40 bg-blue-900/10")}>
                  <div className="flex items-center gap-2">
                    {n.type === "doctor_response" && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />}
                    {n.type === "ai_scan" && <Brain className="h-3.5 w-3.5 text-violet-400 shrink-0" />}
                    {n.type === "alert" && <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />}
                    {n.type === "member_update" && <Users className="h-3.5 w-3.5 text-blue-400 shrink-0" />}
                    {n.type === "appointment" && <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />}
                    <p className="text-xs font-medium flex-1">{n.title}</p>
                    <span className="text-[10px] text-muted-foreground shrink-0">{n.ts}</span>
                    {!n.read && <span className="h-2 w-2 rounded-full bg-blue-400" />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 whitespace-pre-line">{n.message}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Doctor Requests Status */}
      {doctorRequests.length > 0 && (
        <div className="flex gap-2 mb-4 overflow-x-auto">
          {doctorRequests.slice(0, 3).map(r => (
            <Card key={r.id} className={cn("px-3 py-2 flex items-center gap-2 shrink-0 text-xs",
              r.status === "pending" ? "border-amber-700/40" : "border-emerald-700/40")}>
              {r.status === "pending" ? <Clock className="h-3.5 w-3.5 text-amber-400" /> : <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />}
              <span>{r.memberName}</span>
              <Badge variant={r.status === "pending" ? "secondary" : "default"} className="text-[9px] h-4 px-1.5">{r.status}</Badge>
              {r.doctorName && <span className="text-muted-foreground">by {r.doctorName}</span>}
            </Card>
          ))}
        </div>
      )}

      {showAddMember && (
        <Card className="p-4 mb-4 flex gap-3 items-end border-primary/30">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground">Name</label>
            <Input value={newMemberName} onChange={e => setNewMemberName(e.target.value)} placeholder="e.g. Amit Sharma" />
          </div>
          <div className="w-40">
            <label className="text-xs text-muted-foreground">Relation</label>
            <Input value={newMemberRelation} onChange={e => setNewMemberRelation(e.target.value)} placeholder="e.g. brother" />
          </div>
          <Button onClick={handleAddMember}>Add</Button>
        </Card>
      )}

      <div className="grid grid-cols-12 gap-6">
        {/* Left Sidebar: Member List (WhatsApp-style) */}
        <div className="col-span-12 lg:col-span-3 space-y-2">
          <p className="text-xs uppercase tracking-wider text-muted-foreground px-1 mb-2">Members</p>
          {family.members.map(m => (
            <button key={m.id} onClick={() => setSelectedMember(m.id)}
              className={cn("w-full flex items-center gap-3 rounded-xl px-3 py-3 border text-left transition-all",
                selectedMember === m.id ? "bg-primary/10 border-primary/40 shadow-sm" : "bg-panel border-border/60 hover:bg-panel-elevated")}>
              <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/15 text-primary font-semibold text-sm shrink-0">
                {m.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium truncate">{m.name}</p>
                  <Badge variant={m.role === "admin" ? "default" : "secondary"} className="text-[9px] px-1.5 py-0 h-4">{m.role}</Badge>
                </div>
                <p className="text-[11px] text-muted-foreground capitalize">{m.relation}</p>
              </div>
              {m.lastAiScan && (
                <span className={cn("text-[9px] px-1.5 py-0.5 rounded-full border shrink-0", urgBadge[m.lastAiScan.urgency] || urgBadge.safe)}>
                  {m.lastAiScan.urgency}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Right Panel: Selected Member Health Data */}
        <div className="col-span-12 lg:col-span-9 space-y-4">
          {/* Member Header + AI Scan */}
          <Card className="p-4 flex items-center justify-between border-border/60">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/15 text-primary text-lg font-bold">
                {member.name.charAt(0)}
              </div>
              <div>
                <h2 className="text-lg font-semibold">{member.name}</h2>
                <p className="text-xs text-muted-foreground capitalize">{member.relation} · {member.role === "admin" ? "Group Admin" : "Member"}
                  {" · "}{member.symptoms.length} symptoms · {member.medications.length} meds
                </p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" variant="outline" onClick={() => navigate("/discovery")} className="text-xs">
                <Shield className="h-3.5 w-3.5 mr-1"/>Find Doctor
              </Button>
              <Button size="sm" variant="outline" onClick={() => {
                createDoctorRequest(member.id, member.lastAiScan || undefined);
                toast.success(`Doctor request sent for ${member.name} with full health data`);
              }} className="text-xs border-emerald-700/40 text-emerald-400 hover:bg-emerald-900/20">
                <Send className="h-3.5 w-3.5 mr-1"/>Request Doctor
              </Button>
              <Button size="sm" onClick={() => runAiScan(member.id)} disabled={scanLoading === member.id}
                className="bg-gradient-to-r from-violet-600 to-blue-600 text-white text-xs">
                <Brain className="h-3.5 w-3.5 mr-1.5"/>
                {scanLoading === member.id ? "Scanning..." : "Run AI + ML Scan"}
              </Button>
            </div>
          </Card>

          {/* AI Scan Result */}
          {member.lastAiScan && (
            <Card className="p-4 border-blue-700/30 bg-blue-950/10">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-blue-400" />
                <h3 className="text-sm font-semibold">AI + ML Analysis Result</h3>
                <span className="text-[10px] text-muted-foreground">Scanned at {member.lastAiScan.ts}</span>
                <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium ml-auto",
                  urgBadge[member.lastAiScan.urgency] || urgBadge.safe)}>
                  {member.lastAiScan.urgency.toUpperCase()}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="rounded-lg bg-violet-900/20 border border-violet-700/30 p-2">
                  <p className="text-[10px] text-violet-300">ML Classification</p>
                  <p className="text-sm text-violet-100 capitalize font-medium">{member.lastAiScan.mlClass?.replace("_"," ")}</p>
                </div>
                <div className="rounded-lg bg-blue-900/20 border border-blue-700/30 p-2">
                  <p className="text-[10px] text-blue-300">Risk Score</p>
                  <p className="text-sm text-blue-100 font-medium">{member.lastAiScan.riskScore}/100</p>
                </div>
                {member.lastAiScan.specialty && (
                  <div className="rounded-lg bg-amber-900/20 border border-amber-700/30 p-2">
                    <p className="text-[10px] text-amber-300">Specialist Needed</p>
                    <p className="text-sm text-amber-100 font-medium">{member.lastAiScan.specialty}</p>
                  </div>
                )}
              </div>
              <p className="text-sm text-blue-100/80 leading-relaxed whitespace-pre-line">{member.lastAiScan.summary}</p>
            </Card>
          )}

          {/* Health Data Categories */}
          <Tabs defaultValue="symptoms" className="w-full">
            <TabsList className="grid grid-cols-5 w-full">
              {Object.entries(CATEGORY_META).map(([key, meta]) => {
                const Icon = meta.icon;
                const count = (member[key as keyof FamilyMember] as HealthEntry[])?.length || 0;
                return (
                  <TabsTrigger key={key} value={key} className="text-xs gap-1.5">
                    <Icon className={cn("h-3.5 w-3.5", meta.color)} />
                    {meta.label} {count > 0 && <Badge variant="secondary" className="text-[9px] h-4 px-1.5">{count}</Badge>}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {Object.entries(CATEGORY_META).map(([key, meta]) => {
              const entries = (member[key as keyof FamilyMember] as HealthEntry[]) || [];
              const Icon = meta.icon;
              return (
                <TabsContent key={key} value={key} className="mt-3">
                  {/* Input Row */}
                  <div className="flex gap-2 mb-3">
                    <div className="relative flex-1">
                      <Icon className={cn("absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4", meta.color)} />
                      <Input
                        value={inputValues[key] || ""}
                        onChange={e => setInputValues(v => ({ ...v, [key]: e.target.value }))}
                        placeholder={meta.placeholder}
                        className="pl-10"
                        onKeyDown={e => { if (e.key === "Enter") handleAddEntry(key); }}
                      />
                    </div>
                    <Button onClick={() => handleAddEntry(key)} size="sm" className="px-4">
                      <Send className="h-3.5 w-3.5 mr-1.5" />Add
                    </Button>
                  </div>

                  {/* Entries List */}
                  {entries.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">No {meta.label.toLowerCase()} recorded yet. Add one above.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-72 overflow-auto">
                      {entries.map(entry => (
                        <div key={entry.id} className="flex items-start justify-between gap-2 rounded-lg bg-panel-elevated px-3 py-2.5 border border-border/60 group">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm">{entry.text}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              Added by <span className="font-medium">{entry.addedBy}</span> · {entry.addedAt}
                            </p>
                          </div>
                          <button onClick={() => removeEntry(member.id, key, entry.id)}
                            className="text-muted-foreground hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity text-xs">✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              );
            })}
          </Tabs>
        </div>
      </div>
    </motion.div>
  );
}
