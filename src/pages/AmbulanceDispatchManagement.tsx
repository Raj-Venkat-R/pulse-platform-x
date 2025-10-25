import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
// Lightweight internal visuals (no external chart lib required)
import { MapPin, Navigation, Activity, AlertCircle, Phone, HeartPulse, Route, Clock } from "lucide-react";
import { addAmbulanceDispatchFirestore, addAlertFirestore, subscribeAmbulanceDispatchesFirestore, updateAmbulanceDispatchFirestore } from "@/lib/firebase";

 type Dispatch = {
  id: string;
  callId: string;
  caller: string;
  coords: { lat: number; lng: number };
  severity: "Low" | "Moderate" | "High" | "Critical";
  ambulance: string;
  etaMin: number;
  hospital: string;
  status: "Assigned" | "Enroute" | "Arrived" | "Completed";
};

const hospitals = ["City General", "Metro Care", "St. Mary's", "Apex Trauma Center"];
const ambulances = ["AMB-101", "AMB-204", "AMB-317", "AMB-422"];

export default function AmbulanceDispatchManagement() {
  const [callId, setCallId] = useState("");
  const [caller, setCaller] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [severity, setSeverity] = useState<Dispatch["severity"] | "">("");
  const [hospital, setHospital] = useState("");

  const [dispatches, setDispatches] = useState<Dispatch[]>([]);
  const [alerts, setAlerts] = useState<{ id: string; message: string; type: "ETA" | "Status" }[]>([]);

  const addAlert = (message: string, type: "ETA" | "Status" = "ETA") =>
    setAlerts(prev => [{ id: `AL-${Date.now()}`, message, type }, ...prev]);

  const dispatchNow = async () => {
    if (!callId || !caller || !lat || !lng || !severity || !hospital) return;
    const amb = ambulances[Math.floor(Math.random() * ambulances.length)];
    const eta = Math.max(4, Math.round(Math.random() * 18));
    const payload = {
      callId,
      caller,
      coords: { lat: Number(lat), lng: Number(lng) },
      severity: severity as Dispatch["severity"],
      ambulance: amb,
      etaMin: eta,
      hospital,
      status: "Enroute" as const,
    };
    const newId = await addAmbulanceDispatchFirestore(payload);
    addAlert(`ETA ${eta} min for ${amb} to ${hospital}`, "ETA");
    // Also persist alert for global visibility
    await addAlertFirestore({ message: `ETA ${eta} min for ${amb} to ${hospital}`, type: "ETA", scope: "ambulance_dispatch" });
    setCallId(""); setCaller(""); setLat(""); setLng(""); setSeverity(""); setHospital("");
  };

  const tickEtas = async () => {
    // Decrement ETA for all enroute dispatches (demo). In real life, driven by telemetry.
    const tasks = dispatches
      .filter(d => d.status === "Enroute" && d.etaMin > 0)
      .map(async d => {
        const nextEta = Math.max(0, d.etaMin - 1);
        const nextStatus = nextEta === 0 ? "Arrived" : d.status;
        await updateAmbulanceDispatchFirestore(d.id, { etaMin: nextEta, status: nextStatus });
        if (nextEta === 0) {
          addAlert(`${d.ambulance} arrived at ${d.hospital}`, "Status");
          await addAlertFirestore({ message: `${d.ambulance} arrived at ${d.hospital}`, type: "Status", scope: "ambulance_dispatch" });
        }
      });
    await Promise.all(tasks);
  };

  const completeArrival = async (id: string) => {
    await updateAmbulanceDispatchFirestore(id, { status: "Completed" });
  };

  useEffect(() => {
    const unsub = subscribeAmbulanceDispatchesFirestore((items) => {
      // items: { id, callId, ... }
      setDispatches(items as Dispatch[]);
    });
    return () => unsub();
  }, []);

  const perfData = useMemo(() => {
    const byEta = [
      { name: "<5m", value: dispatches.filter(d => d.etaMin <= 5 && d.status !== "Assigned").length },
      { name: "6-10m", value: dispatches.filter(d => d.etaMin > 5 && d.etaMin <= 10 && d.status !== "Assigned").length },
      { name: "11-15m", value: dispatches.filter(d => d.etaMin > 10 && d.etaMin <= 15 && d.status !== "Assigned").length },
      { name: ">15m", value: dispatches.filter(d => d.etaMin > 15 && d.status !== "Assigned").length },
    ];
    const respTrend = Array.from({ length: 7 }).map((_, i) => ({ day: `D${i+1}` , rt: Math.round(6 + Math.random()*8) }));
    const maxEtaCount = Math.max(1, ...byEta.map(b => b.value));
    const maxRt = Math.max(1, ...respTrend.map(r => r.rt));
    return { byEta, respTrend, maxEtaCount, maxRt };
  }, [dispatches]);

  return (
    <div className="w-full px-2 md:px-4 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Navigation className="h-8 w-8 text-primary" />
          Ambulance Dispatch Management
        </h1>
      </div>

      {/* Input | Processing | Output (compact) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="shadow-sm">
          <CardHeader className="py-3">
            <CardTitle className="text-base">Input</CardTitle>
            <CardDescription>Emergency call, GPS, vitals</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-2"><Phone className="h-4 w-4" /> Call ID</div>
              <div className="flex items-center gap-2"><MapPin className="h-4 w-4" /> Coordinates</div>
              <div className="flex items-center gap-2"><HeartPulse className="h-4 w-4" /> Vitals</div>
              <div className="flex items-center gap-2"><Activity className="h-4 w-4" /> Severity</div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="py-3">
            <CardTitle className="text-base">Processing</CardTitle>
            <CardDescription>Dispatch, ETA, allocation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-2"><Route className="h-4 w-4" /> Optimal routing</div>
              <div className="flex items-center gap-2"><Clock className="h-4 w-4" /> ETA calc</div>
              <div className="flex items-center gap-2"><Navigation className="h-4 w-4" /> Ambulance assignment</div>
              <div className="flex items-center gap-2"><AlertCircle className="h-4 w-4" /> Alerts</div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="py-3">
            <CardTitle className="text-base">Output</CardTitle>
            <CardDescription>Alerts, tracking, logs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-2"><AlertCircle className="h-4 w-4" /> Hospital alerts</div>
              <div className="flex items-center gap-2"><Navigation className="h-4 w-4" /> Live tracking</div>
              <div className="flex items-center gap-2"><Activity className="h-4 w-4" /> Performance</div>
              <div className="flex items-center gap-2"><Route className="h-4 w-4" /> Dispatch logs</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* New Dispatch */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>New Dispatch</CardTitle>
          <CardDescription>Capture call, location, and severity to dispatch</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="call">Call ID</Label>
              <Input id="call" value={callId} onChange={(e)=>setCallId(e.target.value)} placeholder="e.g., CALL-8891" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="caller">Caller Phone</Label>
              <Input id="caller" value={caller} onChange={(e)=>setCaller(e.target.value)} placeholder="e.g., +91-98xxxxxxx" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lat">Lat</Label>
              <Input id="lat" value={lat} onChange={(e)=>setLat(e.target.value)} placeholder="e.g., 12.97" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lng">Lng</Label>
              <Input id="lng" value={lng} onChange={(e)=>setLng(e.target.value)} placeholder="e.g., 77.59" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="space-y-2">
              <Label>Severity</Label>
              <Select value={severity} onValueChange={(v)=>setSeverity(v as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Moderate">Moderate</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Destination Hospital</Label>
              <Select value={hospital} onValueChange={(v)=>setHospital(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select hospital" />
                </SelectTrigger>
                <SelectContent>
                  {hospitals.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <Button onClick={dispatchNow}>Dispatch</Button>
            <Button variant="outline" onClick={tickEtas}>Simulate Tick (-1 ETA)</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map Illustration + Active Fleet */}
        <Card className="shadow-md lg:col-span-2 overflow-hidden">
          <CardHeader>
            <CardTitle>Live Map (Illustration)</CardTitle>
            <CardDescription>Route preview with current ETAs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative h-72 w-full rounded-lg border bg-gradient-to-br from-sky-50 to-white overflow-hidden">
              {/* grid */}
              <div className="absolute inset-0 opacity-40" style={{backgroundImage:"linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px)", backgroundSize:"24px 24px"}} />
              {/* sample route line */}
              <svg className="absolute inset-0 w-full h-full">
                <polyline points="40,220 140,160 240,120 340,90 440,70 540,60" fill="none" stroke="#38bdf8" strokeWidth="3" strokeDasharray="6 6" />
              </svg>
              {/* markers */}
              <div className="absolute left-[36px] top-[210px] h-3 w-3 rounded-full bg-emerald-500 shadow" title="Ambulance" />
              <div className="absolute left-[536px] top-[52px] h-3 w-3 rounded-full bg-rose-500 shadow" title="Hospital" />
              {/* legend */}
              <div className="absolute bottom-2 left-2 flex items-center gap-3 text-xs bg-white/80 backdrop-blur px-2 py-1 rounded border">
                <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Ambulance</span>
                <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500" /> Hospital</span>
                <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded bg-sky-400" /> Route</span>
              </div>
            </div>
            <Separator className="my-4" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {dispatches.slice(0,4).map(d => (
                <div key={d.id} className="p-3 rounded-lg border flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{d.ambulance} → {d.hospital}</div>
                    <div className="text-xs text-muted-foreground">ETA {d.etaMin}m • {d.coords.lat.toFixed(2)},{d.coords.lng.toFixed(2)}</div>
                  </div>
                  <Badge variant={d.status === "Completed" ? "default" : d.status === "Arrived" ? "secondary" : "outline"}>{d.status}</Badge>
                </div>
              ))}
              {dispatches.length === 0 && (
                <div className="text-sm text-muted-foreground">No active dispatches</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Alerts */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>ETA Alerts</CardTitle>
            <CardDescription>Hospital and dispatcher notifications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.length === 0 && <div className="text-sm text-muted-foreground">No alerts</div>}
              {alerts.map(a => (
                <div key={a.id} className="p-3 rounded-lg border">
                  <div className="text-sm font-medium flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-600" /> {a.type}
                  </div>
                  <div className="text-sm mt-1">{a.message}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dispatcher dashboard and performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Dispatcher Dashboard</CardTitle>
            <CardDescription>Active and recent dispatches</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Call</TableHead>
                  <TableHead>Ambulance</TableHead>
                  <TableHead>Hospital</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>ETA</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dispatches.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-sm text-muted-foreground">No dispatches</TableCell></TableRow>
                ) : dispatches.map(d => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.callId}</TableCell>
                    <TableCell>{d.ambulance}</TableCell>
                    <TableCell>{d.hospital}</TableCell>
                    <TableCell><Badge variant={d.severity === "Critical" ? "default" : d.severity === "High" ? "secondary" : "outline"}>{d.severity}</Badge></TableCell>
                    <TableCell>{d.etaMin} min</TableCell>
                    <TableCell>{d.status}</TableCell>
                    <TableCell className="text-right">
                      {d.status === "Arrived" && <Button size="sm" onClick={()=>completeArrival(d.id)}>Complete</Button>}
                      {d.status !== "Arrived" && d.status !== "Completed" && <Button size="sm" variant="outline" onClick={tickEtas}>-1 ETA</Button>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Performance Reports</CardTitle>
            <CardDescription>Response time and ETA distribution</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Sparkline for response time */}
            <div>
              <div className="text-sm font-medium mb-1">Response Time (min)</div>
              <svg viewBox="0 0 300 80" className="w-full h-24">
                <polyline
                  fill="none"
                  stroke="#0ea5e9"
                  strokeWidth="2"
                  points={perfData.respTrend
                    .map((p, i) => {
                      const x = (i / (perfData.respTrend.length - 1)) * 300;
                      const y = 80 - (p.rt / perfData.maxRt) * 70 - 5;
                      return `${x.toFixed(1)},${y.toFixed(1)}`;
                    })
                    .join(" ")}
                />
              </svg>
              <div className="flex justify-between text-xs text-muted-foreground">
                {perfData.respTrend.map((p) => (
                  <span key={p.day}>{p.day}</span>
                ))}
              </div>
            </div>

            {/* Bars for ETA distribution */}
            <div>
              <div className="text-sm font-medium mb-2">ETA Distribution</div>
              <div className="space-y-2">
                {perfData.byEta.map((b) => (
                  <div key={b.name} className="flex items-center gap-3 text-sm">
                    <div className="w-16 text-muted-foreground">{b.name}</div>
                    <div className="flex-1 h-3 bg-muted rounded">
                      <div
                        className="h-3 rounded bg-emerald-500"
                        style={{ width: `${(b.value / perfData.maxEtaCount) * 100}%` }}
                      />
                    </div>
                    <div className="w-8 text-right">{b.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
