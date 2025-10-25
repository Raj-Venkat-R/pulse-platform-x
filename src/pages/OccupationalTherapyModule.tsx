import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Hand, ClipboardList, Video, Wrench, Activity, CheckCircle2, Link2 } from "lucide-react";

 type Assessment = {
  id: string;
  patientId: string;
  tool: string; // e.g., FIM, AM-PAC
  score: number;
  notes: string;
};

 type ActivityRow = {
  id: string;
  patientId: string;
  activity: string;
  durationMin: number;
  videoUrl?: string;
  status: "Planned" | "In-Progress" | "Completed";
};

 type Equipment = {
  id: string;
  name: string;
  size?: string;
  assignedTo?: string;
  status: "Available" | "Loaned" | "Maintenance";
};

export default function OccupationalTherapyModule() {
  const [patientId, setPatientId] = useState("");
  const [tool, setTool] = useState("");
  const [score, setScore] = useState("");
  const [note, setNote] = useState("");
  const [assessments, setAssessments] = useState<Assessment[]>([]);

  const [actName, setActName] = useState("");
  const [actDur, setActDur] = useState("");
  const [actVideo, setActVideo] = useState("");
  const [activities, setActivities] = useState<ActivityRow[]>([]);

  const [equipment, setEquipment] = useState<Equipment[]>([
    { id: "EQ-001", name: "Wrist Splint", size: "M", status: "Available" },
    { id: "EQ-102", name: "Adaptive Spoon", status: "Available" },
    { id: "EQ-230", name: "Transfer Board", status: "Loaned", assignedTo: "P-10291" },
  ]);

  const addAssessment = () => {
    if (!patientId || !tool || !score) return;
    setAssessments(prev => [{ id: `AS-${Date.now()}`, patientId, tool, score: Number(score), notes: note }, ...prev]);
    setScore(""); setNote("");
  };

  const addActivity = () => {
    if (!patientId || !actName || !actDur) return;
    setActivities(prev => [{ id: `AC-${Date.now()}`, patientId, activity: actName, durationMin: Number(actDur), videoUrl: actVideo || undefined, status: "Planned" }, ...prev]);
    setActName(""); setActDur(""); setActVideo("");
  };

  const advanceActivity = (id: string) => {
    setActivities(prev => prev.map(a => a.id === id ? { ...a, status: a.status === "Planned" ? "In-Progress" : a.status === "In-Progress" ? "Completed" : "Completed" } : a));
  };

  const toggleEquip = (id: string, assignTo?: string) => {
    setEquipment(prev => prev.map(e => {
      if (e.id !== id) return e;
      if (e.status === "Available" && assignTo) return { ...e, status: "Loaned", assignedTo: assignTo };
      if (e.status === "Loaned") return { ...e, status: "Available", assignedTo: undefined };
      return e;
    }));
  };

  const outcomeSummary = useMemo(() => {
    const byTool: Record<string, number[]> = {};
    assessments.forEach(a => { byTool[a.tool] = byTool[a.tool] ? [...byTool[a.tool], a.score] : [a.score]; });
    const rows = Object.entries(byTool).map(([t, arr]) => ({ tool: t, avg: Math.round(arr.reduce((s, x) => s + x, 0) / arr.length), n: arr.length }));
    return rows;
  }, [assessments]);

  return (
    <div className="w-full px-2 md:px-4 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Hand className="h-8 w-8 text-primary" />
          Occupational Therapy Module
        </h1>
      </div>

      {/* Domain & Outcome */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Domain</CardTitle>
            <CardDescription>HealthTech / Rehabilitation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">Digitized OT workflows integrated with clinical systems.</div>
          </CardContent>
        </Card>
        <Card className="shadow-md md:col-span-2">
          <CardHeader>
            <CardTitle>Expected Outcome</CardTitle>
            <CardDescription>Digital assessment, functional tracking, and EMR sync</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg border"><div className="text-xs text-muted-foreground">Assessments</div><div className="text-2xl font-semibold">{assessments.length}</div></div>
              <div className="p-3 rounded-lg border"><div className="text-xs text-muted-foreground">Activities</div><div className="text-2xl font-semibold">{activities.length}</div></div>
              <div className="p-3 rounded-lg border"><div className="text-xs text-muted-foreground">Equipment</div><div className="text-2xl font-semibold">{equipment.length}</div></div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Input → Processing → Output */}
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
                <div className="flex items-center gap-2"><ClipboardList className="h-4 w-4" /> Therapy assessments</div>
                <div className="flex items-center gap-2"><Activity className="h-4 w-4" /> Activity plans</div>
                <div className="flex items-center gap-2"><Wrench className="h-4 w-4" /> Equipment data</div>
              </div>
            </div>
            <div className="p-4 rounded-lg border">
              <div className="text-sm font-medium mb-2">Processing</div>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Scoring & interpretation</div>
                <div className="flex items-center gap-2"><Activity className="h-4 w-4" /> Session scheduling & tracking</div>
                <div className="flex items-center gap-2"><Wrench className="h-4 w-4" /> Equipment assignment & maintenance</div>
              </div>
            </div>
            <div className="p-4 rounded-lg border">
              <div className="text-sm font-medium mb-2">Output</div>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-2"><ClipboardList className="h-4 w-4" /> Structured outcome reports</div>
                <div className="flex items-center gap-2"><Video className="h-4 w-4" /> Video demonstrations</div>
                <div className="flex items-center gap-2"><Link2 className="h-4 w-4" /> EMR updates</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assessments */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Assessments</CardTitle>
          <CardDescription>Digitized scoring and notes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="pid">Patient ID</Label>
              <Input id="pid" value={patientId} onChange={(e)=>setPatientId(e.target.value)} placeholder="e.g., P-10877" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Tool</Label>
              <Select value={tool} onValueChange={setTool}>
                <SelectTrigger>
                  <SelectValue placeholder="Select tool" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FIM">FIM</SelectItem>
                  <SelectItem value="AM-PAC">AM-PAC</SelectItem>
                  <SelectItem value="BI">Barthel Index</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="score">Score</Label>
              <Input id="score" value={score} onChange={(e)=>setScore(e.target.value)} placeholder="e.g., 85" />
            </div>
            <div className="space-y-2 md:col-span-3">
              <Label htmlFor="note">Notes</Label>
              <Input id="note" value={note} onChange={(e)=>setNote(e.target.value)} placeholder="brief summary" />
            </div>
            <div className="flex items-end">
              <Button onClick={addAssessment}>Add</Button>
            </div>
          </div>

          <div className="mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Tool</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assessments.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-sm text-muted-foreground">No assessments</TableCell></TableRow>
                ) : assessments.map(a => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.patientId}</TableCell>
                    <TableCell>{a.tool}</TableCell>
                    <TableCell>{a.score}</TableCell>
                    <TableCell>{a.notes}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Activities & Video demos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Activity Tracking</CardTitle>
            <CardDescription>Plan, track, and demo activities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="act">Activity</Label>
                <Input id="act" value={actName} onChange={(e)=>setActName(e.target.value)} placeholder="e.g., Transfer training" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dur">Duration (min)</Label>
                <Input id="dur" value={actDur} onChange={(e)=>setActDur(e.target.value)} placeholder="30" />
              </div>
              <div className="space-y-2 md:col-span-3">
                <Label htmlFor="vid">Video URL (optional)</Label>
                <Input id="vid" value={actVideo} onChange={(e)=>setActVideo(e.target.value)} placeholder="https://...mp4" />
              </div>
              <div className="flex items-end">
                <Button onClick={addActivity}>Add</Button>
              </div>
            </div>

            <div className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Activity</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activities.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-sm text-muted-foreground">No activities</TableCell></TableRow>
                  ) : activities.map(a => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.activity}</TableCell>
                      <TableCell>{a.durationMin} min</TableCell>
                      <TableCell>
                        <Badge variant={a.status === "Completed" ? "default" : a.status === "In-Progress" ? "secondary" : "outline"}>{a.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        {a.videoUrl && (
                          <a href={a.videoUrl} target="_blank" rel="noreferrer" className="text-primary text-sm inline-flex items-center gap-1">
                            <Video className="h-4 w-4" /> Demo
                          </a>
                        )}
                        <Button size="sm" variant="outline" onClick={()=>advanceActivity(a.id)}>Advance</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Adaptive Equipment</CardTitle>
            <CardDescription>Assign and manage equipment</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {equipment.map(e => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.name} {e.size ? `(${e.size})` : ""}</TableCell>
                    <TableCell><Badge variant={e.status === "Available" ? "secondary" : e.status === "Loaned" ? "default" : "outline"}>{e.status}</Badge></TableCell>
                    <TableCell>{e.assignedTo || "—"}</TableCell>
                    <TableCell className="text-right">
                      {e.status === "Available" ? (
                        <Button size="sm" onClick={()=>toggleEquip(e.id, patientId || "P-XXXXX")}>Assign</Button>
                      ) : e.status === "Loaned" ? (
                        <Button size="sm" variant="outline" onClick={()=>toggleEquip(e.id)}>Return</Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Structured Outcomes */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Structured Outcome Reports</CardTitle>
          <CardDescription>Scores by assessment tool</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tool</TableHead>
                <TableHead>Average</TableHead>
                <TableHead>Count</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {outcomeSummary.length === 0 ? (
                <TableRow><TableCell colSpan={3} className="text-sm text-muted-foreground">No data</TableCell></TableRow>
              ) : outcomeSummary.map(r => (
                <TableRow key={r.tool}>
                  <TableCell className="font-medium">{r.tool}</TableCell>
                  <TableCell>{r.avg}</TableCell>
                  <TableCell>{r.n}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="mt-4 text-xs text-muted-foreground">Export to EMR as structured JSON and human-readable PDF.</div>
        </CardContent>
      </Card>
    </div>
  );
}
