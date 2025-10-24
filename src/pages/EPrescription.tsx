import React, { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  addPrescriptionFirestore,
  listMedicinesFirestore,
  searchPatientsFirestore,
  subscribePrescriptionsByPatient,
} from "@/lib/firebase";

// Types for local state
type PatientLite = { id: string; name?: string; first_name?: string; last_name?: string; gender?: string; date_of_birth?: string; age?: number };
type MedicineLite = { id: string; name?: string; drugName?: string; strength?: string; defaultDosage?: string };

type RxItem = {
  drugId: string;
  drugName: string;
  dosage: string; // e.g., 500mg
  frequency: string; // OD/BD/TDS
  durationDays: number;
  instructions?: string;
  brand?: string;
};

export default function EPrescription() {
  const { toast } = useToast();

  // Patient search & selection
  const [patientQuery, setPatientQuery] = useState("");
  const [patientOptions, setPatientOptions] = useState<PatientLite[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientLite | null>(null);

  // Doctor (you may later wire this to auth user)
  const [doctorId] = useState<string>("doc-001");
  const [doctorName] = useState<string>("Dr. Smith");

  // Medicines
  const [formulary, setFormulary] = useState<MedicineLite[]>([]);
  const [medicineQuery, setMedicineQuery] = useState("");

  // Prescription form
  const [diagnosis, setDiagnosis] = useState("");
  const [items, setItems] = useState<RxItem[]>([]);
  const [status, setStatus] = useState<"draft" | "prescribed" | "dispensed">("draft");
  const [saving, setSaving] = useState(false);

  // History
  const [history, setHistory] = useState<any[]>([]);
  const [historyFrom, setHistoryFrom] = useState("");
  const [historyTo, setHistoryTo] = useState("");

  // Load formulary once
  useEffect(() => {
    (async () => {
      try {
        const meds = await listMedicinesFirestore();
        setFormulary(meds);
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  // Debounced patient search
  const searchDebounce = useRef<number | null>(null);
  useEffect(() => {
    if (!patientQuery.trim()) {
      setPatientOptions([]);
      return;
    }
    if (searchDebounce.current) window.clearTimeout(searchDebounce.current);
    searchDebounce.current = window.setTimeout(async () => {
      try {
        // Uses existing helper that supports first_name/last_name schemas with client-side filtering
        const res = await searchPatientsFirestore(patientQuery);
        setPatientOptions(res as any);
      } catch (e) {
        console.error(e);
      }
    }, 300);
    return () => {
      if (searchDebounce.current) window.clearTimeout(searchDebounce.current);
    };
  }, [patientQuery]);

  // Subscribe patient history
  useEffect(() => {
    if (!selectedPatient?.id) {
      setHistory([]);
      return;
    }
    const unsub = subscribePrescriptionsByPatient(selectedPatient.id, (docs) => {
      setHistory(docs);
    });
    return () => unsub && unsub();
  }, [selectedPatient?.id]);

  const patientDisplayName = (p?: PatientLite | null) => {
    if (!p) return "";
    if (p.name) return p.name;
    return `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || p.id;
  };

  const filteredFormulary = useMemo(() => {
    const q = medicineQuery.trim().toLowerCase();
    if (!q) return formulary.slice(0, 10);
    return formulary.filter((m) => String(m.name || m.drugName || "").toLowerCase().includes(q)).slice(0, 10);
  }, [medicineQuery, formulary]);

  const addMedicine = (m: MedicineLite) => {
    const dn = String(m.name || m.drugName || "");
    if (!dn) return;
    setItems((prev) => [
      ...prev,
      {
        drugId: m.id,
        drugName: dn,
        dosage: m.strength || "",
        frequency: "OD",
        durationDays: 5,
        instructions: "",
        brand: "",
      },
    ]);
    setMedicineQuery("");
  };

  const updateItem = (idx: number, patch: Partial<RxItem>) => {
    setItems((prev) => prev.map((x, i) => (i === idx ? { ...x, ...patch } : x)));
  };

  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));

  // Very basic interaction check: duplicate drug names or same class keywords
  const interactions = useMemo(() => {
    const warns: string[] = [];
    const lower = items.map((i) => i.drugName.toLowerCase());
    const dupes = lower.filter((v, i, a) => a.indexOf(v) !== i);
    if (dupes.length) warns.push("Duplicate medicines detected: " + Array.from(new Set(dupes)).join(", "));
    return warns;
  }, [items]);

  const canSave = selectedPatient && diagnosis.trim() && items.length > 0;

  const handleSave = async () => {
    if (!selectedPatient) return;
    try {
      setSaving(true);
      await addPrescriptionFirestore({
        patientId: selectedPatient.id,
        patientName: patientDisplayName(selectedPatient),
        doctorId,
        doctorName,
        date: new Date(),
        diagnosis: diagnosis.trim(),
        medicines: items,
        status,
      });
      toast({ title: "Prescription saved" });
      // reset
      setDiagnosis("");
      setItems([]);
      setStatus("draft");
    } catch (e: any) {
      toast({ title: "Failed to save", description: String(e?.message || e), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const filteredHistory = useMemo(() => {
    if (!history.length) return [] as any[];
    const from = historyFrom ? new Date(historyFrom).getTime() : 0;
    const to = historyTo ? new Date(historyTo).getTime() : Number.MAX_SAFE_INTEGER;
    return history.filter((h: any) => {
      const ts = (h.createdAt?.toDate ? h.createdAt.toDate() : new Date(h.createdAt || h.date || Date.now())).getTime();
      return ts >= from && ts <= to;
    });
  }, [history, historyFrom, historyTo]);

  return (
    <div className="w-full px-2 md:px-4 py-6 space-y-6">
      {/* Patient Search & Selection */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Patient Search & Selection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="space-y-2 md:col-span-2">
              <Label>Search patient by name or ID</Label>
              <Input placeholder="Type at least 1 character" value={patientQuery} onChange={(e) => setPatientQuery(e.target.value)} />
              {patientOptions.length > 0 && (
                <div className="mt-2 border rounded-md divide-y max-h-56 overflow-auto">
                  {patientOptions.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="w-full text-left px-3 py-2 hover:bg-muted"
                      onClick={() => {
                        setSelectedPatient(p);
                        setPatientOptions([]);
                        setPatientQuery("");
                      }}
                    >
                      <div className="font-medium">{patientDisplayName(p)}</div>
                      <div className="text-xs text-muted-foreground">ID: {p.id} {p.gender ? `• ${p.gender}` : ""}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Selected patient</Label>
              <Input value={patientDisplayName(selectedPatient)} readOnly />
            </div>
          </div>

          {/* Recent prescriptions summary */}
          {selectedPatient && (
            <div className="mt-2">
              <div className="text-sm font-medium mb-2">Recent Prescriptions</div>
              {filteredHistory.length === 0 ? (
                <div className="text-sm text-muted-foreground">No previous prescriptions found.</div>
              ) : (
                <div className="space-y-2">
                  {filteredHistory.slice(0, 3).map((h) => (
                    <div key={h.id} className="p-3 rounded-md border flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">{h.diagnosis}</div>
                        <div className="text-xs text-muted-foreground">{(h.createdAt?.toDate ? h.createdAt.toDate() : new Date(h.createdAt || h.date)).toLocaleString()}</div>
                      </div>
                      <Badge variant={h.status === "dispensed" ? "secondary" : h.status === "prescribed" ? "default" : "outline"}>{String(h.status || "draft").toUpperCase()}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Prescription Form */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Prescription Form</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label>Diagnosis</Label>
              <Input placeholder="e.g., Acute pharyngitis" value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="prescribed">Prescribed</SelectItem>
                  <SelectItem value="dispensed">Dispensed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Add medicines</Label>
            <Input placeholder="Search formulary..." value={medicineQuery} onChange={(e) => setMedicineQuery(e.target.value)} />
            {filteredFormulary.length > 0 && medicineQuery && (
              <div className="mt-2 border rounded-md divide-y max-h-56 overflow-auto">
                {filteredFormulary.map((m) => (
                  <button key={m.id} type="button" className="w-full text-left px-3 py-2 hover:bg-muted" onClick={() => addMedicine(m)}>
                    <div className="font-medium">{m.name || m.drugName}</div>
                    <div className="text-xs text-muted-foreground">{m.strength || m.defaultDosage}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected medicines table */}
          {items.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium">Medicines</div>
              <div className="rounded-md border overflow-hidden">
                <div className="grid grid-cols-12 bg-muted text-xs font-medium px-3 py-2">
                  <div className="col-span-3">Drug</div>
                  <div className="col-span-2">Dosage</div>
                  <div className="col-span-2">Frequency</div>
                  <div className="col-span-2">Duration</div>
                  <div className="col-span-2">Instructions</div>
                  <div className="col-span-1 text-right">Actions</div>
                </div>
                {items.map((it, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 px-3 py-2 items-center border-t">
                    <div className="col-span-3 text-sm font-medium break-words">{it.drugName}</div>
                    <div className="col-span-2">
                      <Input value={it.dosage} onChange={(e) => updateItem(idx, { dosage: e.target.value })} placeholder="e.g. 500mg" />
                    </div>
                    <div className="col-span-2">
                      <Select value={it.frequency} onValueChange={(v) => updateItem(idx, { frequency: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="OD">OD</SelectItem>
                          <SelectItem value="BD">BD</SelectItem>
                          <SelectItem value="TDS">TDS</SelectItem>
                          <SelectItem value="QID">QID</SelectItem>
                          <SelectItem value="HS">HS</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2">
                      <Input type="number" min={1} value={it.durationDays} onChange={(e) => updateItem(idx, { durationDays: Math.max(1, parseInt(e.target.value || "1", 10)) })} />
                    </div>
                    <div className="col-span-2">
                      <Input value={it.instructions || ""} onChange={(e) => updateItem(idx, { instructions: e.target.value })} placeholder="After food" />
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <Button variant="outline" size="sm" onClick={() => removeItem(idx)}>Remove</Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Interaction warnings */}
              {interactions.length > 0 && (
                <div className="text-sm text-destructive">
                  {interactions.map((w, i) => (
                    <div key={i}>• {w}</div>
                  ))}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => { setItems([]); setDiagnosis(""); }}>Clear</Button>
                <Button disabled={!canSave || saving} onClick={handleSave} className="gap-2">
                  {saving && <span className="inline-block h-4 w-4 border-2 border-current border-r-transparent rounded-full animate-spin" />}
                  Save Prescription
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Digital Prescription Preview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">Doctor: <span className="font-medium text-foreground">{doctorName}</span></div>
          <div className="text-sm text-muted-foreground">Patient: <span className="font-medium text-foreground">{patientDisplayName(selectedPatient) || "—"}</span></div>
          <div className="text-sm text-muted-foreground">Diagnosis: <span className="font-medium text-foreground">{diagnosis || "—"}</span></div>
          <div className="border rounded-md">
            <div className="px-3 py-2 bg-muted font-medium">Medicines</div>
            {items.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">No medicines added.</div>
            ) : (
              <div className="divide-y">
                {items.map((m, i) => (
                  <div key={i} className="px-3 py-2 text-sm">
                    <div className="font-medium">{m.drugName} — {m.dosage}</div>
                    <div className="text-muted-foreground">{m.frequency} for {m.durationDays} days{m.instructions ? ` • ${m.instructions}` : ""}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="pt-4 text-sm text-muted-foreground">Signature: ________________________</div>
        </CardContent>
      </Card>

      {/* History & Filters */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Previous Prescriptions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div className="space-y-2">
              <Label>From</Label>
              <Input type="date" value={historyFrom} onChange={(e) => setHistoryFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>To</Label>
              <Input type="date" value={historyTo} onChange={(e) => setHistoryTo(e.target.value)} />
            </div>
          </div>

          {selectedPatient ? (
            filteredHistory.length === 0 ? (
              <div className="text-sm text-muted-foreground">No prescriptions in selected range.</div>
            ) : (
              <div className="space-y-2">
                {filteredHistory.map((h) => (
                  <div key={h.id} className="p-3 rounded-md border">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{h.diagnosis}</div>
                      <Badge variant={h.status === "dispensed" ? "secondary" : h.status === "prescribed" ? "default" : "outline"}>{String(h.status || "draft").toUpperCase()}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">{(h.createdAt?.toDate ? h.createdAt.toDate() : new Date(h.createdAt || h.date)).toLocaleString()}</div>
                    <div className="mt-2 text-sm">
                      {Array.isArray(h.medicines) && h.medicines.length > 0 ? (
                        <ul className="list-disc list-inside">
                          {h.medicines.map((m: any, idx: number) => (
                            <li key={idx}>{m.drugName} — {m.dosage} • {m.frequency} × {m.durationDays}d {m.instructions ? `(${m.instructions})` : ""}</li>
                          ))}
                        </ul>
                      ) : (
                        <div className="text-muted-foreground">No medicines listed</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="text-sm text-muted-foreground">Select a patient to view history.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
