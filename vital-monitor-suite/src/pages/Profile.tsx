import { useState } from "react";
import { motion } from "framer-motion";
import {
  User, Pill, Calendar, FileText, ClipboardList, AlertTriangle,
  Heart, Plus, Trash2, Save, Send, CheckCircle2, Clock, Brain,
  Sparkles, Shield, Upload, Edit2, X
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useHealthData, type PatientProfile as ProfileType } from "@/context/HealthDataContext";
import { toast } from "sonner";

export default function Profile() {
  const {
    family, getSelf, addEntry, deleteEntry,
    addCheckup, deleteCheckup, updateProfile, loading
  } = useHealthData();

  const self = getSelf();

  // Profile edit state
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState<Partial<ProfileType>>({
    age: self.profile?.age || 0,
    gender: self.profile?.gender || "",
    blood_group: self.profile?.blood_group || "",
    height_cm: self.profile?.height_cm || 0,
    weight_kg: self.profile?.weight_kg || 0,
    allergies: self.profile?.allergies || "",
    emergency_contact: self.profile?.emergency_contact || "",
  });

  // Input states for each category
  const [medInput, setMedInput] = useState("");
  const [prescInput, setPrescInput] = useState("");
  const [historyInput, setHistoryInput] = useState("");
  const [checkTitle, setCheckTitle] = useState("");
  const [checkDate, setCheckDate] = useState("");
  const [docName, setDocName] = useState("");
  const [docDesc, setDocDesc] = useState("");

  const handleSaveProfile = async () => {
    await updateProfile(self.id, profileForm);
    setEditingProfile(false);
    toast.success("Profile updated in database");
  };

  const handleAddMed = async () => {
    if (!medInput.trim()) return;
    await addEntry(self.id, "medications", medInput.trim(), "Self");
    setMedInput("");
    toast.success("Medication added");
  };

  const handleAddPresc = async () => {
    if (!prescInput.trim()) return;
    await addEntry(self.id, "prescriptions", prescInput.trim(), "Self");
    setPrescInput("");
    toast.success("Prescription added");
  };

  const handleAddHistory = async () => {
    if (!historyInput.trim()) return;
    await addEntry(self.id, "medicalHistory", historyInput.trim(), "Self");
    setHistoryInput("");
    toast.success("Medical history added");
  };

  const handleAddCheckup = async () => {
    if (!checkTitle.trim() || !checkDate) return;
    await addCheckup(self.id, checkTitle.trim(), checkDate);
    setCheckTitle("");
    setCheckDate("");
    toast.success("Checkup scheduled");
  };

  const handleAddDoc = async () => {
    if (!docName.trim()) return;
    await addEntry(self.id, "prescriptions", `📄 ${docName.trim()}${docDesc ? ` — ${docDesc.trim()}` : ""}`, "Self");
    setDocName("");
    setDocDesc("");
    toast.success("Document record added");
  };

  if (loading) {
    return <div className="container py-20 text-center text-muted-foreground">Loading profile from database...</div>;
  }

  return (
    <motion.main
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-[calc(100vh-3.5rem)] bg-background"
    >
      <div className="container py-8 max-w-5xl space-y-6">
        {/* Header */}
        <header>
          <p className="text-sm uppercase tracking-widest text-muted-foreground">Patient Profile</p>
          <h1 className="text-3xl font-semibold tracking-tight">{self.name || "Your Profile"}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Main data intake — all entries are stored in MySQL and feed into AI + ML pipelines
          </p>
        </header>

        {/* Pipeline Indicator */}
        <div className="flex items-center gap-2 overflow-x-auto px-4 py-3 rounded-xl border border-blue-700/30 bg-blue-950/10">
          <Sparkles className="h-4 w-4 text-blue-400 shrink-0" />
          <span className="text-[10px] text-blue-300 font-medium shrink-0">DATA PIPELINE:</span>
          {["Profile Input", "→ Database", "→ ML Engine", "→ AI Engine", "→ Dashboard"].map((step, i) => (
            <span key={i} className={cn(
              "text-[10px] px-2 py-0.5 rounded border whitespace-nowrap",
              i === 0 ? "bg-emerald-900/30 border-emerald-700/30 text-emerald-300 font-semibold" :
              "bg-blue-900/20 border-blue-700/30 text-blue-300"
            )}>{step}</span>
          ))}
        </div>

        {/* Bio Card */}
        <Card className="p-5 border-border/60">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              <h2 className="font-semibold text-sm">Personal Information</h2>
              <Badge variant="secondary" className="text-[9px]">DB ID: {self.id}</Badge>
            </div>
            {editingProfile ? (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setEditingProfile(false)}>
                  <X className="h-3.5 w-3.5 mr-1" />Cancel
                </Button>
                <Button size="sm" onClick={handleSaveProfile}>
                  <Save className="h-3.5 w-3.5 mr-1" />Save
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="outline" onClick={() => {
                setProfileForm({
                  age: self.profile?.age || 0,
                  gender: self.profile?.gender || "",
                  blood_group: self.profile?.blood_group || "",
                  height_cm: self.profile?.height_cm || 0,
                  weight_kg: self.profile?.weight_kg || 0,
                  allergies: self.profile?.allergies || "",
                  emergency_contact: self.profile?.emergency_contact || "",
                });
                setEditingProfile(true);
              }}>
                <Edit2 className="h-3.5 w-3.5 mr-1" />Edit
              </Button>
            )}
          </div>

          {editingProfile ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Age</label>
                <Input type="number" value={profileForm.age || ""} onChange={e => setProfileForm(p => ({ ...p, age: parseInt(e.target.value) || 0 }))} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Gender</label>
                <Input value={profileForm.gender || ""} onChange={e => setProfileForm(p => ({ ...p, gender: e.target.value }))} placeholder="e.g. Female" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Blood Group</label>
                <Input value={profileForm.blood_group || ""} onChange={e => setProfileForm(p => ({ ...p, blood_group: e.target.value }))} placeholder="e.g. B+" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Height (cm)</label>
                <Input type="number" value={profileForm.height_cm || ""} onChange={e => setProfileForm(p => ({ ...p, height_cm: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Weight (kg)</label>
                <Input type="number" value={profileForm.weight_kg || ""} onChange={e => setProfileForm(p => ({ ...p, weight_kg: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Allergies</label>
                <Input value={profileForm.allergies || ""} onChange={e => setProfileForm(p => ({ ...p, allergies: e.target.value }))} placeholder="e.g. Penicillin" />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-muted-foreground">Emergency Contact</label>
                <Input value={profileForm.emergency_contact || ""} onChange={e => setProfileForm(p => ({ ...p, emergency_contact: e.target.value }))} placeholder="e.g. Priya Sharma: +91-..." />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { l: "Age", v: self.profile?.age ? `${self.profile.age} years` : "—" },
                { l: "Gender", v: self.profile?.gender || "—" },
                { l: "Blood Group", v: self.profile?.blood_group || "—" },
                { l: "Height", v: self.profile?.height_cm ? `${self.profile.height_cm} cm` : "—" },
                { l: "Weight", v: self.profile?.weight_kg ? `${self.profile.weight_kg} kg` : "—" },
                { l: "Allergies", v: self.profile?.allergies || "None" },
                { l: "Emergency Contact", v: self.profile?.emergency_contact || "—" },
                { l: "Family", v: family.name },
              ].map(item => (
                <div key={item.l} className="rounded-lg bg-panel-elevated px-3 py-2.5 border border-border/60">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{item.l}</p>
                  <p className="text-sm font-medium mt-0.5">{item.v}</p>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* CRUD Tabs */}
        <Tabs defaultValue="medications" className="w-full">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="medications" className="text-xs gap-1.5">
              <Pill className="h-3.5 w-3.5 text-emerald-400" />Medications
              <Badge variant="secondary" className="text-[9px] h-4 px-1.5">{self.medications.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="checkups" className="text-xs gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-blue-400" />Checkups
              <Badge variant="secondary" className="text-[9px] h-4 px-1.5">{self.checkups.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="prescriptions" className="text-xs gap-1.5">
              <FileText className="h-3.5 w-3.5 text-amber-400" />Prescriptions
              <Badge variant="secondary" className="text-[9px] h-4 px-1.5">{self.prescriptions.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs gap-1.5">
              <ClipboardList className="h-3.5 w-3.5 text-violet-400" />History
              <Badge variant="secondary" className="text-[9px] h-4 px-1.5">{self.medicalHistory.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="documents" className="text-xs gap-1.5">
              <Upload className="h-3.5 w-3.5 text-pink-400" />Documents
            </TabsTrigger>
          </TabsList>

          {/* Medications */}
          <TabsContent value="medications" className="mt-4">
            <Card className="p-5">
              <div className="flex gap-2 mb-4">
                <div className="relative flex-1">
                  <Pill className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-400" />
                  <Input value={medInput} onChange={e => setMedInput(e.target.value)}
                    placeholder="e.g. Metoprolol 50mg — 1 tablet, 8:00 AM" className="pl-10"
                    onKeyDown={e => { if (e.key === "Enter") handleAddMed(); }} />
                </div>
                <Button onClick={handleAddMed}><Plus className="h-3.5 w-3.5 mr-1" />Add</Button>
              </div>
              {self.medications.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No medications added yet. Add your first one above.</p>
              ) : (
                <div className="space-y-2 max-h-80 overflow-auto">
                  {self.medications.map(m => (
                    <div key={m.id} className="flex items-center justify-between gap-2 rounded-lg bg-panel-elevated px-4 py-3 border border-border/60 group">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{m.text.split("—")[0]?.trim()}</p>
                        <p className="text-xs text-muted-foreground">{m.text.split("—")[1]?.trim() || "As prescribed"} · by {m.added_by} · {m.created_at}</p>
                      </div>
                      <button onClick={() => { deleteEntry(m.id); toast.info("Medication deleted"); }}
                        className="text-muted-foreground hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Checkups */}
          <TabsContent value="checkups" className="mt-4">
            <Card className="p-5">
              <div className="flex gap-2 mb-4">
                <Input value={checkTitle} onChange={e => setCheckTitle(e.target.value)}
                  placeholder="Checkup title (e.g. Cardiology Follow-up)" className="flex-1" />
                <Input type="date" value={checkDate} onChange={e => setCheckDate(e.target.value)} className="w-44" />
                <Button onClick={handleAddCheckup}><Plus className="h-3.5 w-3.5 mr-1" />Add</Button>
              </div>
              {self.checkups.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No checkups scheduled. Add one above.</p>
              ) : (
                <div className="space-y-2 max-h-80 overflow-auto">
                  {self.checkups.map(c => (
                    <div key={c.id} className={cn(
                      "flex items-center gap-3 rounded-lg px-4 py-3 border group",
                      c.status === "done" ? "bg-emerald-900/10 border-emerald-700/30" : "bg-panel-elevated border-border/60"
                    )}>
                      {c.status === "done" ? <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" /> : <Clock className="h-4 w-4 text-amber-400 shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{c.title}</p>
                        <p className="text-xs text-muted-foreground">{c.date} · {c.status}</p>
                        {c.report_notes && <p className="text-xs text-emerald-300 mt-1">Report: {c.report_notes}</p>}
                      </div>
                      <button onClick={() => { deleteCheckup(c.id); toast.info("Checkup deleted"); }}
                        className="text-muted-foreground hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Prescriptions */}
          <TabsContent value="prescriptions" className="mt-4">
            <Card className="p-5">
              <div className="flex gap-2 mb-4">
                <div className="relative flex-1">
                  <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-400" />
                  <Input value={prescInput} onChange={e => setPrescInput(e.target.value)}
                    placeholder="e.g. Aspirin 75mg — after lunch" className="pl-10"
                    onKeyDown={e => { if (e.key === "Enter") handleAddPresc(); }} />
                </div>
                <Button onClick={handleAddPresc}><Plus className="h-3.5 w-3.5 mr-1" />Add</Button>
              </div>
              {self.prescriptions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No prescriptions recorded.</p>
              ) : (
                <div className="space-y-2 max-h-80 overflow-auto">
                  {self.prescriptions.map(p => (
                    <div key={p.id} className="flex items-center justify-between gap-2 rounded-lg bg-amber-900/10 px-4 py-3 border border-amber-700/30 group">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm">{p.text}</p>
                        <p className="text-[10px] text-muted-foreground">by {p.added_by} · {p.created_at}</p>
                      </div>
                      <button onClick={() => { deleteEntry(p.id); toast.info("Prescription deleted"); }}
                        className="text-muted-foreground hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Medical History */}
          <TabsContent value="history" className="mt-4">
            <Card className="p-5">
              <div className="flex gap-2 mb-4">
                <div className="relative flex-1">
                  <ClipboardList className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-violet-400" />
                  <Input value={historyInput} onChange={e => setHistoryInput(e.target.value)}
                    placeholder="e.g. Hypertension (diagnosed 2022)" className="pl-10"
                    onKeyDown={e => { if (e.key === "Enter") handleAddHistory(); }} />
                </div>
                <Button onClick={handleAddHistory}><Plus className="h-3.5 w-3.5 mr-1" />Add</Button>
              </div>
              {self.medicalHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No medical history recorded.</p>
              ) : (
                <div className="space-y-2 max-h-80 overflow-auto">
                  {self.medicalHistory.map(h => (
                    <div key={h.id} className="flex items-center justify-between gap-2 rounded-lg bg-panel-elevated px-4 py-3 border border-border/60 group">
                      <div className="flex items-start gap-2 min-w-0 flex-1">
                        <span className="h-2 w-2 rounded-full bg-violet-400 mt-1.5 shrink-0" />
                        <div>
                          <p className="text-sm">{h.text}</p>
                          <p className="text-[10px] text-muted-foreground">by {h.added_by} · {h.created_at}</p>
                        </div>
                      </div>
                      <button onClick={() => { deleteEntry(h.id); toast.info("History entry deleted"); }}
                        className="text-muted-foreground hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Documents */}
          <TabsContent value="documents" className="mt-4">
            <Card className="p-5">
              <div className="flex gap-2 mb-4">
                <Input value={docName} onChange={e => setDocName(e.target.value)}
                  placeholder="Document name (e.g. ECG Report April 2026)" className="flex-1" />
                <Input value={docDesc} onChange={e => setDocDesc(e.target.value)}
                  placeholder="Description (optional)" className="flex-1" />
                <Button onClick={handleAddDoc}><Upload className="h-3.5 w-3.5 mr-1" />Add</Button>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Documents are stored as metadata records. Physical files can be attached when the system is deployed.
              </p>
              {self.prescriptions.filter(p => p.text.startsWith("📄")).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No documents uploaded yet.</p>
              ) : (
                <div className="space-y-2 max-h-80 overflow-auto">
                  {self.prescriptions.filter(p => p.text.startsWith("📄")).map(d => (
                    <div key={d.id} className="flex items-center justify-between gap-2 rounded-lg bg-pink-900/10 px-4 py-3 border border-pink-700/30 group">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <FileText className="h-4 w-4 text-pink-400 shrink-0" />
                        <div>
                          <p className="text-sm">{d.text.replace("📄 ", "")}</p>
                          <p className="text-[10px] text-muted-foreground">{d.created_at}</p>
                        </div>
                      </div>
                      <button onClick={() => { deleteEntry(d.id); toast.info("Document record deleted"); }}
                        className="text-muted-foreground hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>

        {/* ML + AI Data Source Indicator */}
        <Card className="p-5 border-violet-700/30 bg-violet-950/10">
          <div className="flex items-center gap-2 mb-3">
            <Brain className="h-4 w-4 text-violet-400" />
            <h3 className="text-sm font-semibold">This Profile Feeds Into:</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-lg bg-violet-900/20 border border-violet-700/30 p-3 text-center">
              <Brain className="h-5 w-5 text-violet-400 mx-auto mb-1" />
              <p className="text-xs font-medium text-violet-200">ML Pipeline</p>
              <p className="text-[10px] text-violet-300/60">Pattern Detection</p>
              <p className="text-[10px] text-violet-300/60 mt-0.5">{self.mlResults.length} results</p>
            </div>
            <div className="rounded-lg bg-blue-900/20 border border-blue-700/30 p-3 text-center">
              <Sparkles className="h-5 w-5 text-blue-400 mx-auto mb-1" />
              <p className="text-xs font-medium text-blue-200">AI Pipeline</p>
              <p className="text-[10px] text-blue-300/60">Reasoning + Advice</p>
              <p className="text-[10px] text-blue-300/60 mt-0.5">{self.aiResults.length} results</p>
            </div>
            <div className="rounded-lg bg-emerald-900/20 border border-emerald-700/30 p-3 text-center">
              <Heart className="h-5 w-5 text-emerald-400 mx-auto mb-1" />
              <p className="text-xs font-medium text-emerald-200">Patient Dashboard</p>
              <p className="text-[10px] text-emerald-300/60">Live Combined View</p>
            </div>
            <div className="rounded-lg bg-amber-900/20 border border-amber-700/30 p-3 text-center">
              <Shield className="h-5 w-5 text-amber-400 mx-auto mb-1" />
              <p className="text-xs font-medium text-amber-200">Doctor System</p>
              <p className="text-[10px] text-amber-300/60">Analysis & Response</p>
            </div>
          </div>
        </Card>
      </div>
    </motion.main>
  );
}
