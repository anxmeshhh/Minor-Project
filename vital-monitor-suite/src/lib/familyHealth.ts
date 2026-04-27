// Family-health storage layer.
// - Structured data (members, appointments, medications, document metadata) → localStorage
// - File blobs (prescriptions, reports) → IndexedDB via idb-keyval (handles larger files)
// All data is scoped per logged-in user (key = `${userEmail}:${kind}`).

import { get as idbGet, set as idbSet, del as idbDel } from "idb-keyval";

export type Relation = "self" | "spouse" | "child" | "parent" | "sibling" | "other";
export type DocType = "prescription" | "report" | "scan" | "insurance" | "bill" | "other";
export type AppointmentStatus = "scheduled" | "completed" | "cancelled";

export interface FamilyMember {
  id: string;
  name: string;
  relation: Relation;
  dob?: string;            // ISO yyyy-mm-dd
  bloodGroup?: string;
  allergies?: string;
  conditions?: string;
  createdAt: number;
}

export interface DocumentRecord {
  id: string;
  memberId: string;
  type: DocType;
  title: string;
  fileName: string;
  mimeType: string;
  size: number;
  notes?: string;
  uploadedAt: number;
  /** Lookup key into IndexedDB blob store. */
  blobKey: string;
}

export interface Appointment {
  id: string;
  memberId: string;
  doctor: string;
  speciality?: string;
  location?: string;
  /** ISO datetime */
  datetime: string;
  notes?: string;
  status: AppointmentStatus;
  createdAt: number;
}

export interface Medication {
  id: string;
  memberId: string;
  name: string;
  dosage: string;
  frequency: string;          // e.g. "1-0-1", "Every 8h"
  startDate?: string;
  endDate?: string;
  notes?: string;
  active: boolean;
  createdAt: number;
}

type Kind = "members" | "documents" | "appointments" | "medications";

function key(email: string, kind: Kind) {
  return `vg.fh.${email.toLowerCase()}.${kind}`;
}

function read<T>(email: string, kind: Kind): T[] {
  try {
    const raw = localStorage.getItem(key(email, kind));
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function write<T>(email: string, kind: Kind, items: T[]) {
  localStorage.setItem(key(email, kind), JSON.stringify(items));
}

// ---- Members ----
export const membersStore = {
  list: (email: string) => read<FamilyMember>(email, "members"),
  save: (email: string, items: FamilyMember[]) => write(email, "members", items),
  upsert: (email: string, member: FamilyMember) => {
    const list = membersStore.list(email);
    const idx = list.findIndex((m) => m.id === member.id);
    if (idx >= 0) list[idx] = member;
    else list.push(member);
    membersStore.save(email, list);
    return list;
  },
  remove: (email: string, id: string) => {
    const list = membersStore.list(email).filter((m) => m.id !== id);
    membersStore.save(email, list);
    return list;
  },
};

// ---- Appointments ----
export const appointmentsStore = {
  list: (email: string) => read<Appointment>(email, "appointments"),
  save: (email: string, items: Appointment[]) => write(email, "appointments", items),
  upsert: (email: string, item: Appointment) => {
    const list = appointmentsStore.list(email);
    const idx = list.findIndex((a) => a.id === item.id);
    if (idx >= 0) list[idx] = item;
    else list.push(item);
    appointmentsStore.save(email, list);
    return list;
  },
  remove: (email: string, id: string) => {
    const list = appointmentsStore.list(email).filter((a) => a.id !== id);
    appointmentsStore.save(email, list);
    return list;
  },
};

// ---- Medications ----
export const medicationsStore = {
  list: (email: string) => read<Medication>(email, "medications"),
  save: (email: string, items: Medication[]) => write(email, "medications", items),
  upsert: (email: string, item: Medication) => {
    const list = medicationsStore.list(email);
    const idx = list.findIndex((m) => m.id === item.id);
    if (idx >= 0) list[idx] = item;
    else list.push(item);
    medicationsStore.save(email, list);
    return list;
  },
  remove: (email: string, id: string) => {
    const list = medicationsStore.list(email).filter((m) => m.id !== id);
    medicationsStore.save(email, list);
    return list;
  },
};

// ---- Documents (metadata in localStorage, blob in IndexedDB) ----
export const documentsStore = {
  list: (email: string) => read<DocumentRecord>(email, "documents"),
  saveAll: (email: string, items: DocumentRecord[]) => write(email, "documents", items),
  async add(email: string, file: File, meta: Omit<DocumentRecord, "id" | "blobKey" | "uploadedAt" | "fileName" | "mimeType" | "size">) {
    const id = crypto.randomUUID();
    const blobKey = `vg.fh.blob.${email.toLowerCase()}.${id}`;
    await idbSet(blobKey, file);
    const record: DocumentRecord = {
      ...meta,
      id,
      blobKey,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      uploadedAt: Date.now(),
    };
    const list = documentsStore.list(email);
    list.push(record);
    documentsStore.saveAll(email, list);
    return record;
  },
  async getBlob(record: DocumentRecord): Promise<Blob | undefined> {
    return await idbGet<Blob>(record.blobKey);
  },
  async remove(email: string, id: string) {
    const list = documentsStore.list(email);
    const target = list.find((d) => d.id === id);
    if (target) await idbDel(target.blobKey);
    documentsStore.saveAll(email, list.filter((d) => d.id !== id));
  },
};

// ---- Helpers ----
export function ensureSelfMember(email: string, name: string): FamilyMember {
  const existing = membersStore.list(email);
  if (existing.length > 0) return existing[0];
  const self: FamilyMember = {
    id: crypto.randomUUID(),
    name,
    relation: "self",
    createdAt: Date.now(),
  };
  membersStore.save(email, [self]);
  return self;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
