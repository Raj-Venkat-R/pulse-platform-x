import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Activity, Calendar, ClipboardList, FileText, Clock } from "lucide-react";

 type Booking = {
  id: string;
  patientId: string;
  therapist: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  type: string; // e.g., Neuro, Ortho
  status: "Booked" | "Completed" | "Cancelled";
};

 type ExerciseLog = {
  id: string;
  patientId: string;
  date: string;
  exercise: string;
  sets: number;
  reps: number;
  pain: number; // 0-10
};

const therapists = ["Dr. Rao", "Dr. Mehta", "Dr. Kapoor", "Dr. Bose"];
const sessionTypes = ["Orthopedic", "Neurological", "Pediatric", "Cardio-Pulmonary"];

export default function PhysioScheduling() {
  const [patientId, setPatientId] = useState("");
  const [therapist, setTherapist] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [sessionType, setSessionType] = useState("");

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [logs, setLogs] = useState<ExerciseLog[]>([]);

  const [exName, setExName] = useState("");
  const [exSets, setExSets] = useState("");
  const [exReps, setExReps] = useState("");
  const [exPain, setExPain] = useState("");

  const weekDays = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

  const suggestSlot = () => {
    // naive suggestion: next 30-min slot today between 09:00-17:00 not in bookings for therapist
    const t = therapist || therapists[0];
    const d = date || new Date().toISOString().slice(0,10);
    const dayBookings = bookings.filter(b => b.therapist === t && b.date === d).map(b => b.time);
    const times = ["09:00","09:30","10:00","10:30","11:00","11:30","12:00","14:00","14:30","15:00","15:30","16:00","16:30"];
    const free = times.find(tm => !dayBookings.includes(tm));
    if (free) { setTherapist(t); setDate(d); setTime(free); }
  };

  const book = () => {
    if (!patientId || !therapist || !date || !time || !sessionType) return;
    const id = `PT-${Math.random().toString(36).slice(2,7).toUpperCase()}`;
    setBookings(prev => [{ id, patientId, therapist, date, time, type: sessionType, status: "Booked" }, ...prev]);
  };

  const addLog = () => {
    if (!patientId || !exName || !exSets || !exReps || !exPain) return;
    setLogs(prev => [{ id: `LG-${Date.now()}`, patientId, date: new Date().toISOString().slice(0,10), exercise: exName, sets: Number(exSets), reps: Number(exReps), pain: Number(exPain) }, ...prev]);
    setExName(""); setExSets(""); setExReps(""); setExPain("");
  };

  const scheduleMatrix = useMemo(() => {
    // Build a simple matrix for current week based on bookings
    const start = new Date();
    const dayIndex = (start.getDay() + 6) % 7; // Mon=0
    start.setDate(start.getDate() - dayIndex);
    const days = Array.from({length:7}).map((_,i)=>{
      const d = new Date(start);
      d.setDate(start.getDate()+i);
      const key = d.toISOString().slice(0,10);
      return { label: weekDays[i], key };
    });
    const slots = ["09:00","10:00","11:00","14:00","15:00","16:00"];
    return { days, slots };
  }, [bookings]);

  const progress = useMemo(() => {
    const byDay: Record<string, number> = {};
    logs.forEach(l => { byDay[l.date] = (byDay[l.date]||0) + l.sets*l.reps; });
    const total = Object.values(byDay).reduce((a,b)=>a+b,0);
    const avgPain = logs.length ? Math.round(logs.reduce((a,b)=>a+b.pain,0)/logs.length) : 0;
    return { totalReps: total, avgPain };
  }, [logs]);

  const report = useMemo(() => {
    const last7 = Array.from({length:7}).map((_,i)=>{
      const d = new Date(); d.setDate(d.getDate()-i); return d.toISOString().slice(0,10);
    });
    const entries = logs.filter(l => last7.includes(l.date));
    const total = entries.reduce((s,l)=>s + l.sets*l.reps, 0);
    const pain = entries.length ? Math.round(entries.reduce((s,l)=>s + l.pain,0)/entries.length) : 0;
    return `Patient ${patientId || "—"}: ${entries.length} sessions, ${total} reps total, avg pain ${pain}/10.`;
  }, [logs, patientId]);

  return (
    <div className="w-full px-2 md:px-4 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Activity className="h-8 w-8 text-primary" />
          Physiotherapy Record & Scheduling System
        </h1>
      </div>

      {/* Smart Appointment Booking */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Smart Appointment Booking</CardTitle>
          <CardDescription>Suggest next available slot and book</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="pid">Patient ID</Label>
              <Input id="pid" value={patientId} onChange={(e)=>setPatientId(e.target.value)} placeholder="e.g., P-10991" />
            </div>
            <div className="space-y-2">
              <Label>Therapist</Label>
              <Select value={therapist} onValueChange={setTherapist}>
                <SelectTrigger>
                  <SelectValue placeholder="Select therapist" />
                </SelectTrigger>
                <SelectContent>
                  {therapists.map(t=> <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" value={date} onChange={(e)=>setDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="time">Time</Label>
              <Input id="time" type="time" value={time} onChange={(e)=>setTime(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Session Type</Label>
              <Select value={sessionType} onValueChange={setSessionType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {sessionTypes.map(t=> <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Button variant="outline" onClick={suggestSlot}><Clock className="h-4 w-4 mr-2" /> Suggest</Button>
              <Button onClick={book}>Book</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Schedule View */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Schedule</CardTitle>
          <CardDescription>Week view for therapists</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="min-w-[720px] grid" style={{gridTemplateColumns: `120px repeat(${scheduleMatrix.days.length}, 1fr)`}}>
              <div />
              {scheduleMatrix.days.map(d => (
                <div key={d.key} className="text-sm font-medium text-center pb-2">{d.label}<div className="text-xs text-muted-foreground">{d.key.slice(5)}</div></div>
              ))}
              {scheduleMatrix.slots.map(slot => (
                <>
                  <div key={`label-${slot}`} className="text-xs text-muted-foreground flex items-center">{slot}</div>
                  {scheduleMatrix.days.map(day => {
                    const cell = bookings.filter(b => b.date === day.key && b.time.startsWith(slot.slice(0,2)));
                    return (
                      <div key={`${day.key}-${slot}`} className="h-12 border rounded-md p-1 overflow-hidden">
                        <div className="flex flex-col gap-1">
                          {cell.slice(0,2).map(b => (
                            <div key={b.id} className="px-2 py-0.5 rounded text-xs bg-primary/10 text-primary truncate">
                              {b.time} • {b.patientId} • {b.therapist}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Exercise Performance Tracking */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Exercise Tracking</CardTitle>
            <CardDescription>Log sets, reps, and pain score</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="ex">Exercise</Label>
                <Input id="ex" value={exName} onChange={(e)=>setExName(e.target.value)} placeholder="e.g., SLR" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sets">Sets</Label>
                <Input id="sets" value={exSets} onChange={(e)=>setExSets(e.target.value)} placeholder="3" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reps">Reps</Label>
                <Input id="reps" value={exReps} onChange={(e)=>setExReps(e.target.value)} placeholder="12" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pain">Pain (0-10)</Label>
                <Input id="pain" value={exPain} onChange={(e)=>setExPain(e.target.value)} placeholder="2" />
              </div>
              <div className="flex items-end">
                <Button onClick={addLog}>Add</Button>
              </div>
            </div>
            <div className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Exercise</TableHead>
                    <TableHead>Sets×Reps</TableHead>
                    <TableHead>Pain</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-sm text-muted-foreground">No logs</TableCell></TableRow>
                  ) : logs.map(l => (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium">{l.date}</TableCell>
                      <TableCell>{l.exercise}</TableCell>
                      <TableCell>{l.sets}×{l.reps}</TableCell>
                      <TableCell>{l.pain}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Automated Report Generation */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Automated Report</CardTitle>
            <CardDescription>Progress summary</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="p-3 rounded-lg border"><div className="text-xs text-muted-foreground">Total Reps</div><div className="text-2xl font-semibold">{progress.totalReps}</div></div>
              <div className="p-3 rounded-lg border"><div className="text-xs text-muted-foreground">Avg Pain</div><div className="text-2xl font-semibold">{progress.avgPain}/10</div></div>
              <div className="p-3 rounded-lg border"><div className="text-xs text-muted-foreground">Sessions</div><div className="text-2xl font-semibold">{new Set(logs.map(l=>l.date)).size}</div></div>
            </div>
            <div className="text-sm whitespace-pre-wrap p-3 rounded-lg border bg-muted/30">{report}</div>
            <div className="mt-3 flex gap-2">
              <Button variant="outline"><FileText className="h-4 w-4 mr-2" /> Export PDF</Button>
              <Button variant="outline"><ClipboardList className="h-4 w-4 mr-2" /> Push to EMR</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
