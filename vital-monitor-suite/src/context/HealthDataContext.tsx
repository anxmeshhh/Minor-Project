import { createContext, useContext, useState, type ReactNode } from "react";

/* ═══════════════════════ TYPES ═══════════════════════ */
export interface HealthEntry {
  id: string;
  text: string;
  addedBy: string;
  addedAt: string;
}

export interface FamilyMember {
  id: string;
  name: string;
  relation: string;
  role: "admin" | "member";
  symptoms: HealthEntry[];
  medications: HealthEntry[];
  medicalHistory: HealthEntry[];
  prescriptions: HealthEntry[];
  doctorNotes: HealthEntry[];
  lastAiScan?: AiScanResult;
}

export interface AiScanResult {
  urgency: string;
  summary: string;
  ts: string;
  mlClass: string;
  riskScore: number;
  specialty?: string;
  actions?: string[];
  timeline?: string;
}

export interface DoctorRequest {
  id: string;
  memberId: string;
  memberName: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
  aiScan?: AiScanResult;
  // Doctor's response
  doctorName?: string;
  doctorNotes?: string;
  prescription?: string;
  urgentAppointment?: string;
  respondedAt?: string;
}

export interface Notification {
  id: string;
  type: "alert" | "doctor_response" | "ai_scan" | "member_update" | "appointment";
  title: string;
  message: string;
  ts: string;
  read: boolean;
  memberId?: string;
}

export interface FamilyGroup {
  name: string;
  members: FamilyMember[];
}

/* ═══════════════════════ SEED DATA ═══════════════════════ */
const SEED_MEMBERS: FamilyMember[] = [
  {
    id: "self", name: "Riya Sharma", relation: "self", role: "admin",
    symptoms: [
      { id: "s1", text: "Mild chest tightness after walking", addedBy: "Self", addedAt: "10:30 AM" },
      { id: "s2", text: "Slight dizziness on standing", addedBy: "Self", addedAt: "Yesterday" },
    ],
    medications: [
      { id: "m1", text: "Metoprolol 50mg — 1 tablet, 8:00 AM", addedBy: "Dr. Mehra", addedAt: "Apr 15" },
      { id: "m2", text: "Aspirin 75mg — 1 tablet, 1:00 PM", addedBy: "Dr. Mehra", addedAt: "Apr 15" },
      { id: "m3", text: "Atorvastatin 20mg — 1 tablet, 9:00 PM", addedBy: "Dr. Mehra", addedAt: "Mar 28" },
      { id: "m4", text: "Vitamin D3 60K — weekly", addedBy: "Self", addedAt: "Jan 10" },
    ],
    medicalHistory: [
      { id: "h1", text: "Hypertension (diagnosed 2022)", addedBy: "Dr. Mehra", addedAt: "2022" },
      { id: "h2", text: "Type-2 Diabetes (managed with diet)", addedBy: "Dr. Gupta", addedAt: "2021" },
      { id: "h3", text: "Previous MI (2024) — stent placed", addedBy: "Dr. Mehra", addedAt: "2024" },
    ],
    prescriptions: [
      { id: "p1", text: "Metoprolol 50mg — morning, empty stomach", addedBy: "Dr. Mehra", addedAt: "Apr 15" },
      { id: "p2", text: "Aspirin 75mg — after lunch", addedBy: "Dr. Mehra", addedAt: "Apr 15" },
      { id: "p3", text: "Atorvastatin 20mg — bedtime", addedBy: "Dr. Mehra", addedAt: "Mar 28" },
    ],
    doctorNotes: [
      { id: "d1", text: "BP 140/90 — advised salt reduction and daily walking", addedBy: "Dr. Mehra", addedAt: "Apr 15, 2026" },
      { id: "d2", text: "Lipid panel elevated — started Atorvastatin 20mg", addedBy: "Dr. Mehra", addedAt: "Mar 28, 2026" },
      { id: "d3", text: "Post-MI follow-up: stable, continue current regimen", addedBy: "Dr. Mehra", addedAt: "Feb 10, 2026" },
    ],
  },
  {
    id: "spouse", name: "Priya Sharma", relation: "spouse", role: "member",
    symptoms: [],
    medications: [{ id: "m5", text: "Calcium + D3 supplement — daily", addedBy: "Self", addedAt: "Mar 1" }],
    medicalHistory: [{ id: "h4", text: "No significant conditions", addedBy: "Self", addedAt: "2026" }],
    prescriptions: [],
    doctorNotes: [{ id: "d4", text: "Routine checkup — all normal", addedBy: "Dr. Singh", addedAt: "Apr 20, 2026" }],
  },
  {
    id: "son", name: "Raj Sharma", relation: "son", role: "member",
    symptoms: [{ id: "s3", text: "Occasional wheezing during exercise", addedBy: "Priya Sharma", addedAt: "Apr 22" }],
    medications: [{ id: "m6", text: "Salbutamol inhaler — as needed", addedBy: "Dr. Patel", addedAt: "2023" }],
    medicalHistory: [{ id: "h5", text: "Childhood asthma (managed)", addedBy: "Dr. Patel", addedAt: "2020" }],
    prescriptions: [{ id: "p4", text: "Montelukast 5mg — bedtime during season change", addedBy: "Dr. Patel", addedAt: "Apr 1" }],
    doctorNotes: [],
  },
];

const SEED_NOTIFICATIONS: Notification[] = [
  { id: "n1", type: "ai_scan", title: "Routine AI Scan Complete", message: "Riya Sharma: Tachycardia detected (82% confidence). Risk score 62/100. Cardiologist visit recommended.", ts: "Today, 9:00 AM", read: false, memberId: "self" },
  { id: "n2", type: "member_update", title: "Family Update", message: "Priya Sharma added: 'He had chest pain after climbing stairs' to Riya's symptoms.", ts: "Today, 8:45 AM", read: false, memberId: "self" },
  { id: "n3", type: "doctor_response", title: "Dr. Mehra Responded", message: "Accepted your consultation request. Notes: 'Increase Metoprolol to 100mg. Schedule ECG within 48 hours.'", ts: "Yesterday", read: true, memberId: "self" },
];

const SEED_REQUESTS: DoctorRequest[] = [
  {
    id: "req1", memberId: "self", memberName: "Riya Sharma", status: "accepted",
    createdAt: "Apr 25, 2026", doctorName: "Dr. Mehra",
    doctorNotes: "Increase Metoprolol to 100mg. Schedule ECG within 48 hours. Monitor HR closely.",
    prescription: "Metoprolol 100mg — morning\nAspirin 75mg — after lunch\nAtrovastatin 20mg — bedtime",
    urgentAppointment: "ECG Stress Test — Apr 30, 2026", respondedAt: "Apr 26, 2026",
    aiScan: { urgency: "visit", summary: "Tachycardia pattern detected", ts: "Apr 25", mlClass: "tachycardia", riskScore: 62, specialty: "Cardiologist" },
  },
];

/* ═══════════════════════ CONTEXT ═══════════════════════ */
interface HealthDataCtx {
  family: FamilyGroup;
  notifications: Notification[];
  doctorRequests: DoctorRequest[];
  setFamilyName: (n: string) => void;
  getSelf: () => FamilyMember;
  getMember: (id: string) => FamilyMember | undefined;
  addEntry: (memberId: string, category: keyof Pick<FamilyMember, "symptoms"|"medications"|"medicalHistory"|"prescriptions"|"doctorNotes">, entry: HealthEntry) => void;
  removeEntry: (memberId: string, category: string, entryId: string) => void;
  addMember: (m: FamilyMember) => void;
  updateAiScan: (memberId: string, scan: AiScanResult) => void;
  getAllForAi: (memberId: string) => {
    symptoms: string[]; medications: string[]; medicalHistory: string[];
    prescriptions: string[]; doctorNotes: string[]; familyHealth: string[];
  };
  // Doctor request flow
  createDoctorRequest: (memberId: string, aiScan?: AiScanResult) => void;
  respondToRequest: (reqId: string, response: { doctorName: string; notes: string; prescription?: string; urgentAppointment?: string }) => void;
  // Notifications
  addNotification: (n: Omit<Notification, "id" | "read">) => void;
  markRead: (id: string) => void;
  unreadCount: number;
}

const Ctx = createContext<HealthDataCtx | null>(null);

export function HealthDataProvider({ children }: { children: ReactNode }) {
  const [family, setFamily] = useState<FamilyGroup>({ name: "The Sharma Family", members: SEED_MEMBERS });
  const [notifications, setNotifications] = useState<Notification[]>(SEED_NOTIFICATIONS);
  const [doctorRequests, setDoctorRequests] = useState<DoctorRequest[]>(SEED_REQUESTS);

  const setFamilyName = (n: string) => setFamily(f => ({ ...f, name: n }));
  const getSelf = () => family.members.find(m => m.id === "self")!;
  const getMember = (id: string) => family.members.find(m => m.id === id);

  const addEntry = (memberId: string, category: any, entry: HealthEntry) => {
    setFamily(f => ({
      ...f,
      members: f.members.map(m => m.id === memberId ? { ...m, [category]: [entry, ...m[category as keyof FamilyMember] as HealthEntry[]] } : m),
    }));
  };

  const removeEntry = (memberId: string, category: string, entryId: string) => {
    setFamily(f => ({
      ...f,
      members: f.members.map(m => m.id === memberId ? { ...m, [category]: (m[category as keyof FamilyMember] as HealthEntry[]).filter(e => e.id !== entryId) } : m),
    }));
  };

  const addMember = (m: FamilyMember) => setFamily(f => ({ ...f, members: [...f.members, m] }));

  const updateAiScan = (memberId: string, scan: AiScanResult) => {
    setFamily(f => ({
      ...f,
      members: f.members.map(m => m.id === memberId ? { ...m, lastAiScan: scan } : m),
    }));
    // Auto-notify family
    const member = family.members.find(m => m.id === memberId);
    addNotification({
      type: "ai_scan",
      title: `AI Scan: ${member?.name || "Member"}`,
      message: `${scan.mlClass.replace("_"," ")} detected (Risk: ${scan.riskScore}/100). ${scan.urgency === "emergency" ? "⚠️ EMERGENCY" : scan.urgency === "visit" ? "Doctor visit recommended" : "All clear."}`,
      ts: new Date().toLocaleTimeString(), memberId,
    });
  };

  const getAllForAi = (memberId: string) => {
    const m = family.members.find(x => x.id === memberId);
    if (!m) return { symptoms: [], medications: [], medicalHistory: [], prescriptions: [], doctorNotes: [], familyHealth: [] };
    return {
      symptoms: m.symptoms.map(s => s.text),
      medications: m.medications.map(s => s.text),
      medicalHistory: m.medicalHistory.map(s => s.text),
      prescriptions: m.prescriptions.map(s => s.text),
      doctorNotes: m.doctorNotes.map(s => `[${s.addedBy}, ${s.addedAt}] ${s.text}`),
      familyHealth: family.members.filter(x => x.id !== memberId).map(x =>
        `${x.name} (${x.relation}): ${x.medicalHistory.map(h => h.text).join(", ") || "Healthy"}`
      ),
    };
  };

  /* ─── Step 10: Smart Doctor Request ─── */
  const createDoctorRequest = (memberId: string, aiScan?: AiScanResult) => {
    const member = family.members.find(m => m.id === memberId);
    if (!member) return;
    const req: DoctorRequest = {
      id: `req-${crypto.randomUUID().slice(0,6)}`,
      memberId, memberName: member.name,
      status: "pending", createdAt: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
      aiScan,
    };
    setDoctorRequests(r => [req, ...r]);
    addNotification({
      type: "alert", title: "Doctor Request Sent",
      message: `Consultation request for ${member.name} sent. Includes: ${member.symptoms.length} symptoms, ${member.medications.length} meds, ${member.medicalHistory.length} history items, AI scan data.`,
      ts: new Date().toLocaleTimeString(), memberId,
    });
  };

  /* ─── Step 11-12: Doctor Response → Flows back to patient + family ─── */
  const respondToRequest = (reqId: string, response: { doctorName: string; notes: string; prescription?: string; urgentAppointment?: string }) => {
    setDoctorRequests(reqs => reqs.map(r => {
      if (r.id !== reqId) return r;
      return { ...r, status: "accepted" as const, ...response, respondedAt: new Date().toLocaleTimeString() };
    }));
    const req = doctorRequests.find(r => r.id === reqId);
    if (!req) return;
    // Add doctor notes to patient's record
    if (response.notes) {
      addEntry(req.memberId, "doctorNotes", {
        id: crypto.randomUUID(), text: response.notes, addedBy: response.doctorName, addedAt: "Just now",
      });
    }
    // Add prescription to patient's record
    if (response.prescription) {
      response.prescription.split("\n").forEach(line => {
        if (line.trim()) addEntry(req.memberId, "prescriptions", {
          id: crypto.randomUUID(), text: line.trim(), addedBy: response.doctorName, addedAt: "Just now",
        });
      });
    }
    // Notify patient + entire family
    addNotification({
      type: "doctor_response", title: `${response.doctorName} Responded`,
      message: `${response.notes}${response.urgentAppointment ? `\n📅 Urgent: ${response.urgentAppointment}` : ""}`,
      ts: new Date().toLocaleTimeString(), memberId: req.memberId,
    });
  };

  /* ─── Notifications ─── */
  const addNotification = (n: Omit<Notification, "id" | "read">) => {
    setNotifications(ns => [{ ...n, id: crypto.randomUUID(), read: false }, ...ns]);
  };
  const markRead = (id: string) => setNotifications(ns => ns.map(n => n.id === id ? { ...n, read: true } : n));
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <Ctx.Provider value={{
      family, notifications, doctorRequests,
      setFamilyName, getSelf, getMember, addEntry, removeEntry, addMember, updateAiScan, getAllForAi,
      createDoctorRequest, respondToRequest, addNotification, markRead, unreadCount,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useHealthData() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useHealthData must be used within HealthDataProvider");
  return ctx;
}
