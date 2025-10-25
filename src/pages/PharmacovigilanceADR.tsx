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
import { AlertTriangle, Microscope, Activity, FileText, Bell } from "lucide-react";

 type Incident = {
  id: string;
  patientId: string;
  drug: string;
  description: string;
  severity: "Mild" | "Moderate" | "Severe" | "Life-threatening";
  rootCause?: string;
  status: "New" | "Under Review" | "Closed";
  createdAt: number;
};

export default function PharmacovigilanceADR() {
  const [patientId, setPatientId] = useState("");
  const [drug, setDrug] = useState("");
  const [desc, setDesc] = useState("");
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [alerts, setAlerts] = useState<{ id: string; msg: string; level: "Info" | "Warning" | "Critical" }[]>([]);

  const aiAnalyze = (text: string) => {
    const t = text.toLowerCase();
    let severity: Incident["severity"] = "Moderate";
    if (/anaphylaxis|shock|respiratory|collapse/.test(t)) severity = "Life-threatening";
    else if (/severe|bleeding|arrhythmia|seizure/.test(t)) severity = "Severe";
    else if (/rash|nausea|vomit|dizzy/.test(t)) severity = "Mild";
    const root = /dose|dosing|interaction|allergy|contraindicated|renal|hepatic/.exec(t)?.[0] || "Unknown";
    return { severity, rootCause: root };
  };

  const reportIncident = () => {
    if (!patientId || !drug || !desc) return;
    const id = `ADR-${Math.random().toString(36).slice(2,7).toUpperCase()}`;
    const ai = aiAnalyze(desc);
    const createdAt = Date.now();
    setIncidents(prev => [{ id, patientId, drug, description: desc, severity: ai.severity, rootCause: ai.rootCause, status: "Under Review", createdAt }, ...prev]);
    if (ai.severity === "Life-threatening" || ai.severity === "Severe") {
      setAlerts(prev => [{ id: `AL-${Date.now()}`, msg: `${ai.severity} ADR detected for ${drug} (patient ${patientId})`, level: "Critical" }, ...prev]);
    } else {
      setAlerts(prev => [{ id: `AL-${Date.now()}`, msg: `ADR logged for ${drug} (patient ${patientId})`, level: "Info" }, ...prev]);
    }
    setPatientId(""); setDrug(""); setDesc("");
  };

  const closeIncident = (id: string) => setIncidents(prev => prev.map(i => i.id === id ? { ...i, status: "Closed" } : i));

  const analytics = useMemo(() => {
    const total = incidents.length;
    const bySeverity: Record<Incident["severity"], number> = { "Mild":0, "Moderate":0, "Severe":0, "Life-threatening":0 };
    let tClosed = 0;
    incidents.forEach(i => { bySeverity[i.severity]++; if (i.status === "Closed") tClosed++; });
    const closeRate = total ? Math.round((tClosed/total)*100) : 0;
    const last30 = incidents.filter(i => (Date.now() - i.createdAt) <= 30*86400000).length;
    return { total, bySeverity, closeRate, last30 };
  }, [incidents]);

  const line = (data: number[], color: string) => {
    const max = Math.max(...data, 1), min = Math.min(...data, 0); const h = 80, w = 320;
    const pts = data.map((v,i)=>{ const x = (i/(data.length-1))*w; const y = h - ((v-min)/Math.max(1,max-min))*(h-8) - 4; return `${x.toFixed(1)},${y.toFixed(1)}`; }).join(" ");
    return (<svg viewBox={`0 0 ${w} ${h}`} className="w-full h-24"><polyline fill="none" stroke={color} strokeWidth="2" points={pts} /></svg>);
  };

  const trend = useMemo(() => Array.from({length:12}).map((_,i)=>Math.round(5 + Math.sin(i/2)*3 + Math.random()*3)), []);

  return (
    <div className="w-full px-2 md:px-4 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Microscope className="h-8 w-8 text-primary" />
          Pharmacovigilance & ADR Monitoring
        </h1>
        <p className="text-muted-foreground mt-1">AI detects and tracks medication errors and adverse reactions with compliance reporting.</p>
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
                <div className="flex items-center gap-2"><FileText className="h-4 w-4" /> Incident reports</div>
                <div className="flex items-center gap-2"><Activity className="h-4 w-4" /> Drug data</div>
              </div>
            </div>
            <div className="p-4 rounded-lg border">
              <div className="text-sm font-medium mb-2">Processing</div>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-2"><Microscope className="h-4 w-4" /> Root cause analysis</div>
                <div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Severity assessment</div>
              </div>
            </div>
            <div className="p-4 rounded-lg border">
              <div className="text-sm font-medium mb-2">Output</div>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-2"><Bell className="h-4 w-4" /> Alerts</div>
                <div className="flex items-center gap-2"><FileText className="h-4 w-4" /> Compliance reports</div>
                <div className="flex items-center gap-2"><Activity className="h-4 w-4" /> Trend analytics</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Input */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Log ADR / Medication Error</CardTitle>
          <CardDescription>Capture incident details for analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="space-y-2"><Label htmlFor="pid">Patient ID</Label><Input id="pid" value={patientId} onChange={(e)=>setPatientId(e.target.value)} placeholder="e.g., P-13011" /></div>
            <div className="space-y-2"><Label htmlFor="drug">Drug</Label><Input id="drug" value={drug} onChange={(e)=>setDrug(e.target.value)} placeholder="e.g., Amoxicillin" /></div>
            <div className="space-y-2 md:col-span-4"><Label htmlFor="desc">Description</Label><Textarea id="desc" rows={2} value={desc} onChange={(e)=>setDesc(e.target.value)} placeholder="What happened? Symptoms, dosing, timing, interactions..." /></div>
            <div className="flex items-end"><Button onClick={reportIncident}>Report</Button></div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Incidents board */}
        <Card className="shadow-md lg:col-span-2">
          <CardHeader>
            <CardTitle>Incidents</CardTitle>
            <CardDescription>AI severity and root cause</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Patient</TableHead><TableHead>Drug</TableHead><TableHead>Severity</TableHead><TableHead>Root Cause</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
              <TableBody>
                {incidents.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-sm text-muted-foreground">No incidents</TableCell></TableRow>
                ) : incidents.map(i => (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium">{i.id}</TableCell>
                    <TableCell>{i.patientId}</TableCell>
                    <TableCell>{i.drug}</TableCell>
                    <TableCell><Badge variant={i.severity === "Life-threatening" ? "default" : i.severity === "Severe" ? "secondary" : "outline"}>{i.severity}</Badge></TableCell>
                    <TableCell>{i.rootCause}</TableCell>
                    <TableCell>{i.status}</TableCell>
                    <TableCell className="text-right">{i.status !== "Closed" && <Button size="sm" variant="outline" onClick={()=>closeIncident(i.id)}>Close</Button>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Alerts */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Alerts</CardTitle>
            <CardDescription>AI-detected signal notifications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-auto pr-1">
              {alerts.length === 0 && <div className="text-sm text-muted-foreground">No alerts</div>}
              {alerts.map(a => (
                <div key={a.id} className="p-3 rounded-lg border text-sm flex items-start gap-2">
                  <AlertTriangle className={`h-4 w-4 ${a.level === 'Critical' ? 'text-rose-600' : 'text-amber-600'}`} />
                  <div>{a.msg}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Compliance & Trends */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Compliance Reports & Trends</CardTitle>
          <CardDescription>Generate regulatory packets and monitor trends</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="text-sm font-medium mb-2">30-day ADR Submissions</div>
              {line(trend, "#0ea5e9")}
              <div className="mt-2 flex gap-2"><Button variant="outline"><FileText className="h-4 w-4 mr-2" /> Export Report</Button></div>
            </div>
            <div>
              <div className="text-sm font-medium mb-2">Severity Mix</div>
              <div className="space-y-2">
                {(Object.keys(analytics.bySeverity) as Array<Incident["severity"]>).map(k => {
                  const v = analytics.bySeverity[k];
                  const pct = analytics.total ? Math.round((v/analytics.total)*100) : 0;
                  return (
                    <div key={k} className="flex items-center gap-3 text-sm">
                      <div className="w-28 text-muted-foreground">{k}</div>
                      <div className="flex-1 h-3 bg-muted rounded"><div className="h-3 rounded bg-emerald-500" style={{ width: `${pct}%` }} /></div>
                      <div className="w-8 text-right">{v}</div>
                    </div>
                  );
                })}
              </div>
              <Separator className="my-3" />
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg border"><div className="text-xs text-muted-foreground">Total</div><div className="text-2xl font-semibold">{analytics.total}</div></div>
                <div className="p-3 rounded-lg border"><div className="text-xs text-muted-foreground">Closed</div><div className="text-2xl font-semibold">{analytics.closeRate}%</div></div>
                <div className="p-3 rounded-lg border"><div className="text-xs text-muted-foreground">Last 30d</div><div className="text-2xl font-semibold">{analytics.last30}</div></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
