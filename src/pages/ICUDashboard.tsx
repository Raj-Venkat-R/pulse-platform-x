import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Activity, Bell, AlertTriangle, FileText, RefreshCw, HeartPulse } from "lucide-react";

 type Vitals = {
  time: number;
  hr: number; // bpm
  sbp: number; // mmHg systolic
  dbp: number; // mmHg diastolic
  spo2: number; // %
};

 type AlertItem = { id: string; level: "Info" | "Warning" | "Critical"; message: string };

export default function ICUDashboard() {
  const [patientId, setPatientId] = useState("ICU-01");
  const [streaming, setStreaming] = useState(true);
  const [series, setSeries] = useState<Vitals[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);

  // seed data
  useEffect(() => {
    const now = Date.now();
    const seed: Vitals[] = Array.from({ length: 40 }).map((_, i) => ({
      time: now - (40 - i) * 5000,
      hr: 82 + Math.round(Math.sin(i / 2) * 4),
      sbp: 118 + Math.round(Math.sin(i / 3) * 5),
      dbp: 72 + Math.round(Math.cos(i / 3) * 3),
      spo2: 97 + Math.round(Math.cos(i / 4)),
    }));
    setSeries(seed);
  }, []);

  // live update
  useEffect(() => {
    if (!streaming) return;
    const iv = setInterval(() => {
      setSeries(prev => {
        const last = prev[prev.length - 1] || { hr: 80, sbp: 120, dbp: 70, spo2: 98, time: Date.now() } as Vitals;
        const next: Vitals = {
          time: Date.now(),
          hr: clamp(jitter(last.hr, 1.8), 45, 150),
          sbp: clamp(jitter(last.sbp, 2.5), 70, 200),
          dbp: clamp(jitter(last.dbp, 2.0), 40, 120),
          spo2: clamp(jitter(last.spo2, 0.6), 80, 100),
        };
        const arr = [...prev.slice(-79), next];
        // AI alert rules
        const newAlerts: AlertItem[] = [];
        if (next.spo2 < 90) newAlerts.push({ id: `A-${Date.now()}`, level: "Critical", message: `SpO₂ low (${next.spo2}%) for ${patientId}` });
        if (next.sbp > 160) newAlerts.push({ id: `A-${Date.now()}-bp`, level: "Warning", message: `Hypertensive reading SBP ${next.sbp} mmHg` });
        if (Math.abs((arr[arr.length - 1]?.hr || 0) - (arr[arr.length - 6]?.hr || 0)) > 15) newAlerts.push({ id: `A-${Date.now()}-hr`, level: "Info", message: `HR rapid change to ${next.hr} bpm` });
        if (newAlerts.length) setAlerts(prevA => [...newAlerts, ...prevA].slice(0, 20));
        return arr;
      });
    }, 5000);
    return () => clearInterval(iv);
  }, [streaming, patientId]);

  // scoring (very simplified, illustrative only)
  const score = useMemo(() => {
    const last = series[series.length - 1];
    if (!last) return { APACHE: 0, SOFA: 0 };
    let APACHE = 0;
    APACHE += last.hr > 140 ? 4 : last.hr > 110 ? 3 : last.hr < 50 ? 3 : 0;
    APACHE += last.sbp < 90 ? 4 : last.sbp > 160 ? 2 : 0;
    APACHE += last.spo2 < 90 ? 4 : last.spo2 < 94 ? 2 : 0;
    let SOFA = 0;
    SOFA += last.sbp < 90 ? 3 : 0; // proxy for vasoactive
    SOFA += last.spo2 < 90 ? 2 : 0; // proxy for PaO2/FiO2
    return { APACHE, SOFA };
  }, [series]);

  const last = series[series.length - 1];

  const pushToEMR = () => {
    setAlerts(prev => [{ id: `EMR-${Date.now()}`, level: "Info", message: `Pushed latest chart to EMR for ${patientId}` }, ...prev]);
  };

  const spark = (data: number[], color: string) => {
    const max = Math.max(...data, 1);
    const min = Math.min(...data, 0);
    const h = 72;
    const w = 240;
    const points = data.map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / Math.max(1, max - min)) * (h - 8) - 4;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");
    return (
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-20">
        <polyline fill="none" stroke={color} strokeWidth="2" points={points} />
      </svg>
    );
  };

  return (
    <div className="w-full px-2 md:px-4 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <HeartPulse className="h-8 w-8 text-primary" />
          ICU Digital Monitoring & Documentation
        </h1>
      </div>

      {/* Controls + Status */}
      <Card className="shadow-md bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-slate-100 border-slate-700">
        <CardHeader>
          <CardTitle className="text-slate-100">Patient & Stream</CardTitle>
          <CardDescription className="text-slate-300">Live vitals, AI alerts, EMR sync</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="pid" className="text-slate-200">Patient ID</Label>
              <Input id="pid" value={patientId} onChange={(e)=>setPatientId(e.target.value)} className="bg-slate-800 border-slate-600 text-slate-100 placeholder:text-slate-400" />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-200">Stream</Label>
              <div className="flex gap-2">
                <Button size="sm" variant={streaming ? "default" : "outline"} onClick={()=>setStreaming(true)} className="bg-emerald-600 hover:bg-emerald-500">Start</Button>
                <Button size="sm" variant={!streaming ? "default" : "outline"} onClick={()=>setStreaming(false)} className="bg-rose-600 hover:bg-rose-500">Stop</Button>
                <Button size="sm" variant="outline" onClick={()=>setSeries([])} className="border-slate-500 text-slate-200"><RefreshCw className="h-4 w-4 mr-1" /> Reset</Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-200">Auto-Scoring</Label>
              <div className="flex items-center gap-3">
                <Badge className="bg-sky-600">APACHE {score.APACHE}</Badge>
                <Badge className="bg-purple-600">SOFA {score.SOFA}</Badge>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-200">EMR</Label>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={pushToEMR} className="border-slate-500 text-slate-200"><FileText className="h-4 w-4 mr-1" /> Push Update</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Futuristic vitals tiles */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="shadow-md bg-slate-900 text-slate-100 border-slate-700">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Heart Rate</CardTitle><CardDescription className="text-slate-300">bpm</CardDescription></CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{last?.hr ?? "—"}</div>
            <div className="mt-2">{spark(series.map(s=>s.hr).slice(-30), "#22d3ee")}</div>
            <StatusLight ok={(last?.hr ?? 0) >= 50 && (last?.hr ?? 0) <= 120} />
          </CardContent>
        </Card>
        <Card className="shadow-md bg-slate-900 text-slate-100 border-slate-700">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Blood Pressure</CardTitle><CardDescription className="text-slate-300">mmHg</CardDescription></CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{last ? `${last.sbp}/${last.dbp}` : "—"}</div>
            <div className="mt-2">{spark(series.map(s=>s.sbp).slice(-30), "#60a5fa")}</div>
            <StatusLight ok={(last?.sbp ?? 0) >= 90 && (last?.sbp ?? 0) <= 160} />
          </CardContent>
        </Card>
        <Card className="shadow-md bg-slate-900 text-slate-100 border-slate-700">
          <CardHeader className="pb-2"><CardTitle className="text-sm">SpO₂</CardTitle><CardDescription className="text-slate-300">%</CardDescription></CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{last?.spo2 ?? "—"}</div>
            <div className="mt-2">{spark(series.map(s=>s.spo2).slice(-30), "#34d399")}</div>
            <StatusLight ok={(last?.spo2 ?? 0) >= 94} />
          </CardContent>
        </Card>
        <Card className="shadow-md bg-slate-900 text-slate-100 border-slate-700">
          <CardHeader className="pb-2"><CardTitle className="text-sm">AI Alerts</CardTitle><CardDescription className="text-slate-300">Real-time</CardDescription></CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-28 overflow-auto pr-1">
              {alerts.length === 0 && <div className="text-sm text-slate-400">No alerts</div>}
              {alerts.map(a => (
                <div key={a.id} className="text-xs flex items-start gap-2 p-2 rounded border border-slate-700 bg-slate-800">
                  {a.level === "Critical" ? <AlertTriangle className="h-4 w-4 text-rose-500" /> : <Bell className="h-4 w-4 text-amber-400" />}
                  <div>
                    <div className="font-medium">{a.level}</div>
                    <div className="text-slate-300">{a.message}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Digital charting */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Digital Charting</CardTitle>
          <CardDescription>Structured documentation with trend graphs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="text-sm font-medium">Trend: HR / BP / SpO₂</div>
              <div className="rounded-lg border p-3">
                <div className="grid md:grid-cols-3 gap-3">
                  <div>{spark(series.map(s=>s.hr).slice(-60), "#0ea5e9")}</div>
                  <div>{spark(series.map(s=>s.sbp).slice(-60), "#22c55e")}</div>
                  <div>{spark(series.map(s=>s.spo2).slice(-60), "#f59e0b")}</div>
                </div>
              </div>
            </div>
            <div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>HR</TableHead>
                    <TableHead>BP</TableHead>
                    <TableHead>SpO₂</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {series.slice(-8).reverse().map(v => (
                    <TableRow key={v.time}>
                      <TableCell className="font-medium">{new Date(v.time).toLocaleTimeString()}</TableCell>
                      <TableCell>{v.hr}</TableCell>
                      <TableCell>{v.sbp}/{v.dbp}</TableCell>
                      <TableCell>{v.spo2}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-3 flex gap-2">
                <Button variant="outline"><FileText className="h-4 w-4 mr-2" /> Generate Report</Button>
                <Button variant="outline" onClick={pushToEMR}><Activity className="h-4 w-4 mr-2" /> Update EMR</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function jitter(v: number, range: number) { return v + (Math.random() * 2 - 1) * range; }
function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)); }

function StatusLight({ ok }: { ok: boolean }) {
  return (
    <div className="mt-2 flex items-center gap-2">
      <span className={`h-2.5 w-2.5 rounded-full ${ok ? "bg-emerald-500" : "bg-rose-500"}`} />
      <span className="text-xs text-slate-300">{ok ? "Stable" : "Attention"}</span>
    </div>
  );
}
