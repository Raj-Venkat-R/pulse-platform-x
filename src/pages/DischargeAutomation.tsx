import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ClipboardCheck, FileText, QrCode, Cog, CheckCircle2 } from "lucide-react";

 type Extracted = {
  diagnosis: string[];
  procedures: string[];
  meds: { name: string; dose?: string; freq?: string; duration?: string }[];
  followup?: string;
};

export default function DischargeAutomation() {
  const [notes, setNotes] = useState("");
  const [tests, setTests] = useState("");
  const [rx, setRx] = useState("");
  const [extracted, setExtracted] = useState<Extracted | null>(null);
  const [template, setTemplate] = useState<string>("");

  const runNLP = () => {
    // lightweight extraction mock
    const dx = Array.from(new Set(
      [...notes.matchAll(/dx[:\-]?\s*([^\n]+)/gi)].map(m => m[1].trim())
        .concat([...notes.matchAll(/diagnosis[:\-]?\s*([^\n]+)/gi)].map(m => m[1].trim()))
    )).filter(Boolean);
    const proc = Array.from(new Set(
      [...notes.matchAll(/procedure[:\-]?\s*([^\n]+)/gi)].map(m => m[1].trim())
        .concat([...tests.matchAll(/performed[:\-]?\s*([^\n]+)/gi)].map(m => m[1].trim()))
    )).filter(Boolean);
    const meds: Extracted["meds"] = rx.split(/\n+/).map(l => l.trim()).filter(Boolean).map(line => {
      // parse format: Name dose freq duration
      const m = line.match(/^([a-zA-Z0-9\-\s]+)\s+(\d+ ?mg|\d+ ?mcg|\d+ ?g)?\s*(OD|BD|TID|QID|HS|PRN)?\s*(\d+\s*days|\d+\s*weeks)?/i);
      return { name: m?.[1]?.trim() || line, dose: m?.[2]?.trim(), freq: m?.[3]?.trim(), duration: m?.[4]?.trim() };
    });
    const fu = [...notes.matchAll(/follow\s*up[:\-]?\s*([^\n]+)/gi)].map(m => m[1].trim())[0];
    setExtracted({ diagnosis: dx, procedures: proc, meds, followup: fu });
  };

  const populate = () => {
    if (!extracted) return;
    const lines: string[] = [];
    lines.push("Discharge Summary\n");
    lines.push("Diagnosis:");
    extracted.diagnosis.length ? extracted.diagnosis.forEach((d,i)=>lines.push(`${i+1}. ${d}`)) : lines.push("- Not specified");
    lines.push("\nProcedures:");
    extracted.procedures.length ? extracted.procedures.forEach((p,i)=>lines.push(`${i+1}. ${p}`)) : lines.push("- None");
    lines.push("\nMedications:");
    extracted.meds.length ? extracted.meds.forEach((m,i)=>{
      const parts = [m.name, m.dose, m.freq, m.duration].filter(Boolean).join(" • ");
      lines.push(`${i+1}. ${parts}`);
    }) : lines.push("- None");
    lines.push("\nFollow-up:");
    lines.push(extracted.followup || "As advised");
    lines.push("\nCompliance: NABH discharge summary format (core fields)\n");
    setTemplate(lines.join("\n"));
  };

  const qrData = useMemo(() => {
    if (!extracted?.meds?.length) return "";
    const compact = extracted.meds.map(m => ({ n: m.name, d: m.dose, f: m.freq, du: m.duration }));
    return btoa(unescape(encodeURIComponent(JSON.stringify({ meds: compact }))));
  }, [extracted]);

  const copyQRPayload = async () => {
    if (!qrData) return;
    try { await navigator.clipboard.writeText(qrData); } catch {}
  };

  return (
    <div className="w-full px-2 md:px-4 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <FileText className="h-8 w-8 text-primary" />
          Discharge Summary Automation
        </h1>
      </div>

      {/* Flow */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Flow</CardTitle>
          <CardDescription>Input → Processing → Output</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg border">
              <div className="text-sm font-medium mb-2">Input</div>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-2"><ClipboardCheck className="h-4 w-4" /> EMR notes</div>
                <div className="flex items-center gap-2"><ClipboardCheck className="h-4 w-4" /> Test results</div>
                <div className="flex items-center gap-2"><ClipboardCheck className="h-4 w-4" /> Prescriptions</div>
              </div>
            </div>
            <div className="p-4 rounded-lg border">
              <div className="text-sm font-medium mb-2">Processing</div>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-2"><Cog className="h-4 w-4" /> NLP extraction</div>
                <div className="flex items-center gap-2"><Cog className="h-4 w-4" /> Template population</div>
              </div>
            </div>
            <div className="p-4 rounded-lg border">
              <div className="text-sm font-medium mb-2">Output</div>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-2"><FileText className="h-4 w-4" /> NABH-compliant PDF</div>
                <div className="flex items-center gap-2"><QrCode className="h-4 w-4" /> QR-coded med list</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Input panes */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Inputs</CardTitle>
          <CardDescription>Paste EMR notes, lab results, and prescriptions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="notes">EMR Notes</Label>
              <Textarea id="notes" rows={8} value={notes} onChange={(e)=>setNotes(e.target.value)} placeholder="Dx: Type 2 Diabetes\nProcedure: Wound Debridement\nFollow up: 2 weeks endocrinology clinic" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tests">Test Results</Label>
              <Textarea id="tests" rows={8} value={tests} onChange={(e)=>setTests(e.target.value)} placeholder="HbA1c 8.2%\nCBC normal\nPerformed: X-ray foot" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rx">Prescriptions</Label>
              <Textarea id="rx" rows={8} value={rx} onChange={(e)=>setRx(e.target.value)} placeholder="Metformin 500 mg BD 30 days\nAtorvastatin 10 mg HS 30 days" />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={runNLP}><Cog className="h-4 w-4 mr-2" /> Run NLP Extract</Button>
            <Button variant="outline" onClick={populate} disabled={!extracted}><CheckCircle2 className="h-4 w-4 mr-2" /> Populate Template</Button>
          </div>
        </CardContent>
      </Card>

      {/* Output */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Summary Preview</CardTitle>
            <CardDescription>NABH core sections</CardDescription>
          </CardHeader>
          <CardContent>
            {!template ? (
              <div className="text-sm text-muted-foreground">No summary generated</div>
            ) : (
              <pre className="text-sm p-3 rounded border bg-muted/30 whitespace-pre-wrap">{template}</pre>
            )}
            <div className="mt-3 flex gap-2">
              <Button variant="outline"><FileText className="h-4 w-4 mr-2" /> Export PDF</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>QR-coded Medication List</CardTitle>
            <CardDescription>Scan to import medications</CardDescription>
          </CardHeader>
          <CardContent>
            {!extracted?.meds?.length ? (
              <div className="text-sm text-muted-foreground">No medications parsed</div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {extracted.meds.map((m, i) => (
                    <div key={i} className="p-2 rounded border text-sm">
                      <div className="font-medium">{m.name}</div>
                      <div className="text-muted-foreground">{[m.dose, m.freq, m.duration].filter(Boolean).join(" • ")}</div>
                    </div>
                  ))}
                </div>
                <Separator />
                <div>
                  <div className="text-xs text-muted-foreground mb-1">QR payload (base64 JSON)</div>
                  <div className="p-2 rounded border bg-muted/30 text-xs break-all">{qrData}</div>
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" variant="outline" onClick={copyQRPayload}><QrCode className="h-4 w-4 mr-2" /> Copy Payload</Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
