import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Heart, ShieldCheck, Link2, Landmark, Fingerprint, FileText } from "lucide-react";

 type Candidate = {
  id: string;
  type: "Donor" | "Recipient";
  blood: string;
  hla: string; // simplified string
  age: number;
  organ: string;
  urgency?: "Low" | "Medium" | "High";
};

 type Match = {
  id: string;
  donor: string;
  recipient: string;
  organ: string;
  score: number;
  status: "Suggested" | "Approved" | "Scheduled" | "Completed";
};

 type Audit = { id: string; action: string; by: string; hash: string; time: string };

export default function OrganTransplantCaseManagement() {
  const [donor, setDonor] = useState({ id: "", blood: "", hla: "", age: "", organ: "" });
  const [recipient, setRecipient] = useState({ id: "", blood: "", hla: "", age: "", organ: "" });
  const [consentNotes, setConsentNotes] = useState("");

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [audit, setAudit] = useState<Audit[]>([]);

  const addAudit = (action: string, by = "system") => {
    const entry: Audit = { id: `AUD-${Math.random().toString(36).slice(2,8).toUpperCase()}`, action, by, hash: `0x${Math.random().toString(16).slice(2,10)}${Math.random().toString(16).slice(2,10)}`, time: new Date().toLocaleString() };
    setAudit(prev => [entry, ...prev]);
  };

  const addDonor = () => {
    if (!donor.id || !donor.blood || !donor.organ) return;
    setCandidates(prev => [{ id: donor.id, type: "Donor", blood: donor.blood, hla: donor.hla, age: Number(donor.age||0), organ: donor.organ }, ...prev]);
    addAudit(`Donor registered ${donor.id}`, "coordinator");
    setDonor({ id: "", blood: "", hla: "", age: "", organ: "" });
  };
  const addRecipient = () => {
    if (!recipient.id || !recipient.blood || !recipient.organ) return;
    setCandidates(prev => [{ id: recipient.id, type: "Recipient", blood: recipient.blood, hla: recipient.hla, age: Number(recipient.age||0), organ: recipient.organ, urgency: "High" }, ...prev]);
    addAudit(`Recipient registered ${recipient.id}`, "coordinator");
    setRecipient({ id: "", blood: "", hla: "", age: "", organ: "" });
  };

  const computeScore = (d: Candidate, r: Candidate) => {
    let s = 0;
    if (d.organ === r.organ) s += 50;
    if (d.blood && r.blood && compatibleBlood(d.blood, r.blood)) s += 30;
    s += hlaMatchScore(d.hla, r.hla);
    if (r.urgency === "High") s += 10;
    return Math.min(100, s);
  };

  const findMatches = () => {
    const donors = candidates.filter(c => c.type === "Donor");
    const recips = candidates.filter(c => c.type === "Recipient");
    const list: Match[] = [];
    donors.forEach(d => {
      recips.forEach(r => {
        const score = computeScore(d, r);
        if (score >= 50) list.push({ id: `MT-${Math.random().toString(36).slice(2,7).toUpperCase()}`, donor: d.id, recipient: r.id, organ: r.organ, score, status: "Suggested" });
      });
    });
    list.sort((a,b)=>b.score-a.score);
    setMatches(list.slice(0, 10));
    addAudit(`Matching run generated ${list.length} pairs`, "matcher");
  };

  const approve = (id: string) => {
    setMatches(prev => prev.map(m => m.id === id ? { ...m, status: m.status === "Suggested" ? "Approved" : m.status === "Approved" ? "Scheduled" : "Completed" } : m));
    addAudit(`Match ${id} advanced`, "committee");
  };

  const compliance = useMemo(() => {
    const required = ["Consent forms signed", "Brain death certification (if applicable)", "Organ allocation registry update", "Regulatory notification"];
    const done = audit.length > 0; // demo: if any audit exists, mark first item done
    return { required, doneCount: done ? 1 : 0 };
  }, [audit]);

  const outcomes = useMemo(() => {
    const completed = matches.filter(m => m.status === "Completed").length;
    const approved = matches.filter(m => m.status === "Approved").length;
    const scheduled = matches.filter(m => m.status === "Scheduled").length;
    const suggested = matches.filter(m => m.status === "Suggested").length;
    return { completed, approved, scheduled, suggested };
  }, [matches]);

  const exportCase = () => {
    addAudit("Exported case bundle (JSON/PDF)", "coordinator");
  };

  return (
    <div className="w-full px-2 md:px-4 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Heart className="h-8 w-8 text-primary" />
          Organ Transplant Case Management
        </h1>
        <p className="text-muted-foreground mt-1">Digitally manage donor–recipient data, consent forms, blockchain audit trails, and outcomes with compliance.</p>
      </div>

      {/* Legal & Clinical Data Integration */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Legal & Clinical Data Integration</CardTitle>
          <CardDescription>Register donor/recipient and capture consent</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <div className="font-medium mb-2">Donor</div>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <div className="md:col-span-2 space-y-2"><Label>ID</Label><Input value={donor.id} onChange={(e)=>setDonor(p=>({ ...p, id: e.target.value }))} placeholder="D-1001" /></div>
                <div className="space-y-2"><Label>Blood</Label><Input value={donor.blood} onChange={(e)=>setDonor(p=>({ ...p, blood: e.target.value }))} placeholder="O+" /></div>
                <div className="space-y-2"><Label>HLA</Label><Input value={donor.hla} onChange={(e)=>setDonor(p=>({ ...p, hla: e.target.value }))} placeholder="A2,B7,DR15" /></div>
                <div className="space-y-2"><Label>Organ</Label><Input value={donor.organ} onChange={(e)=>setDonor(p=>({ ...p, organ: e.target.value }))} placeholder="Kidney" /></div>
                <div className="space-y-2"><Label>Age</Label><Input value={donor.age} onChange={(e)=>setDonor(p=>({ ...p, age: e.target.value }))} placeholder="35" /></div>
                <div className="md:col-span-5"><Button onClick={addDonor}>Add Donor</Button></div>
              </div>
            </div>
            <div>
              <div className="font-medium mb-2">Recipient</div>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <div className="md:col-span-2 space-y-2"><Label>ID</Label><Input value={recipient.id} onChange={(e)=>setRecipient(p=>({ ...p, id: e.target.value }))} placeholder="R-2001" /></div>
                <div className="space-y-2"><Label>Blood</Label><Input value={recipient.blood} onChange={(e)=>setRecipient(p=>({ ...p, blood: e.target.value }))} placeholder="A+" /></div>
                <div className="space-y-2"><Label>HLA</Label><Input value={recipient.hla} onChange={(e)=>setRecipient(p=>({ ...p, hla: e.target.value }))} placeholder="A2,B7,DR15" /></div>
                <div className="space-y-2"><Label>Organ</Label><Input value={recipient.organ} onChange={(e)=>setRecipient(p=>({ ...p, organ: e.target.value }))} placeholder="Kidney" /></div>
                <div className="space-y-2"><Label>Age</Label><Input value={recipient.age} onChange={(e)=>setRecipient(p=>({ ...p, age: e.target.value }))} placeholder="44" /></div>
                <div className="md:col-span-5"><Button onClick={addRecipient}>Add Recipient</Button></div>
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <Label htmlFor="consent">Consent & Legal Notes</Label>
            <Textarea id="consent" rows={4} value={consentNotes} onChange={(e)=>setConsentNotes(e.target.value)} placeholder="Consent captured via eSign; regulatory forms submitted..." />
            <div className="flex gap-2">
              <Button variant="outline" onClick={()=>addAudit("Consent signed (digital signature)", "legal")}><Fingerprint className="h-4 w-4 mr-2" /> Capture eSign</Button>
              <Button variant="outline" onClick={()=>addAudit("Regulatory forms filed", "legal")}><Landmark className="h-4 w-4 mr-2" /> File Forms</Button>
              <Button variant="outline" onClick={exportCase}><FileText className="h-4 w-4 mr-2" /> Export Case</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Real-time matching dashboard */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Real-time Matching Dashboard</CardTitle>
          <CardDescription>Compute compatibility and track approvals</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-3 flex gap-2">
            <Button onClick={findMatches}><Link2 className="h-4 w-4 mr-2" /> Run Matching</Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Match</TableHead>
                <TableHead>Donor</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead>Organ</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {matches.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-sm text-muted-foreground">No matches</TableCell></TableRow>
              ) : matches.map(m => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.id}</TableCell>
                  <TableCell>{m.donor}</TableCell>
                  <TableCell>{m.recipient}</TableCell>
                  <TableCell>{m.organ}</TableCell>
                  <TableCell><Badge variant={m.score >= 80 ? "default" : m.score >= 65 ? "secondary" : "outline"}>{m.score}</Badge></TableCell>
                  <TableCell>{m.status}</TableCell>
                  <TableCell className="text-right"><Button size="sm" variant="outline" onClick={()=>approve(m.id)}>Advance</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Outcome analytics & Blockchain audit */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Outcome Analytics</CardTitle>
            <CardDescription>Approvals, scheduling, completions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="p-3 rounded-lg border"><div className="text-xs text-muted-foreground">Suggested</div><div className="text-2xl font-semibold">{outcomes.suggested}</div></div>
              <div className="p-3 rounded-lg border"><div className="text-xs text-muted-foreground">Approved</div><div className="text-2xl font-semibold">{outcomes.approved}</div></div>
              <div className="p-3 rounded-lg border"><div className="text-xs text-muted-foreground">Completed</div><div className="text-2xl font-semibold">{outcomes.completed}</div></div>
            </div>
            <div>
              <div className="text-sm font-medium mb-2">Pipeline</div>
              <div className="space-y-2">
                {[['Suggested', outcomes.suggested], ['Approved', outcomes.approved], ['Scheduled', outcomes.scheduled], ['Completed', outcomes.completed]].map(([k,v]) => (
                  <div key={k as string} className="flex items-center gap-3 text-sm">
                    <div className="w-20 text-muted-foreground">{k}</div>
                    <div className="flex-1 h-3 bg-muted rounded"><div className="h-3 rounded bg-sky-500" style={{ width: `${Math.min(100, Number(v)||0 * 20)}%` }} /></div>
                    <div className="w-8 text-right">{v as number}</div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Blockchain Audit Trail & Compliance</CardTitle>
            <CardDescription>Immutable logs and regulatory checklist</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {audit.length === 0 && <div className="text-sm text-muted-foreground">No audit entries</div>}
              {audit.map(a => (
                <div key={a.id} className="p-3 rounded-lg border">
                  <div className="flex items-center justify-between"><div className="text-sm font-medium flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-600" /> {a.action}</div><span className="text-xs text-muted-foreground">{a.time}</span></div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs mt-1">
                    <div><span className="text-muted-foreground">By:</span> {a.by}</div>
                    <div className="truncate"><span className="text-muted-foreground">Hash:</span> {a.hash}</div>
                    <div><span className="text-muted-foreground">ID:</span> {a.id}</div>
                  </div>
                </div>
              ))}
              <Separator />
              <div>
                <div className="text-sm font-medium mb-1">Regulatory Compliance</div>
                <div className="space-y-1 text-sm">
                  {compliance.required.map((r, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <ShieldCheck className={`h-4 w-4 ${i < compliance.doneCount ? 'text-emerald-600' : 'text-muted-foreground'}`} />
                      <span className={i < compliance.doneCount ? 'text-foreground' : 'text-muted-foreground'}>{r}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function compatibleBlood(d: string, r: string) {
  const comp: Record<string, string[]> = { 'O-': ['O-'], 'O+': ['O-','O+'], 'A-': ['O-','A-'], 'A+': ['O-','O+','A-','A+'], 'B-': ['O-','B-'], 'B+': ['O-','O+','B-','B+'], 'AB-': ['O-','A-','B-','AB-'], 'AB+': ['O-','O+','A-','A+','B-','B+','AB-','AB+'] };
  return comp[r]?.includes(d) || false;
}
function hlaMatchScore(a: string, b: string) {
  if (!a || !b) return 0; const as = a.split(',').map(s=>s.trim().toUpperCase()); const bs = b.split(',').map(s=>s.trim().toUpperCase());
  const common = as.filter(x => bs.includes(x)).length; return Math.min(20, common*5);
}
