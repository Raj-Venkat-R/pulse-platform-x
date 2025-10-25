import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Navigation, Route, MapPin, Clock, Users, AlertCircle } from "lucide-react";

 type Porter = {
  id: string;
  name: string;
  loc: string;
  available: boolean;
};

 type Request = {
  id: string;
  patientId: string;
  from: string;
  to: string;
  priority: "Routine" | "Urgent" | "Stat";
  porter?: string;
  etaMin?: number;
  status: "Queued" | "Assigned" | "Enroute" | "Completed";
  startAt?: number;
  endAt?: number;
};

const areas = [
  { code: "ER", label: "Emergency" },
  { code: "RAD", label: "Radiology" },
  { code: "OT", label: "Operating Theatre" },
  { code: "ICU", label: "ICU" },
  { code: "WARD-A", label: "Ward A" },
  { code: "WARD-B", label: "Ward B" },
  { code: "LAB", label: "Lab" },
];

const coords: Record<string, [number, number]> = {
  ER: [40, 210], RAD: [520, 90], OT: [420, 70], ICU: [360, 60], "WARD-A": [120, 140], "WARD-B": [220, 160], LAB: [480, 130],
};

export default function PatientPorterSystem() {
  const [patientId, setPatientId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [priority, setPriority] = useState<Request["priority"] | "">("");

  const [porters, setPorters] = useState<Porter[]>([
    { id: "PT-01", name: "Rahul", loc: "ER", available: true },
    { id: "PT-02", name: "Meena", loc: "WARD-A", available: true },
    { id: "PT-03", name: "Karthik", loc: "RAD", available: false },
    { id: "PT-04", name: "Fatima", loc: "LAB", available: true },
  ]);

  const [requests, setRequests] = useState<Request[]>([]);
  const [alerts, setAlerts] = useState<{ id: string; msg: string; type: "ETA" | "SLA" }[]>([]);

  const dist = (a: string, b: string) => {
    const A = coords[a]; const B = coords[b]; if (!A || !B) return 999;
    const dx = A[0] - B[0]; const dy = A[1] - B[1];
    return Math.round(Math.sqrt(dx*dx + dy*dy));
  };

  const allocate = () => {
    if (!patientId || !from || !to || !priority) return;
    const id = `REQ-${Math.random().toString(36).slice(2,7).toUpperCase()}`;
    // smart allocation: nearest available porter to 'from'; urgent/stat prefer availability
    const available = porters.filter(p => p.available);
    const chosen = available.sort((p1,p2)=>dist(p1.loc, from) - dist(p2.loc, from))[0] || porters.sort((p1,p2)=>dist(p1.loc, from) - dist(p2.loc, from))[0];
    const eta = Math.max(2, Math.round(dist(chosen?.loc || from, from) / 60));
    setRequests(prev => [{ id, patientId, from, to, priority: priority as Request["priority"], porter: chosen?.name, etaMin: eta, status: chosen ? "Assigned" : "Queued", startAt: Date.now() }, ...prev]);
    if (chosen) {
      setPorters(prev => prev.map(p => p.id === chosen.id ? { ...p, available: false, loc: from } : p));
      setAlerts(prev => [{ id: `AL-${Date.now()}`, msg: `ETA ${eta} min for ${chosen.name} to ${from}`, type: "ETA" }, ...prev]);
    }
    setPatientId(""); setFrom(""); setTo(""); setPriority("");
  };

  const advance = (id: string) => {
    setRequests(prev => prev.map(r => {
      if (r.id !== id) return r;
      if (r.status === "Assigned") return { ...r, status: "Enroute" };
      if (r.status === "Enroute") return { ...r, status: "Completed", endAt: Date.now() };
      return r;
    }));
    // free porters when request completes
    const r = requests.find(x => x.id === id);
    if (r && r.status === "Enroute") {
      setPorters(prev => prev.map(p => p.name === r.porter ? { ...p, available: true, loc: r.to } : p));
      const totalMin = Math.max(1, Math.round(((Date.now()) - (r.startAt || Date.now()))/60000));
      const slaOk = totalMin <= (r.priority === "Stat" ? 10 : r.priority === "Urgent" ? 20 : 40);
      setAlerts(prev => [{ id: `AL-${Date.now()}`, msg: `${r.patientId} transport ${slaOk ? "within" : "exceeded"} SLA (${totalMin}m)`, type: "SLA" }, ...prev]);
    }
  };

  const sla = useMemo(() => {
    const done = requests.filter(r => r.status === "Completed");
    const times = done.map(r => Math.max(1, Math.round(((r.endAt || 0) - (r.startAt || 0))/60000)));
    const avg = times.length ? Math.round(times.reduce((a,b)=>a+b,0)/times.length) : 0;
    const within = done.filter(r => {
      const t = Math.max(1, Math.round(((r.endAt || 0) - (r.startAt || 0))/60000));
      const limit = r.priority === "Stat" ? 10 : r.priority === "Urgent" ? 20 : 40;
      return t <= limit;
    }).length;
    const pct = done.length ? Math.round(within/done.length*100) : 0;
    return { avg, pct, count: done.length };
  }, [requests]);

  return (
    <div className="w-full px-2 md:px-4 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Users className="h-8 w-8 text-primary" />
          Patient Porter System
        </h1>
        <p className="text-muted-foreground mt-1">Request and track internal patient transport with smart allocation and SLA analytics.</p>
      </div>

      {/* Intake */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Request Intake</CardTitle>
          <CardDescription>Create a transport request</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pid">Patient ID</Label>
              <Input id="pid" value={patientId} onChange={(e)=>setPatientId(e.target.value)} placeholder="e.g., P-12011" />
            </div>
            <div className="space-y-2">
              <Label>From</Label>
              <Select value={from} onValueChange={setFrom}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{areas.map(a => <SelectItem key={a.code} value={a.code}>{a.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>To</Label>
              <Select value={to} onValueChange={setTo}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{areas.map(a => <SelectItem key={a.code} value={a.code}>{a.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v)=>setPriority(v as any)}>
                <SelectTrigger><SelectValue placeholder="Routine/Urgent/Stat" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Routine">Routine</SelectItem>
                  <SelectItem value="Urgent">Urgent</SelectItem>
                  <SelectItem value="Stat">Stat</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={allocate}><Route className="h-4 w-4 mr-2" /> Allocate</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map Illustration + Active */}
        <Card className="shadow-md lg:col-span-2 overflow-hidden">
          <CardHeader>
            <CardTitle>Live Tracking</CardTitle>
            <CardDescription>Real-time location and routes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative h-72 w-full rounded-lg border bg-gradient-to-br from-slate-50 to-white overflow-hidden">
              {/* grid */}
              <div className="absolute inset-0 opacity-50" style={{backgroundImage:"linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px)", backgroundSize:"24px 24px"}} />
              {/* sample paths */}
              <svg className="absolute inset-0 w-full h-full">
                <polyline points="40,210 120,140 220,160 360,60" fill="none" stroke="#0ea5e9" strokeWidth="3" strokeDasharray="6 6" />
              </svg>
              {/* markers for areas */}
              {areas.map(a => (
                <div key={a.code} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: coords[a.code][0], top: coords[a.code][1] }}>
                  <div className="px-2 py-1 rounded bg-white/90 border text-xs shadow">{a.label}</div>
                </div>
              ))}
              {/* legend */}
              <div className="absolute bottom-2 left-2 flex items-center gap-3 text-xs bg-white/90 backdrop-blur px-2 py-1 rounded border">
                <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-sky-500" /> Route</span>
                <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Porter</span>
              </div>
            </div>
            <Separator className="my-4" />
            <div className="space-y-2">
              {requests.slice(0,4).map(r => (
                <div key={r.id} className="p-3 rounded-lg border flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{r.patientId} • {r.from} → {r.to}</div>
                    <div className="text-xs text-muted-foreground">{r.porter || "—"} • ETA {r.etaMin || "—"}m • {r.priority}</div>
                  </div>
                  <Badge variant={r.status === "Completed" ? "default" : r.status === "Enroute" ? "secondary" : "outline"}>{r.status}</Badge>
                </div>
              ))}
              {requests.length === 0 && <div className="text-sm text-muted-foreground">No active requests</div>}
            </div>
          </CardContent>
        </Card>

        {/* Alerts */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>ETA and SLA updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.length === 0 && <div className="text-sm text-muted-foreground">No notifications</div>}
              {alerts.map(a => (
                <div key={a.id} className="p-3 rounded-lg border flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                  <div className="text-sm">{a.msg}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Requests board & SLA analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Requests Board</CardTitle>
            <CardDescription>Track and advance transports</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Request</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>From → To</TableHead>
                  <TableHead>Porter</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-sm text-muted-foreground">No requests</TableCell></TableRow>
                ) : requests.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.id}</TableCell>
                    <TableCell>{r.patientId}</TableCell>
                    <TableCell>{r.from} → {r.to}</TableCell>
                    <TableCell>{r.porter || "—"}</TableCell>
                    <TableCell>{r.status}</TableCell>
                    <TableCell className="text-right">
                      {r.status !== "Completed" && <Button size="sm" variant="outline" onClick={()=>advance(r.id)}>Advance</Button>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>SLA Reports & Analytics</CardTitle>
            <CardDescription>Performance metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="p-3 rounded-lg border">
                <div className="text-xs text-muted-foreground">Completed</div>
                <div className="text-2xl font-semibold">{sla.count}</div>
              </div>
              <div className="p-3 rounded-lg border">
                <div className="text-xs text-muted-foreground">Avg Time</div>
                <div className="text-2xl font-semibold">{sla.avg}m</div>
              </div>
              <div className="p-3 rounded-lg border">
                <div className="text-xs text-muted-foreground">Within SLA</div>
                <div className="text-2xl font-semibold">{sla.pct}%</div>
              </div>
            </div>
            <div>
              <div className="text-sm font-medium mb-2">SLA Distribution</div>
              <div className="space-y-2">
                {["Stat","Urgent","Routine"].map((k)=>{
                  const total = requests.filter(r=>r.status==="Completed" && r.priority===k).length;
                  const ok = requests.filter(r=>r.status==="Completed" && r.priority===k).filter(r => {
                    const t = Math.max(1, Math.round(((r.endAt||0)-(r.startAt||0))/60000));
                    const limit = r.priority === "Stat" ? 10 : r.priority === "Urgent" ? 20 : 40;
                    return t <= limit;
                  }).length;
                  const pct = total ? Math.round(ok/total*100) : 0;
                  return (
                    <div key={k} className="flex items-center gap-3 text-sm">
                      <div className="w-20 text-muted-foreground">{k}</div>
                      <div className="flex-1 h-3 bg-muted rounded">
                        <div className="h-3 rounded bg-emerald-500" style={{ width: `${pct}%` }} />
                      </div>
                      <div className="w-10 text-right">{pct}%</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
