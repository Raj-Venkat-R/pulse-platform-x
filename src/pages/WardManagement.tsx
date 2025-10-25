import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Bed, ClipboardList, Package, Users, CheckSquare, Plus, AlertCircle } from "lucide-react";

 type Patient = {
  id: string;
  name: string;
  bed?: string;
  nurse?: string;
  status: "Admitted" | "Discharged" | "Transfer";
};

 type Task = {
  id: string;
  patientId: string;
  title: string;
  due: string; // HH:mm
  assignedTo: string; // nurse
  state: "Open" | "In-Progress" | "Done";
};

 type Item = {
  sku: string;
  name: string;
  qty: number;
  unit: string;
  reorderLevel: number;
};

const nurses = ["Nurse A", "Nurse B", "Nurse C", "Nurse D"];
const beds = Array.from({ length: 24 }).map((_, i) => `W-${(i + 1).toString().padStart(2, "0")}`);

export default function WardManagement() {
  const [patients, setPatients] = useState<Patient[]>([
    { id: "P-1001", name: "Reena Patel", bed: "W-01", nurse: "Nurse A", status: "Admitted" },
    { id: "P-1002", name: "Arjun Singh", bed: "W-02", nurse: "Nurse B", status: "Admitted" },
  ]);
  const [inventory, setInventory] = useState<Item[]>([
    { sku: "NS-001", name: "Normal Saline 500ml", qty: 35, unit: "bottles", reorderLevel: 20 },
    { sku: "GA-010", name: "Gloves (M)", qty: 180, unit: "pairs", reorderLevel: 100 },
    { sku: "MS-005", name: "Masks", qty: 60, unit: "pcs", reorderLevel: 80 },
  ]);
  const [tasks, setTasks] = useState<Task[]>([
    { id: "T-01", patientId: "P-1001", title: "Vitals Q4H", due: "10:00", assignedTo: "Nurse A", state: "Open" },
    { id: "T-02", patientId: "P-1002", title: "IV line change", due: "11:30", assignedTo: "Nurse B", state: "In-Progress" },
  ]);

  const [newPatient, setNewPatient] = useState({ id: "", name: "", bed: "", nurse: "" });
  const [newTask, setNewTask] = useState({ patientId: "", title: "", due: "", nurse: "" });

  const addPatient = () => {
    if (!newPatient.id || !newPatient.name) return;
    setPatients(prev => [{ id: newPatient.id, name: newPatient.name, bed: newPatient.bed || undefined, nurse: newPatient.nurse || undefined, status: "Admitted" }, ...prev]);
    setNewPatient({ id: "", name: "", bed: "", nurse: "" });
  };

  const assignBed = (pid: string, bedId: string) => setPatients(prev => prev.map(p => p.id === pid ? { ...p, bed: bedId } : p));
  const assignNurse = (pid: string, nurse: string) => setPatients(prev => prev.map(p => p.id === pid ? { ...p, nurse } : p));

  const addTask = () => {
    if (!newTask.patientId || !newTask.title || !newTask.due || !newTask.nurse) return;
    setTasks(prev => [{ id: `T-${Date.now()}`, patientId: newTask.patientId, title: newTask.title, due: newTask.due, assignedTo: newTask.nurse, state: "Open" }, ...prev]);
    setNewTask({ patientId: "", title: "", due: "", nurse: "" });
  };
  const advanceTask = (id: string) => setTasks(prev => prev.map(t => t.id === id ? { ...t, state: t.state === "Open" ? "In-Progress" : "Done" } : t));

  const requestReorder = (sku: string) => setInventory(prev => prev.map(i => i.sku === sku ? { ...i, qty: i.qty + 50 } : i));

  const lowStock = useMemo(() => inventory.filter(i => i.qty <= i.reorderLevel), [inventory]);

  return (
    <div className="w-full px-2 md:px-4 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Bed className="h-8 w-8 text-primary" />
          Ward Management Software
        </h1>
        <p className="text-muted-foreground mt-1">Replace paper registers with digital task boards, bed allocation, nurse assignments, and supply tracking.</p>
      </div>

      {/* Patient list view */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Patient List</CardTitle>
          <CardDescription>Bed allocation and nurse assignments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="pid">Patient ID</Label>
              <Input id="pid" value={newPatient.id} onChange={(e)=>setNewPatient(p=>({ ...p, id: e.target.value }))} placeholder="e.g., P-11025" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="pname">Name</Label>
              <Input id="pname" value={newPatient.name} onChange={(e)=>setNewPatient(p=>({ ...p, name: e.target.value }))} placeholder="Patient name" />
            </div>
            <div className="space-y-2">
              <Label>Bed</Label>
              <Select value={newPatient.bed} onValueChange={(v)=>setNewPatient(p=>({ ...p, bed: v }))}>
                <SelectTrigger><SelectValue placeholder="Select bed" /></SelectTrigger>
                <SelectContent>{beds.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nurse</Label>
              <Select value={newPatient.nurse} onValueChange={(v)=>setNewPatient(p=>({ ...p, nurse: v }))}>
                <SelectTrigger><SelectValue placeholder="Assign nurse" /></SelectTrigger>
                <SelectContent>{nurses.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={addPatient}><Plus className="h-4 w-4 mr-2" /> Add</Button>
            </div>
          </div>

          <div className="mt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Bed</TableHead>
                  <TableHead>Nurse</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {patients.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-sm text-muted-foreground">No patients</TableCell></TableRow>
                ) : patients.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.id} • {p.name}</TableCell>
                    <TableCell>
                      <Select value={p.bed || ""} onValueChange={(v)=>assignBed(p.id, v)}>
                        <SelectTrigger><SelectValue placeholder="Assign" /></SelectTrigger>
                        <SelectContent>{beds.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select value={p.nurse || ""} onValueChange={(v)=>assignNurse(p.id, v)}>
                        <SelectTrigger><SelectValue placeholder="Assign" /></SelectTrigger>
                        <SelectContent>{nurses.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell><Badge variant={p.status === "Admitted" ? "secondary" : p.status === "Transfer" ? "outline" : "default"}>{p.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline">Details</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Task automation */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Task Automation</CardTitle>
            <CardDescription>Digital task board for nursing workflows</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label>Patient</Label>
                <Select value={newTask.patientId} onValueChange={(v)=>setNewTask(t=>({ ...t, patientId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select patient" /></SelectTrigger>
                  <SelectContent>{patients.map(p => <SelectItem key={p.id} value={p.id}>{p.id} • {p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="title">Task</Label>
                <Input id="title" value={newTask.title} onChange={(e)=>setNewTask(t=>({ ...t, title: e.target.value }))} placeholder="e.g., Dressing change" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="due">Due</Label>
                <Input id="due" value={newTask.due} onChange={(e)=>setNewTask(t=>({ ...t, due: e.target.value }))} placeholder="10:30" />
              </div>
              <div className="space-y-2">
                <Label>Nurse</Label>
                <Select value={newTask.nurse} onValueChange={(v)=>setNewTask(t=>({ ...t, nurse: v }))}>
                  <SelectTrigger><SelectValue placeholder="Assign nurse" /></SelectTrigger>
                  <SelectContent>{nurses.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={addTask}><ClipboardList className="h-4 w-4 mr-2" /> Add Task</Button>
              </div>
            </div>

            <div className="mt-4 grid md:grid-cols-3 gap-4">
              {(["Open","In-Progress","Done"] as Task["state"][ ]).map(col => (
                <div key={col} className="p-3 rounded-lg border">
                  <div className="font-medium flex items-center gap-2">
                    <CheckSquare className="h-4 w-4" /> {col}
                  </div>
                  <div className="mt-2 space-y-2">
                    {tasks.filter(t=>t.state===col).map(t => (
                      <div key={t.id} className="p-2 rounded border flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium">{t.title}</div>
                          <div className="text-xs text-muted-foreground">{t.patientId} • {t.assignedTo} • {t.due}</div>
                        </div>
                        {col !== "Done" && <Button size="sm" variant="outline" onClick={()=>advanceTask(t.id)}>Advance</Button>}
                      </div>
                    ))}
                    {tasks.filter(t=>t.state===col).length===0 && (
                      <div className="text-xs text-muted-foreground">No tasks</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Inventory & reorder */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Inventory & Reorder</CardTitle>
            <CardDescription>Track supplies and raise requests</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventory.map(i => (
                  <TableRow key={i.sku}>
                    <TableCell className="font-medium">{i.sku}</TableCell>
                    <TableCell>{i.name}</TableCell>
                    <TableCell>{i.qty} {i.unit}</TableCell>
                    <TableCell>
                      {i.qty <= i.reorderLevel ? (
                        <span className="inline-flex items-center gap-1 text-amber-600 text-xs"><AlertCircle className="h-4 w-4" /> Reorder</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">OK</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={()=>requestReorder(i.sku)}>
                        <Package className="h-4 w-4 mr-2" /> Replenish
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-3 text-xs text-muted-foreground">Low stock items: {lowStock.map(i=>i.sku).join(", ") || "None"}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
