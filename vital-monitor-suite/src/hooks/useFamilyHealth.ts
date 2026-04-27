import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  appointmentsStore,
  documentsStore,
  ensureSelfMember,
  medicationsStore,
  membersStore,
  type Appointment,
  type DocumentRecord,
  type FamilyMember,
  type Medication,
} from "@/lib/familyHealth";

/**
 * Aggregated hook for family-health data scoped to the current user.
 * Re-reads from storage on every mutation by bumping a tick.
 */
export function useFamilyHealth() {
  const { user } = useAuth();
  const email = user?.email ?? "";
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);

  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);

  useEffect(() => {
    if (!email) {
      setMembers([]); setDocuments([]); setAppointments([]); setMedications([]);
      return;
    }
    // Seed a "self" member on first load so the user can start uploading immediately.
    ensureSelfMember(email, user?.name || "Me");
    setMembers(membersStore.list(email));
    setDocuments(documentsStore.list(email));
    setAppointments(appointmentsStore.list(email));
    setMedications(medicationsStore.list(email));
  }, [email, tick, user?.name]);

  return {
    email,
    members,
    documents,
    appointments,
    medications,
    refresh,
  };
}
