import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, ClipboardList, IndianRupee, Factory, FilePlus2, Filter, History, ListFilter, Loader2, Package2, Plus, RefreshCw, Search, Star, Truck, Wand2 } from "lucide-react";

// ------------------ Mock Data ------------------
const mockMedicines = [
  // Costs adjusted to INR realistic unit prices to reflect actual inventory value
  { id: 1, name: "Paracetamol 500mg", batch: "BATCH001", expiry: "2024-12-31", currentStock: 150, reorderLevel: 50, supplier: "MedSupplier Inc", cost: 250, status: "in_stock" },
  { id: 2, name: "Amoxicillin 250mg", batch: "BATCH002", expiry: "2025-02-20", currentStock: 40, reorderLevel: 60, supplier: "HealthMart", cost: 420, status: "low_stock" },
  { id: 3, name: "Ibuprofen 200mg", batch: "BATCH003", expiry: "2024-11-15", currentStock: 0, reorderLevel: 30, supplier: "MedSupplier Inc", cost: 310, status: "out_of_stock" },
  { id: 4, name: "Vitamin C 1000mg", batch: "BATCH004", expiry: "2025-08-10", currentStock: 220, reorderLevel: 100, supplier: "VitaLabs", cost: 190, status: "in_stock" },
];

const mockSuppliers = [
  { id: 1, name: "MedSupplier Inc", contact: "John Doe", email: "john@medsupplier.com", rating: 4.5, lastOrder: "2024-01-15" },
  { id: 2, name: "HealthMart", contact: "Alice Smith", email: "alice@healthmart.com", rating: 4.1, lastOrder: "2024-02-05" },
  { id: 3, name: "VitaLabs", contact: "Paul Allen", email: "paul@vitalabs.com", rating: 3.9, lastOrder: "2024-03-09" },
];

// ------------------ Helpers ------------------
function daysUntil(dateStr: string) {
  const now = new Date();
  const d = new Date(dateStr + "T00:00:00");
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function currency(n: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(n);
}

// ------------------ Main Page ------------------
export default function Pharmacy() {
  // Inventory state
  const [q, setQ] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "expiry" | "stock">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Purchase order state
  const [poSupplier, setPoSupplier] = useState<string>("1");
  const [poLines, setPoLines] = useState<Array<{ medicineId: number; qty: number }>>([]);
  const [poEta, setPoEta] = useState<string>("");
  const [poStatus, setPoStatus] = useState<"draft" | "ordered" | "received" | "cancelled">("draft");

  // Stock adjustment state
  const [adjOpen, setAdjOpen] = useState(false);
  const [adjReason, setAdjReason] = useState("Damaged");
  const [adjBatch, setAdjBatch] = useState("BATCH001");
  const [adjQty, setAdjQty] = useState<number>(0);
  const [adjNotes, setAdjNotes] = useState("");

  // Expiry filter
  const [expiryFilter, setExpiryFilter] = useState<string>("30");

  // Transfer state
  const [transferFrom, setTransferFrom] = useState("Main Store");
  const [transferTo, setTransferTo] = useState("Ward A");
  const [transferList, setTransferList] = useState<Array<{ medicineId: number; qty: number }>>([]);
  const [transferReason, setTransferReason] = useState("Replenishment");

  // Derived metrics
  const filteredSorted = useMemo(() => {
    const list = mockMedicines.filter((m) =>
      [m.name, m.batch, m.supplier].join(" ").toLowerCase().includes(q.toLowerCase())
    );
    list.sort((a, b) => {
      let vA: any, vB: any;
      if (sortBy === "name") {
        vA = a.name; vB = b.name;
      } else if (sortBy === "expiry") {
        vA = new Date(a.expiry).getTime(); vB = new Date(b.expiry).getTime();
      } else {
        vA = a.currentStock; vB = b.currentStock;
      }
      const cmp = vA > vB ? 1 : vA < vB ? -1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [q, sortBy, sortDir]);

  const totalInventoryValue = useMemo(
    () => mockMedicines.reduce((sum, m) => sum + m.currentStock * m.cost, 0),
    []
  );

  const lowStockCount = useMemo(
    () => mockMedicines.filter((m) => m.currentStock <= m.reorderLevel).length,
    []
  );

  const expiringSoonCount = useMemo(
    () => mockMedicines.filter((m) => daysUntil(m.expiry) <= 30).length,
    []
  );

  const poTotal = useMemo(() => {
    return poLines.reduce((sum, l) => {
      const med = mockMedicines.find((m) => m.id === l.medicineId);
      return sum + (med ? med.cost * l.qty : 0);
    }, 0);
  }, [poLines]);

  const expiringFiltered = useMemo(() => {
    const days = parseInt(expiryFilter, 10);
    return mockMedicines.filter((m) => daysUntil(m.expiry) <= days);
  }, [expiryFilter]);

  // Handlers
  function toggleSort(key: typeof sortBy) {
    if (sortBy === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortBy(key); setSortDir("asc"); }
  }

  function addPoLine() {
    const first = mockMedicines[0];
    setPoLines((prev) => [...prev, { medicineId: first.id, qty: 1 }]);
  }

  function updatePoLine(i: number, patch: Partial<{ medicineId: number; qty: number }>) {
    setPoLines((prev) => prev.map((l, idx) => idx === i ? { ...l, ...patch } : l));
  }

  function removePoLine(i: number) { setPoLines((prev) => prev.filter((_, idx) => idx !== i)); }

  function submitPO() {
    // simulate
    setPoStatus("ordered");
  }

  function addTransferLine() {
    const first = mockMedicines[0];
    setTransferList((prev) => [...prev, { medicineId: first.id, qty: 1 }]);
  }

  // ------------------ UI ------------------
  return (
    <div className="w-full px-2 md:px-4 py-6 space-y-8">
      {/* Stock Overview */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Package2 className="h-5 w-5"/> Stock Overview</CardTitle>
          <CardDescription>Quick metrics and actions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border bg-card">
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">Total Medicines</div>
                <div className="text-2xl font-bold">{mockMedicines.length}</div>
              </CardContent>
            </Card>
            <Card className="border bg-card">
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">Low Stock Items</div>
                <div className="text-2xl font-bold text-warning">{lowStockCount}</div>
              </CardContent>
            </Card>
            <Card className="border bg-card">
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">Expiring in 30 days</div>
                <div className="text-2xl font-bold text-destructive">{expiringSoonCount}</div>
              </CardContent>
            </Card>
            <Card className="border bg-card">
              <CardContent className="p-4">
                <div className="text-sm text-muted-foreground">Inventory Value</div>
                <div className="text-2xl font-bold">{currency(totalInventoryValue)}</div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-4 flex items-center gap-2">
            <Button className="gap-2"><FilePlus2 className="h-4 w-4"/> New Purchase Order</Button>
            <Button variant="outline" className="gap-2"><Plus className="h-4 w-4"/> Add Medicine</Button>
            <Button variant="outline" className="gap-2"><ClipboardList className="h-4 w-4"/> Stock Take</Button>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Table */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Medicine Inventory</span>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground"/>
                <Input placeholder="Search..." className="pl-10" value={q} onChange={(e)=>setQ(e.target.value)} />
              </div>
              <Button variant="outline" className="gap-2" onClick={()=>setSortBy("name")}><ListFilter className="h-4 w-4"/> Sort</Button>
            </div>
          </CardTitle>
          <CardDescription>Searchable, sortable inventory with status and actions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead onClick={()=>toggleSort("name")} className="cursor-pointer">Medicine</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead onClick={()=>toggleSort("expiry")} className="cursor-pointer">Expiry</TableHead>
                  <TableHead onClick={()=>toggleSort("stock")} className="cursor-pointer">Current Stock</TableHead>
                  <TableHead>Reorder Level</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSorted.map((m) => {
                  const d = daysUntil(m.expiry);
                  const expClass = d <= 30 ? "text-destructive" : d <= 60 ? "text-warning" : "";
                  const stockPct = Math.min(100, Math.round((m.currentStock / Math.max(1, m.reorderLevel * 2)) * 100));
                  const statusBadge = m.currentStock === 0 ? <Badge variant="destructive">Out of Stock</Badge>
                    : m.currentStock <= m.reorderLevel ? <Badge variant="warning">Low Stock</Badge>
                    : <Badge variant="success">In Stock</Badge>;

                  return (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.name}</TableCell>
                      <TableCell>{m.batch}</TableCell>
                      <TableCell className={expClass}>{m.expiry} {d<=60 && <Badge variant="outline" className="ml-2">{d}d</Badge>}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 min-w-[160px]">
                          <span className="w-10 text-right tabular-nums">{m.currentStock}</span>
                          <Progress value={stockPct} className="flex-1 h-2"/>
                        </div>
                      </TableCell>
                      <TableCell>{m.reorderLevel}</TableCell>
                      <TableCell>{statusBadge}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" className="gap-1"><Wand2 className="h-4 w-4"/> Edit</Button>
                          <Dialog open={adjOpen} onOpenChange={setAdjOpen}>
                            <DialogTrigger asChild>
                              <Button size="sm" className="gap-1"><RefreshCw className="h-4 w-4"/> Adjust</Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-lg">
                              <DialogHeader>
                                <DialogTitle>Stock Adjustment</DialogTitle>
                              </DialogHeader>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label>Reason</Label>
                                  <Select value={adjReason} onValueChange={setAdjReason}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      {['Damaged','Expired','Correction','Theft','Return'].map(r=> (
                                        <SelectItem key={r} value={r}>{r}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <Label>Batch</Label>
                                  <Select value={adjBatch} onValueChange={setAdjBatch}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      {mockMedicines.map(x => (<SelectItem key={x.batch} value={x.batch}>{x.batch}</SelectItem>))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <Label>Quantity (+/-)</Label>
                                  <Input type="number" value={adjQty} onChange={(e)=>setAdjQty(parseInt(e.target.value||"0"))}/>
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                  <Label>Comments</Label>
                                  <Input placeholder="Add comments (optional)" value={adjNotes} onChange={(e)=>setAdjNotes(e.target.value)} />
                                </div>
                              </div>
                              <div className="flex justify-end gap-2 pt-2">
                                <Button variant="outline" onClick={()=>setAdjOpen(false)}>Cancel</Button>
                                <Button onClick={()=>setAdjOpen(false)}>Submit for Approval</Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                          <Button variant="ghost" size="sm" className="gap-1"><History className="h-4 w-4"/> History</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Purchase Order Management */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Factory className="h-5 w-5"/> Purchase Order</CardTitle>
          <CardDescription>Create and track purchase orders</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Supplier</Label>
              <Select value={poSupplier} onValueChange={setPoSupplier}>
                <SelectTrigger><SelectValue placeholder="Select supplier"/></SelectTrigger>
                <SelectContent>
                  {mockSuppliers.map(s => (<SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Expected Delivery</Label>
              <div className="flex items-center gap-2">
                <Input type="date" value={poEta} onChange={(e)=>setPoEta(e.target.value)} />
                <Calendar className="h-4 w-4 text-muted-foreground"/>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={poStatus} onValueChange={(v)=>setPoStatus(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['draft','ordered','received','cancelled'].map(s => (<SelectItem key={s} value={s}>{s.toUpperCase()}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Lines</Label>
              <Button variant="outline" size="sm" className="gap-2" onClick={addPoLine}><Plus className="h-4 w-4"/> Add Line</Button>
            </div>
            <div className="space-y-2">
              {poLines.length === 0 && (
                <div className="text-sm text-muted-foreground">No lines added. Click "Add Line" to begin.</div>
              )}
              {poLines.map((l, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-6 gap-2 items-center">
                  <div className="md:col-span-3">
                    <Select value={String(l.medicineId)} onValueChange={(v)=>updatePoLine(idx,{ medicineId: parseInt(v,10) })}>
                      <SelectTrigger><SelectValue placeholder="Select medicine"/></SelectTrigger>
                      <SelectContent>
                        {mockMedicines.map(m => (<SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Input type="number" min={1} value={l.qty} onChange={(e)=>updatePoLine(idx,{ qty: parseInt(e.target.value||"0",10) })}/>
                  </div>
                  <div className="text-right text-sm text-muted-foreground md:col-span-2">
                    {(() => { const med = mockMedicines.find(m=>m.id===l.medicineId); return med ? currency(med.cost * (l.qty||0)) : "-"; })()}
                  </div>
                  <div className="flex justify-end">
                    <Button variant="ghost" size="sm" onClick={()=>removePoLine(idx)}>Remove</Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="text-sm text-muted-foreground">Automatic total based on selected medicines and quantities</div>
              <div className="text-lg font-semibold">Total: {currency(poTotal)}</div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline">Save Draft</Button>
              <Button onClick={submitPO} className="gap-2"><Truck className="h-4 w-4"/> Submit Order</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Supplier Management */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Factory className="h-5 w-5"/> Suppliers</CardTitle>
          <CardDescription>Performance and quick actions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {mockSuppliers.map((s)=>(
              <Card key={s.id} className="border bg-card">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{s.name}</div>
                    <div className="flex items-center gap-1">
                      {Array.from({length:5}).map((_,i)=> (
                        <Star key={i} className={`h-4 w-4 ${i < Math.round(s.rating) ? 'text-warning' : 'text-muted-foreground'}`}/>
                      ))}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">{s.contact} • {s.email}</div>
                  <div className="text-xs text-muted-foreground">Last order: {s.lastOrder}</div>
                  <div className="flex items-center gap-2 pt-1">
                    <Button size="sm" variant="outline">Edit</Button>
                    <Button size="sm">View Orders</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Expiry Tracking */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5"/> Expiry Tracking</CardTitle>
          <CardDescription>Monitor expiring medicines</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Label>Filter:</Label>
            <Select value={expiryFilter} onValueChange={setExpiryFilter}>
              <SelectTrigger className="w-40"><SelectValue/></SelectTrigger>
              <SelectContent>
                {["7","30","60","90"].map(d => (<SelectItem key={d} value={d}>{d} days</SelectItem>))}
              </SelectContent>
            </Select>
            <Button variant="outline" className="gap-2"><Filter className="h-4 w-4"/> Apply</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {expiringFiltered.map((m)=> (
              <Card key={m.id} className="border bg-card">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <div className="font-medium">{m.name}</div>
                    <div className="text-xs text-muted-foreground">Batch {m.batch} • Exp {m.expiry} • in {daysUntil(m.expiry)}d</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline">Bulk Action</Button>
                    <Button size="sm">Replace</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Stock Transfer */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Truck className="h-5 w-5"/> Stock Transfer</CardTitle>
          <CardDescription>Move stock between locations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Source</Label>
              <Select value={transferFrom} onValueChange={setTransferFrom}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                  {["Main Store","Ward A","Ward B","Pharmacy Counter"].map(x => (<SelectItem key={x} value={x}>{x}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Destination</Label>
              <Select value={transferTo} onValueChange={setTransferTo}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                  {["Main Store","Ward A","Ward B","Pharmacy Counter"].map(x => (<SelectItem key={x} value={x}>{x}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Input value={transferReason} onChange={(e)=>setTransferReason(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Transfer Lines</Label>
              <Button variant="outline" size="sm" className="gap-2" onClick={addTransferLine}><Plus className="h-4 w-4"/> Add Line</Button>
            </div>
            {transferList.length === 0 && <div className="text-sm text-muted-foreground">No lines. Add items to transfer.</div>}
            {transferList.map((l, idx) => (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-6 gap-2 items-center">
                <div className="md:col-span-4">
                  <Select value={String(l.medicineId)} onValueChange={(v)=> setTransferList(prev => prev.map((x,i)=> i===idx ? { ...x, medicineId: parseInt(v,10)} : x))}>
                    <SelectTrigger><SelectValue placeholder="Select medicine"/></SelectTrigger>
                    <SelectContent>
                      {mockMedicines.map(m => (<SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Input type="number" min={1} value={l.qty} onChange={(e)=> setTransferList(prev => prev.map((x,i)=> i===idx ? { ...x, qty: parseInt(e.target.value||"0",10)} : x))} />
                </div>
                <div className="flex justify-end">
                  <Button variant="ghost" size="sm" onClick={()=> setTransferList(prev => prev.filter((_,i)=> i!==idx))}>Remove</Button>
                </div>
              </div>
            ))}
            <div className="flex justify-end">
              <Button className="gap-2"><Truck className="h-4 w-4"/> Submit Transfer</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
