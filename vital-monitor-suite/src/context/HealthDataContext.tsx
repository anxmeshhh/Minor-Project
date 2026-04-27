import { createContext, useContext, useState, type ReactNode } from "react";

/* ─── Types ─── */
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
  lastAiScan?: { urgency: string; summary: string; ts: string; mlClass: string; riskScore: number; specialty?: string };
}

export interface FamilyGroup {
  name: string;
  members: FamilyMember[];
}

/* ─── Seed Data ─── */
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
    medications: [
      { id: "m5", text: "Calcium + D3 supplement — daily", addedBy: "Self", addedAt: "Mar 1" },
    ],
    medicalHistory: [
      { id: "h4", text: "No significant conditions", addedBy: "Self", addedAt: "2026" },
    ],
    prescriptions: [],
    doctorNotes: [
      { id: "d4", text: "Routine checkup — all normal", addedBy: "Dr. Singh", addedAt: "Apr 20, 2026" },
    ],
  },
  {
    id: "son", name: "Raj Sharma", relation: "son", role: "member",
    symptoms: [
      { id: "s3", text: "Occasional wheezing during exercise", addedBy: "Priya Sharma", addedAt: "Apr 22" },
    ],
    medications: [
      { id: "m6", text: "Salbutamol inhaler — as needed", addedBy: "Dr. Patel", addedAt: "2023" },
    ],
    medicalHistory: [
      { id: "h5", text: "Childhood asthma (managed)", addedBy: "Dr. Patel", addedAt: "2020" },
    ],
    prescriptions: [
      { id: "p4", text: "Montelukast 5mg — bedtime during season change", addedBy: "Dr. Patel", addedAt: "Apr 1" },
    ],
    doctorNotes: [],
  },
];

/* ─── Context ─── */
interface HealthDataCtx {
  family: FamilyGroup;
  setFamilyName: (n: string) => void;
  getSelf: () => FamilyMember;
  getMember: (id: string) => FamilyMember | undefined;
  addEntry: (memberId: string, category: keyof Pick<FamilyMember, "symptoms"|"medications"|"medicalHistory"|"prescriptions"|"doctorNotes">, entry: HealthEntry) => void;
  removeEntry: (memberId: string, category: string, entryId: string) => void;
  addMember: (m: FamilyMember) => void;
  updateAiScan: (memberId: string, scan: FamilyMember["lastAiScan"]) => void;
  getAllForAi: (memberId: string) => {
    symptoms: string[]; medications: string[]; medicalHistory: string[];
    prescriptions: string[]; doctorNotes: string[]; familyHealth: string[];
  };
}

const Ctx = createContext<HealthDataCtx | null>(null);

export function HealthDataProvider({ children }: { children: ReactNode }) {
  const [family, setFamily] = useState<FamilyGroup>({ name: "The Sharma Family", members: SEED_MEMBERS });

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

  const updateAiScan = (memberId: string, scan: FamilyMember["lastAiScan"]) => {
    setFamily(f => ({
      ...f,
      members: f.members.map(m => m.id === memberId ? { ...m, lastAiScan: scan } : m),
    }));
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

  return (
    <Ctx.Provider value={{ family, setFamilyName, getSelf, getMember, addEntry, removeEntry, addMember, updateAiScan, getAllForAi }}>
      {children}
    </Ctx.Provider>
  );
}

export function useHealthData() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useHealthData must be used within HealthDataProvider");
  return ctx;
}
