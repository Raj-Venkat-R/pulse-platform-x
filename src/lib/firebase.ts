import { initializeApp, getApps } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, Timestamp, onSnapshot, where, startAt, endAt, limit, doc, updateDoc, serverTimestamp } from "firebase/firestore";

// Read config from Vite env
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
};

// Initialize app once
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const db = getFirestore(app);

export type PatientDoc = {
  first_name: string;
  last_name: string;
  date_of_birth: string; // ISO date string
  gender: string;
  phone?: string;
  email?: string;
  address?: string;
  emergency_contact?: string;
  blood_group?: string;
  created_at: any;
};

export async function addPatientFirestore(data: Omit<PatientDoc, "created_at">) {
  const ref = collection(db, "patients");
  const docRef = await addDoc(ref, { ...data, created_at: Timestamp.now() });
  return docRef.id;
}

export async function listPatientsFirestore(): Promise<Array<any>> {
  const ref = collection(db, "patients");
  const q = query(ref, orderBy("created_at", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function searchPatientsFirestore(qstr: string): Promise<Array<any>> {
  // Simple approach: fetch latest N and filter on client
  const items = await listPatientsFirestore();
  const q = qstr.trim().toLowerCase();
  if (!q) return items;
  return items.filter((p) => {
    const name = `${p.first_name ?? ""} ${p.last_name ?? ""}`.toLowerCase();
    return (
      name.includes(q) ||
      String(p.phone ?? "").toLowerCase().includes(q) ||
      String(p.email ?? "").toLowerCase().includes(q)
    );
  });
}

// -------- Appointments --------
export type AppointmentDoc = {
  patient_id?: string;
  patient_name: string;
  department: string;
  doctor: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  reason?: string;
  status: "confirmed" | "pending" | "completed";
  created_at: any;
};

export async function addAppointmentFirestore(data: Omit<AppointmentDoc, "created_at">) {
  const ref = collection(db, "appointments");
  const docRef = await addDoc(ref, { ...data, created_at: Timestamp.now() });
  return docRef.id;
}

export async function listAppointmentsFirestore(): Promise<Array<any>> {
  const ref = collection(db, "appointments");
  const q = query(ref, orderBy("created_at", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// -------- Doctors (optional helper) --------
export async function listDoctorsFirestore(): Promise<Array<any>> {
  const ref = collection(db, "doctors");
  const snap = await getDocs(ref);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export type DoctorDoc = {
  name: string;
  specialty: string;
  available_slots?: Array<{ start_time: string; end_time: string; duration_minutes: number }>;
  created_at: any;
};

export async function addDoctorFirestore(data: Omit<DoctorDoc, "created_at">) {
  const ref = collection(db, "doctors");
  const docRef = await addDoc(ref, { ...data, created_at: Timestamp.now() });
  return docRef.id;
}

// -------- Queue (waiting room) --------
export type QueueEntryDoc = {
  doctor_id: number;
  doctor_name: string;
  doctor_specialty: string;
  token_number: string;
  patient_name: string;
  patient_phone?: string;
  current_status: 'waiting' | 'called' | 'in_consultation' | 'completed' | 'cancelled';
  priority_score?: number;
  queue_position?: number;
  estimated_wait_time_minutes?: number;
  check_in_time: string; // ISO string
  called_time?: string;
  consultation_start_time?: string;
  reason_for_visit?: string;
  urgency_level?: 'low' | 'medium' | 'high' | 'critical';
  special_requirements?: string;
  created_at: any;
};

export async function addQueueEntryFirestore(data: Omit<QueueEntryDoc, "created_at">) {
  const ref = collection(db, "queue_entries");
  const docRef = await addDoc(ref, { ...data, created_at: Timestamp.now() });
  return docRef.id;
}

export function subscribeQueueEntriesFirestore(
  cb: (entries: Array<{ id: string; [k: string]: any }>) => void
) {
  const ref = collection(db, "queue_entries");
  const q = query(ref, orderBy("created_at", "desc"));
  const unsub = onSnapshot(q, (snap) => {
    const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    cb(items);
  });
  return unsub;
}

// -------- Complaints --------
export type ComplaintDoc = {
  complaint_number: string;
  subject: string;
  description: string;
  category: string;
  urgency_level: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'pending_customer' | 'resolved' | 'closed' | 'cancelled';
  assigned_staff_id?: number | null;
  assigned_staff_name?: string | null;
  patient_name?: string;
  patient_phone?: string;
  created_at: any; // Timestamp
  sla_deadline?: string;
  sla_status?: 'on_track' | 'at_risk' | 'breached';
  escalation_level?: number;
  ai_confidence?: number;
  sentiment_score?: number;
  keywords?: string[];
  ai_insights?: any;
};

export async function addComplaintFirestore(data: Omit<ComplaintDoc, 'created_at'>) {
  const ref = collection(db, 'complaints');
  const docRef = await addDoc(ref, { ...data, created_at: Timestamp.now() });
  return docRef.id;
}

export function subscribeComplaintsFirestore(
  cb: (items: Array<{ id: string; [k: string]: any }>) => void
) {
  const ref = collection(db, 'complaints');
  const qy = query(ref, orderBy('created_at', 'desc'));
  return onSnapshot(qy, (snap) => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
}

// -------- E-Prescription helpers --------
export type PrescriptionMedicine = {
  drugId: string;
  drugName: string;
  dosage: string; // e.g., 500mg
  frequency: string; // OD/BD/TDS
  durationDays: number;
  instructions?: string;
  brand?: string;
};

export type PrescriptionDoc = {
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  date: any; // Timestamp
  diagnosis: string;
  medicines: PrescriptionMedicine[];
  status: 'draft' | 'prescribed' | 'dispensed';
  createdAt: any;
  updatedAt: any;
};

export async function addPrescriptionFirestore(data: Omit<PrescriptionDoc, 'createdAt' | 'updatedAt'>) {
  const ref = collection(db, 'prescriptions');
  const payload = {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const docRef = await addDoc(ref, payload);
  return docRef.id;
}

export async function updatePrescriptionStatusFirestore(id: string, status: 'draft'|'prescribed'|'dispensed') {
  const d = doc(db, 'prescriptions', id);
  await updateDoc(d, { status, updatedAt: serverTimestamp() });
}

export function subscribePrescriptionsByPatient(patientId: string, cb: (items: any[]) => void) {
  const ref = collection(db, 'prescriptions');
  const qy = query(ref, where('patientId', '==', patientId), orderBy('createdAt', 'desc'));
  return onSnapshot(qy, (snap) => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

export async function listMedicinesFirestore() {
  const ref = collection(db, 'medicines');
  const snap = await getDocs(ref);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function searchPatientsByPrefixFirestore(term: string, max: number = 10) {
  const t = term.trim();
  if (!t) return [] as any[];
  const ref = collection(db, 'patients');
  // Prefix search on display name field 'name'
  const qy = query(ref, orderBy('name'), startAt(t), endAt(t + '\uf8ff'), limit(max));
  const snap = await getDocs(qy);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
