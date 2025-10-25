import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Briefcase, Link2, ClipboardList, FileText, CheckCircle2, BarChart3, RefreshCw, Calendar, DollarSign } from "lucide-react";

 type Partner = {
  id: string;
  name: string;
  type: "Insurer" | "Corporate";
  start: string;
  end: string;
  renewalAuto: boolean;
};

 type Referral = {
  id: string;
  partnerId: string;
  patientId: string;
  date: string;
  status: "Referred" | "Admitted" | "Billed";
};

 type Claim = {
  id: string;
  partnerId: string;
  patientId: string;
  amount: number;
  status: "Draft" | "Submitted" | "Queried" | "Approved" | "Rejected";
};

export default function CorporateClaimsManagement() {
  const [partner, setPartner] = useState({ id: "", name: "", type: "Insurer" as Partner["type"], start: "", end: "", renewalAuto: true });
  const [partners, setPartners] = useState<Partner[]>([
    { id: "P-AXA", name: "AXA Health", type: "Insurer", start: "2025-01-01", end: "2025-12-31", renewalAuto: true },
    { id: "P-INFY", name: "Infosys", type: "Corporate", start: "2025-04-01", end: "2026-03-31", renewalAuto: false },
  ]);

  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);

  const addPartner = () => {
    if (!partner.id || !partner.name || !partner.start || !partner.end) return;
    setPartners(prev => [{ ...partner }, ...prev]);
    setPartner({ id: "", name: "", type: "Insurer", start: "", end: "", renewalAuto: true });
  };

  const addReferral = (partnerId: string) => {
    const id = `R-${Math.random().toString(36).slice(2,7).toUpperCase()}`;
    const patientId = `P-${Math.floor(1000 + Math.random()*9000)}`;
    setReferrals(prev => [{ id, partnerId, patientId, date: new Date().toISOString().slice(0,10), status: "Referred" }, ...prev]);
  };

  const submitClaim = (partnerId: string, patientId: string) => {
    const id = `C-${Math.random().toString(36).slice(2,7).toUpperCase()}`;
    const amount = Math.round(5000 + Math.random()*45000);
    setClaims(prev => [{ id, partnerId, patientId, amount, status: "Submitted" }, ...prev]);
  };

  const advanceClaim = (id: string) => {
    setClaims(prev => prev.map(c => c.id === id ? { ...c, status: c.status === "Submitted" ? "Queried" : c.status === "Queried" ? "Approved" : c.status === "Approved" ? "Approved" : c.status === "Rejected" ? "Rejected" : "Submitted" } : c));
  };

  const kpis = useMemo(() => {
    const active = partners.length;
    const submitted = claims.filter(c => c.status !== "Draft").length;
    const approved = claims.filter(c => c.status === "Approved").length;
    const approvalRate = submitted ? Math.round((approved/submitted)*100) : 0;
    const renewalDue = partners.filter(p => p.end <= new Date(Date.now()+30*86400000).toISOString().slice(0,10)).length;
    return { active, submitted, approvalRate, renewalDue };
  }, [partners, claims]);

  const trend = useMemo(() => {
    return Array.from({ length: 12 }).map((_, i) => ({ m: `M${i+1}`, claims: Math.round(20 + Math.sin(i/2)*8 + Math.random()*6), approval: Math.round(60 + Math.cos(i/3)*15 + Math.random()*5) }));
  }, []);

  const line = (data: number[], color: string) => {
    const max = Math.max(...data, 1), min = Math.min(...data, 0); const h = 80, w = 320;
    const pts = data.map((v,i)=>{ const x = (i/(data.length-1))*w; const y = h - ((v-min)/Math.max(1,max-min))*(h-8) - 4; return `${x.toFixed(1)},${y.toFixed(1)}`; }).join(" ");
    return (<svg viewBox={`0 0 ${w} ${h}`} className="w-full h-24"><polyline fill="none" stroke={color} strokeWidth="2" points={pts} /></svg>);
  };

  return (
    <div className="w-full px-2 md:px-4 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Briefcase className="h-8 w-8 text-primary" />
          Corporate Tie-Ups & Claims Management
        </h1>
        <p className="text-muted-foreground mt-1">Manage insurance policies, corporate partnerships, referral tracking, claim submissions, and renewal automation.</p>
      </div>

      {/* Workflow visual */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Workflow</CardTitle>
          <CardDescription>Agreement → Referral Tracking → Claim Submission → Approval → Reports</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-sm">
            <div className="p-3 rounded-lg border flex items-center justify-center gap-2"><Link2 className="h-4 w-4" /> Agreement</div>
            <div className="p-3 rounded-lg border flex items-center justify-center gap-2"><ClipboardList className="h-4 w-4" /> Referral Tracking</div>
            <div className="p-3 rounded-lg border flex items-center justify-center gap-2"><FileText className="h-4 w-4" /> Claim Submission</div>
            <div className="p-3 rounded-lg border flex items-center justify-center gap-2"><CheckCircle2 className="h-4 w-4" /> Approval</div>
            <div className="p-3 rounded-lg border flex items-center justify-center gap-2"><BarChart3 className="h-4 w-4" /> Reports</div>
          </div>
        </CardContent>
      </Card>

      {/* Agreements & Renewals */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Agreements</CardTitle>
          <CardDescription>Create partnerships and manage renewals</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="space-y-2 md:col-span-2"><Label htmlFor="pid">Partner ID</Label><Input id="pid" value={partner.id} onChange={(e)=>setPartner(p=>({ ...p, id: e.target.value }))} placeholder="P-..." /></div>
            <div className="space-y-2 md:col-span-2"><Label htmlFor="pname">Name</Label><Input id="pname" value={partner.name} onChange={(e)=>setPartner(p=>({ ...p, name: e.target.value }))} placeholder="Partner name" /></div>
            <div className="space-y-2"><Label>Type</Label><Select value={partner.type} onValueChange={(v)=>setPartner(p=>({ ...p, type: v as Partner["type"] }))}><SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger><SelectContent><SelectItem value="Insurer">Insurer</SelectItem><SelectItem value="Corporate">Corporate</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Start</Label><Input type="date" value={partner.start} onChange={(e)=>setPartner(p=>({ ...p, start: e.target.value }))} /></div>
            <div className="space-y-2"><Label>End</Label><Input type="date" value={partner.end} onChange={(e)=>setPartner(p=>({ ...p, end: e.target.value }))} /></div>
            <div className="flex items-end gap-2"><Button onClick={addPartner}>Add</Button></div>
          </div>
          <div className="mt-4">
            <Table>
              <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Name</TableHead><TableHead>Type</TableHead><TableHead>Start</TableHead><TableHead>End</TableHead><TableHead>Renewal</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {partners.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.id}</TableCell>
                    <TableCell>{p.name}</TableCell>
                    <TableCell>{p.type}</TableCell>
                    <TableCell>{p.start}</TableCell>
                    <TableCell>{p.end}</TableCell>
                    <TableCell>{p.renewalAuto ? <Badge>Auto</Badge> : <Badge variant="outline">Manual</Badge>}</TableCell>
                    <TableCell className="text-right"><Button size="sm" variant="outline"><RefreshCw className="h-4 w-4 mr-1" /> Renew</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Referral Tracking */}
        <Card className="shadow-md lg:col-span-2">
          <CardHeader>
            <CardTitle>Referral Tracking</CardTitle>
            <CardDescription>From referral to admission</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-3 flex gap-2">
              <Button variant="outline" onClick={()=>addReferral(partners[0]?.id || "P-AXA")}><ClipboardList className="h-4 w-4 mr-2" /> Add Referral</Button>
            </div>
            <Table>
              <TableHeader><TableRow><TableHead>Ref</TableHead><TableHead>Partner</TableHead><TableHead>Patient</TableHead><TableHead>Date</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
              <TableBody>
                {referrals.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-sm text-muted-foreground">No referrals</TableCell></TableRow>
                ) : referrals.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.id}</TableCell>
                    <TableCell>{r.partnerId}</TableCell>
                    <TableCell>{r.patientId}</TableCell>
                    <TableCell>{r.date}</TableCell>
                    <TableCell>{r.status}</TableCell>
                    <TableCell className="text-right"><Button size="sm" variant="outline" onClick={()=>submitClaim(r.partnerId, r.patientId)}><FileText className="h-4 w-4 mr-1" /> Submit Claim</Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Claims */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Claims</CardTitle>
            <CardDescription>Submission to approval</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {claims.length === 0 && <div className="text-sm text-muted-foreground">No claims</div>}
              {claims.map(c => (
                <div key={c.id} className="p-3 rounded-lg border flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{c.id} • {c.partnerId}</div>
                    <div className="text-xs text-muted-foreground">{c.patientId} • <DollarSign className="inline h-3 w-3" /> {c.amount}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={c.status === "Approved" ? "default" : c.status === "Queried" ? "secondary" : "outline"}>{c.status}</Badge>
                    <Button size="sm" variant="outline" onClick={()=>advanceClaim(c.id)}>Advance</Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance dashboards */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Performance Dashboards</CardTitle>
          <CardDescription>Approvals, claim volume, and renewal automation</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 rounded-lg border">
              <div className="text-sm font-medium mb-1">Active Partners</div>
              <div className="text-3xl font-semibold">{kpis.active}</div>
              <div className="mt-2">{line(trend.map(t=>t.claims), "#0ea5e9")}</div>
            </div>
            <div className="p-3 rounded-lg border">
              <div className="text-sm font-medium mb-1">Approval Rate</div>
              <div className="text-3xl font-semibold">{kpis.approvalRate}%</div>
              <div className="mt-2">{line(trend.map(t=>t.approval), "#22c55e")}</div>
            </div>
            <div className="p-3 rounded-lg border">
              <div className="text-sm font-medium mb-1">Renewals Due (30d)</div>
              <div className="text-3xl font-semibold">{kpis.renewalDue}</div>
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground"><Calendar className="h-4 w-4" /> Automated reminders enabled</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
