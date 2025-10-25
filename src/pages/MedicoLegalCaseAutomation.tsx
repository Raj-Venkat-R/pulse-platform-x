import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { ShieldCheck, FileText, Fingerprint, Link2, CheckCircle2, Cog, Upload, Gavel, Landmark } from "lucide-react";

 type AuditEntry = {
  id: string;
  action: string;
  by: string;
  hash: string;
  timestamp: string;
};

export default function MedicoLegalCaseAutomation() {
  const [caseId, setCaseId] = useState("");
  const [patientId, setPatientId] = useState("");
  const [firNumber, setFirNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [signedBy, setSignedBy] = useState("");

  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [records, setRecords] = useState<any[]>([]);

  const addAudit = (action: string, by = "system") => {
    const entry: AuditEntry = {
      id: `AUD-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      action,
      by,
      hash: `0x${Math.random().toString(16).slice(2, 10)}${Math.random().toString(16).slice(2, 10)}`,
      timestamp: new Date().toLocaleString(),
    };
    setAudit(prev => [entry, ...prev]);
  };

  const registerCase = () => {
    if (!caseId || !patientId) return;
    setRecords(prev => [{ caseId, patientId, status: "Registered", fir: firNumber || "—" }, ...prev]);
    addAudit(`Registered MLC ${caseId} for patient ${patientId}`, "registrar");
  };

  const fetchFIR = async () => {
    if (!firNumber) return;
    // Simulate FIR fetch
    addAudit(`Linked FIR ${firNumber} to ${caseId || "(draft)"}`, "integrator");
  };

  const signDocument = () => {
    if (!signedBy || !caseId) return;
    addAudit(`Digital signature captured by ${signedBy} on case ${caseId}`, signedBy);
  };

  return (
    <div className="w-full px-2 md:px-4 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Gavel className="h-8 w-8 text-primary" />
          Medico-Legal Case Automation
        </h1>
        <p className="text-muted-foreground mt-1">
          Replace paper-based MLC workflows with a secure digital system featuring blockchain audit trails, digital signatures, and FIR data integration.
        </p>
      </div>

      {/* Key Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="shadow-md lg:col-span-2">
          <CardHeader>
            <CardTitle>Description</CardTitle>
            <CardDescription>Digital MLC registration and forensic documentation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm text-foreground">
              <p>
                Structured forms capture medico-legal details at the point of care, attach forensic media, and maintain
                immutable evidence chains. Each action is committed to a blockchain-backed audit trail.
              </p>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                <li>Secure patient identity linking and custody records</li>
                <li>Template-driven legal forms and forensic documentation</li>
                <li>Automated timestamps, location tagging, and role-based access</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Expected Outcome</CardTitle>
            <CardDescription>Court-ready records with automated compliance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-600" /> Verified chain-of-custody</div>
              <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-sky-600" /> Standardized legal forms</div>
              <div className="flex items-center gap-2"><Fingerprint className="h-4 w-4 text-indigo-600" /> Digital signatures</div>
              <div className="flex items-center gap-2"><Landmark className="h-4 w-4 text-amber-600" /> Court-ready evidence packs</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Domain</CardTitle>
            <CardDescription>LegalTech / Health</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              Intersects clinical workflows with legal compliance: MLC registration, FIR linkage, consent, evidence handling, and reporting.
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md lg:col-span-2">
          <CardHeader>
            <CardTitle>Flow</CardTitle>
            <CardDescription>Input → Processing → Output</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg border">
                <div className="text-sm font-medium mb-2">Input</div>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2"><Upload className="h-4 w-4" /> Patient ID, case details</div>
                  <div className="flex items-center gap-2"><Link2 className="h-4 w-4" /> FIR number & fields</div>
                  <div className="flex items-center gap-2"><FileText className="h-4 w-4" /> Forensic notes & media</div>
                </div>
              </div>
              <div className="p-4 rounded-lg border">
                <div className="text-sm font-medium mb-2">Processing</div>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2"><Cog className="h-4 w-4" /> Validate identity and forms</div>
                  <div className="flex items-center gap-2"><Fingerprint className="h-4 w-4" /> Capture digital signatures</div>
                  <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Write audit events to blockchain</div>
                </div>
              </div>
              <div className="p-4 rounded-lg border">
                <div className="text-sm font-medium mb-2">Output</div>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2"><FileText className="h-4 w-4" /> Court-ready PDF/JSON bundles</div>
                  <div className="flex items-center gap-2"><Link2 className="h-4 w-4" /> FIR-linked case dossier</div>
                  <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Compliance certificates</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Working Panels */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Register MLC</CardTitle>
          <CardDescription>Secure digital registration replacing paper forms</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="caseId">Case ID</Label>
              <Input id="caseId" value={caseId} onChange={(e)=>setCaseId(e.target.value)} placeholder="e.g., MLC-2025-00123" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="patientId">Patient ID</Label>
              <Input id="patientId" value={patientId} onChange={(e)=>setPatientId(e.target.value)} placeholder="e.g., P-10992" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fir">FIR Number</Label>
              <Input id="fir" value={firNumber} onChange={(e)=>setFirNumber(e.target.value)} placeholder="e.g., FIR-55/2025" />
            </div>
            <div className="flex items-end">
              <Button className="w-full" onClick={registerCase}>Register</Button>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <Label htmlFor="notes">Forensic Notes</Label>
            <Textarea id="notes" value={notes} onChange={(e)=>setNotes(e.target.value)} placeholder="Brief incident description, injuries, chain-of-custody, etc." />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>FIR Integration</CardTitle>
            <CardDescription>Fetch and link FIR data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button variant="outline" onClick={fetchFIR}><Link2 className="h-4 w-4 mr-2" /> Fetch FIR</Button>
              <Button variant="outline" onClick={()=>addAudit("FIR fields synchronized", "integrator")}><Upload className="h-4 w-4 mr-2" /> Sync fields</Button>
            </div>
            <div className="mt-4 text-sm text-muted-foreground">Use the FIR number to fetch structured data (e.g., police station, IPC sections, complainant details).</div>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Digital Signatures</CardTitle>
            <CardDescription>Sign forms and evidence logs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="signedBy">Signer</Label>
                <Input id="signedBy" value={signedBy} onChange={(e)=>setSignedBy(e.target.value)} placeholder="e.g., Dr. A. Sharma (Forensic)" />
              </div>
              <div className="flex items-end">
                <Button className="w-full" onClick={signDocument}><Fingerprint className="h-4 w-4 mr-2" /> Sign</Button>
              </div>
            </div>
            <div className="mt-3 text-xs text-muted-foreground">Supports eSign/PKI providers and biometric capture. Every signature is recorded in the audit trail.</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Recent Records</CardTitle>
            <CardDescription>Registered cases and status</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Case</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>FIR</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-sm text-muted-foreground">No records</TableCell></TableRow>
                ) : records.map((r:any)=> (
                  <TableRow key={r.caseId}>
                    <TableCell className="font-medium">{r.caseId}</TableCell>
                    <TableCell>{r.patientId}</TableCell>
                    <TableCell><Badge variant="secondary">{r.status}</Badge></TableCell>
                    <TableCell>{r.fir}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Blockchain Audit Trail</CardTitle>
            <CardDescription>Immutable event log</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {audit.length === 0 && <div className="text-sm text-muted-foreground">No audit entries</div>}
              {audit.map(a => (
                <div key={a.id} className="p-3 rounded-lg border">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-600" /> {a.action}</div>
                    <span className="text-xs text-muted-foreground">{a.timestamp}</span>
                  </div>
                  <div className="mt-1 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <div><span className="text-muted-foreground">By:</span> {a.by}</div>
                    <div className="truncate"><span className="text-muted-foreground">Hash:</span> {a.hash}</div>
                    <div><span className="text-muted-foreground">ID:</span> {a.id}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
