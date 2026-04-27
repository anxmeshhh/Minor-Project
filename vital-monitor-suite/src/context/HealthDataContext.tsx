import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

const BASE = "http://localhost:5001";

/* ═══════════════════════ TYPES ═══════════════════════ */
export interface HealthEntry {
  id: number;
  text: string;
  added_by: string;
  created_at: string;
  category?: string;
  member_id?: number;
}

export interface Checkup {
  id: number;
  member_id: number;
  title: string;
  date: string;
  report_notes?: string;
  status: "upcoming" | "done" | "cancelled";
  created_at?: string;
}

export interface PatientProfile {
  id?: number;
  member_id: number;
  age?: number;
  gender?: string;
  blood_group?: string;
  height_cm?: number;
  weight_kg?: number;
  allergies?: string;
  emergency_contact?: string;
  updated_at?: string;
}

export interface MlResult {
  id: number;
  member_id: number;
  prediction: string;
  confidence: number;
  risk_score: number;
  input_summary: string;
  model_version: string;
  created_at: string;
}

export interface AiResult {
  id: number;
  member_id: number;
  advice: string;
  urgency: string;
  timeline: string;
  doctor_suggestion: string;
  ml_result_id?: number;
  input_sources: string;
  model: string;
  created_at: string;
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

export interface FamilyMember {
  id: number;
  name: string;
  relation: string;
  role: "admin" | "member";
  group_id?: number;
  patient_id?: number;
  symptoms: HealthEntry[];
  medications: HealthEntry[];
  medicalHistory: HealthEntry[];
  prescriptions: HealthEntry[];
  doctorNotes: HealthEntry[];
  checkups: Checkup[];
  profile?: PatientProfile;
  mlResults: MlResult[];
  aiResults: AiResult[];
  lastAiScan?: AiScanResult;
}

export interface DoctorRequest {
  id: number;
  member_id: number;
  member_name: string;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
  ai_summary?: string;
  ai_urgency?: string;
  ml_class?: string;
  risk_score?: number;
  doctor_specialty?: string;
  doctor_name?: string;
  doctor_notes?: string;
  prescription?: string;
  urgent_appointment?: string;
  responded_at?: string;
}

export interface Notification {
  id: number;
  type: "alert" | "doctor_response" | "ai_scan" | "member_update" | "appointment";
  title: string;
  message: string;
  created_at: string;
  is_read: boolean;
  member_id?: number;
}

export interface FamilyGroup {
  id: number;
  name: string;
  members: FamilyMember[];
}

/* ═══════════════════════ CONTEXT ═══════════════════════ */
interface HealthDataCtx {
  family: FamilyGroup;
  notifications: Notification[];
  doctorRequests: DoctorRequest[];
  loading: boolean;
  reload: () => void;
  getSelf: () => FamilyMember;
  getMember: (id: number) => FamilyMember | undefined;
  addEntry: (memberId: number, category: string, text: string, addedBy?: string) => Promise<void>;
  deleteEntry: (entryId: number) => Promise<void>;
  addMember: (name: string, relation: string) => Promise<void>;
  deleteMember: (id: number) => Promise<void>;
  addCheckup: (memberId: number, title: string, date: string) => Promise<void>;
  deleteCheckup: (checkupId: number) => Promise<void>;
  updateProfile: (memberId: number, data: Partial<PatientProfile>) => Promise<void>;
  updateAiScan: (memberId: number, scan: AiScanResult) => void;
  getAllForAi: (memberId: number) => {
    symptoms: string[]; medications: string[]; medicalHistory: string[];
    prescriptions: string[]; doctorNotes: string[]; familyHealth: string[];
  };
  createDoctorRequest: (memberId: number, aiScan?: AiScanResult) => Promise<void>;
  respondToRequest: (reqId: number, response: { doctorName: string; notes: string; prescription?: string; urgentAppointment?: string }) => Promise<void>;
  markRead: (id: number) => Promise<void>;
  unreadCount: number;
}

const Ctx = createContext<HealthDataCtx | null>(null);

/* ═══════════════════════ API HELPERS ═══════════════════════ */
async function api<T>(url: string, opts?: RequestInit): Promise<T> {
  const r = await fetch(url, opts);
  return r.json();
}

/* ═══════════════════════ PROVIDER ═══════════════════════ */
export function HealthDataProvider({ children }: { children: ReactNode }) {
  const [family, setFamily] = useState<FamilyGroup>({ id: 1, name: "Loading...", members: [] });
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [doctorRequests, setDoctorRequests] = useState<DoctorRequest[]>([]);
  const [loading, setLoading] = useState(true);

  /* ── Load all data from DB ── */
  const reload = useCallback(async () => {
    try {
      // 1. Family + members
      const famData = await api<{ family: any; members: any[] }>(`${BASE}/api/family`);
      const members: FamilyMember[] = [];

      // 2. For each member, fetch ALL their data
      for (const m of famData.members) {
        const [health, checkups, profile, mlResults, aiResults] = await Promise.all([
          api<Record<string, HealthEntry[]>>(`${BASE}/api/health/${m.id}`),
          api<Checkup[]>(`${BASE}/api/checkups/${m.id}`),
          api<PatientProfile>(`${BASE}/api/profile/${m.id}`),
          api<MlResult[]>(`${BASE}/api/ml-results/${m.id}`),
          api<AiResult[]>(`${BASE}/api/ai-results/${m.id}`),
        ]);
        members.push({
          id: m.id,
          name: m.name,
          relation: m.relation,
          role: m.role,
          group_id: m.group_id,
          patient_id: m.patient_id,
          symptoms: health.symptoms || [],
          medications: health.medications || [],
          medicalHistory: health.medical_history || [],
          prescriptions: health.prescriptions || [],
          doctorNotes: health.doctor_notes || [],
          checkups: checkups || [],
          profile: profile?.id ? profile : undefined,
          mlResults: mlResults || [],
          aiResults: aiResults || [],
        });
      }

      setFamily({
        id: famData.family?.id || 1,
        name: famData.family?.name || "Family Hub",
        members,
      });

      // 3. Doctor requests
      const reqs = await api<DoctorRequest[]>(`${BASE}/api/doctor-requests`);
      setDoctorRequests(reqs);

      // 4. Notifications
      const notifs = await api<Notification[]>(`${BASE}/api/notifications`);
      setNotifications(notifs);

    } catch (e) {
      console.error("[HealthData] Failed to load from DB, using empty state", e);
    }
    setLoading(false);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  /* ── Getters ── */
  const getSelf = () => family.members.find(m => m.relation === "self") || family.members[0] || {
    id: 0, name: "—", relation: "self", role: "admin" as const,
    symptoms: [], medications: [], medicalHistory: [], prescriptions: [], doctorNotes: [],
    checkups: [], mlResults: [], aiResults: [],
  };

  const getMember = (id: number) => family.members.find(m => m.id === id);

  /* ── CRUD: Health Entries ── */
  const addEntry = async (memberId: number, category: string, text: string, addedBy = "Self") => {
    const catMap: Record<string, string> = {
      medicalHistory: "medical_history",
      doctorNotes: "doctor_notes",
      medical_history: "medical_history",
      doctor_notes: "doctor_notes",
    };
    const dbCat = catMap[category] || category;

    await api(`${BASE}/api/health/${memberId}/${dbCat}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, added_by: addedBy }),
    });
    await reload();
  };

  const deleteEntry = async (entryId: number) => {
    await api(`${BASE}/api/health/entry/${entryId}`, { method: "DELETE" });
    await reload();
  };

  /* ── CRUD: Family Members ── */
  const addMember = async (name: string, relation: string) => {
    await api(`${BASE}/api/family/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ group_id: family.id, name, relation, role: "member" }),
    });
    await reload();
  };

  const deleteMember = async (id: number) => {
    await api(`${BASE}/api/family/members/${id}`, { method: "DELETE" });
    await reload();
  };

  /* ── CRUD: Checkups ── */
  const addCheckup = async (memberId: number, title: string, date: string) => {
    await api(`${BASE}/api/checkups/${memberId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, date }),
    });
    await reload();
  };

  const deleteCheckup = async (checkupId: number) => {
    await api(`${BASE}/api/checkups/${checkupId}`, { method: "DELETE" });
    await reload();
  };

  /* ── CRUD: Patient Profile ── */
  const updateProfile = async (memberId: number, data: Partial<PatientProfile>) => {
    await api(`${BASE}/api/profile/${memberId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    await reload();
  };

  /* ── AI Scan (local state + DB) ── */
  const updateAiScan = (memberId: number, scan: AiScanResult) => {
    setFamily(f => ({
      ...f,
      members: f.members.map(m => m.id === memberId ? { ...m, lastAiScan: scan } : m),
    }));
  };

  /* ── Aggregate for AI pipeline ── */
  const getAllForAi = (memberId: number) => {
    const m = family.members.find(x => x.id === memberId);
    if (!m) return { symptoms: [], medications: [], medicalHistory: [], prescriptions: [], doctorNotes: [], familyHealth: [] };
    return {
      symptoms: m.symptoms.map(s => s.text),
      medications: m.medications.map(s => s.text),
      medicalHistory: m.medicalHistory.map(s => s.text),
      prescriptions: m.prescriptions.map(s => s.text),
      doctorNotes: m.doctorNotes.map(s => `[${s.added_by}, ${s.created_at}] ${s.text}`),
      familyHealth: family.members.filter(x => x.id !== memberId).map(x =>
        `${x.name} (${x.relation}): ${x.medicalHistory.map(h => h.text).join(", ") || "Healthy"}`
      ),
    };
  };

  /* ── Doctor Request Flow (DB-backed) ── */
  const createDoctorRequest = async (memberId: number, aiScan?: AiScanResult) => {
    const member = getMember(memberId);
    if (!member) return;
    await api(`${BASE}/api/doctor-requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        member_id: memberId,
        member_name: member.name,
        ai_summary: aiScan?.summary,
        ai_urgency: aiScan?.urgency,
        ml_class: aiScan?.mlClass,
        risk_score: aiScan?.riskScore,
        doctor_specialty: aiScan?.specialty,
      }),
    });
    await reload();
  };

  const respondToRequest = async (reqId: number, response: { doctorName: string; notes: string; prescription?: string; urgentAppointment?: string }) => {
    await api(`${BASE}/api/doctor-requests/${reqId}/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        doctor_name: response.doctorName,
        notes: response.notes,
        prescription: response.prescription,
        urgent_appointment: response.urgentAppointment,
      }),
    });
    await reload();
  };

  /* ── Notifications (DB-backed) ── */
  const markRead = async (id: number) => {
    await api(`${BASE}/api/notifications/${id}/read`, { method: "POST" });
    setNotifications(ns => ns.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <Ctx.Provider value={{
      family, notifications, doctorRequests, loading, reload,
      getSelf, getMember, addEntry, deleteEntry, addMember, deleteMember,
      addCheckup, deleteCheckup, updateProfile,
      updateAiScan, getAllForAi,
      createDoctorRequest, respondToRequest, markRead, unreadCount,
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
