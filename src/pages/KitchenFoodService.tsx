import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ChefHat, ClipboardList, Package, Recycle, Truck, DollarSign, Utensils, Calendar, Clock } from "lucide-react";

 type Order = {
  id: string;
  type: "Diet" | "Staff";
  patientId?: string;
  meals: string[];
  status: "Queued" | "In-Production" | "Tray-Ready" | "Delivered";
};

 type Inventory = {
  sku: string;
  name: string;
  qty: number;
  unit: string;
};

 type Recipe = {
  name: string;
  items: { sku: string; qty: number; unit: string }[];
};

 type Waste = {
  id: string;
  item: string;
  reason: string;
  qty: number;
  unit: string;
};

export default function KitchenFoodService() {
  const [orderType, setOrderType] = useState<Order["type"] | "">("");
  const [patientId, setPatientId] = useState("");
  const [meal, setMeal] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);

  const [inventory, setInventory] = useState<Inventory[]>([
    { sku: "RICE-001", name: "Brown Rice", qty: 25, unit: "kg" },
    { sku: "CHKN-200", name: "Chicken Breast", qty: 12, unit: "kg" },
    { sku: "VEG-010", name: "Mixed Veg", qty: 18, unit: "kg" },
    { sku: "SALT-005", name: "Low-Sodium Salt", qty: 4, unit: "kg" },
  ]);

  const [recipes] = useState<Recipe[]>([
    { name: "Low Sodium Dal", items: [{ sku: "SALT-005", qty: 0.02, unit: "kg" }, { sku: "VEG-010", qty: 0.15, unit: "kg" }] },
    { name: "Grilled Chicken Bowl", items: [{ sku: "CHKN-200", qty: 0.2, unit: "kg" }, { sku: "RICE-001", qty: 0.18, unit: "kg" }, { sku: "VEG-010", qty: 0.12, unit: "kg" }] },
  ]);

  const [waste, setWaste] = useState<Waste[]>([]);

  const addOrder = () => {
    if (!orderType) return;
    const id = `ORD-${Math.random().toString(36).slice(2,7).toUpperCase()}`;
    const meals = meal ? meal.split(",").map(m=>m.trim()).filter(Boolean) : ["Breakfast","Lunch","Dinner"];
    setOrders(prev => [{ id, type: orderType as Order["type"], patientId: orderType === "Diet" ? patientId : undefined, meals, status: "Queued" }, ...prev]);
    setMeal("");
    setPatientId("");
    setOrderType("");
  };

  const moveOrder = (id: string) => {
    setOrders(prev => prev.map(o => {
      if (o.id !== id) return o;
      const next = o.status === "Queued" ? "In-Production" : o.status === "In-Production" ? "Tray-Ready" : o.status === "Tray-Ready" ? "Delivered" : "Delivered";
      return { ...o, status: next };
    }));
  };

  const consumeInventoryForRecipe = (recipe: Recipe) => {
    setInventory(prev => prev.map(i => {
      const used = recipe.items.find(it => it.sku === i.sku);
      if (!used) return i;
      return { ...i, qty: Math.max(0, +(i.qty - used.qty).toFixed(2)) };
    }));
  };

  const logWaste = () => {
    const item = inventory[Math.floor(Math.random()*inventory.length)];
    const qty = +(Math.random()*0.5).toFixed(2);
    setWaste(prev => [{ id: `W-${Date.now()}`, item: item.name, reason: "Overproduction", qty, unit: item.unit }, ...prev]);
  };

  const etaByStatus = useMemo(() => ({
    Queued: 30,
    "In-Production": 20,
    "Tray-Ready": 5,
    Delivered: 0,
  } as const), []);

  const billingEstimate = useMemo(() => {
    const delivered = orders.filter(o => o.status === "Delivered").length;
    const staff = orders.filter(o => o.type === "Staff").length;
    return { trays: delivered, staffMeals: staff, amount: delivered*120 + staff*80 };
  }, [orders]);

  return (
    <div className="w-full px-2 md:px-4 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <ChefHat className="h-8 w-8 text-primary" />
          Kitchen & Food Service Module
        </h1>
      </div>

      {/* Flow: Diet Plan → Production → Tray Delivery */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Order Flow</CardTitle>
          <CardDescription>Diet Plan → Production → Tray Delivery</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg border">
              <div className="text-sm font-medium mb-2">Input</div>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-2"><ClipboardList className="h-4 w-4" /> Diet orders</div>
                <div className="flex items-center gap-2"><ClipboardList className="h-4 w-4" /> Staff meals</div>
                <div className="flex items-center gap-2"><Package className="h-4 w-4" /> Inventory data</div>
              </div>
            </div>
            <div className="p-4 rounded-lg border">
              <div className="text-sm font-medium mb-2">Processing</div>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-2"><Utensils className="h-4 w-4" /> Recipe generation</div>
                <div className="flex items-center gap-2"><Calendar className="h-4 w-4" /> Production scheduling</div>
                <div className="flex items-center gap-2"><Clock className="h-4 w-4" /> ETAs</div>
              </div>
            </div>
            <div className="p-4 rounded-lg border">
              <div className="text-sm font-medium mb-2">Output</div>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-2"><Truck className="h-4 w-4" /> Tray tracking</div>
                <div className="flex items-center gap-2"><Recycle className="h-4 w-4" /> Waste analytics</div>
                <div className="flex items-center gap-2"><DollarSign className="h-4 w-4" /> Billing integration</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Intake */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Order Intake</CardTitle>
          <CardDescription>Create diet orders and staff meals</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="space-y-2">
              <Label>Order Type</Label>
              <Select value={orderType} onValueChange={(v)=>setOrderType(v as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Diet">Diet</SelectItem>
                  <SelectItem value="Staff">Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="pid">Patient ID (Diet only)</Label>
              <Input id="pid" value={patientId} onChange={(e)=>setPatientId(e.target.value)} placeholder="e.g., P-10442" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="meals">Meal Names (comma-separated)</Label>
              <Input id="meals" value={meal} onChange={(e)=>setMeal(e.target.value)} placeholder="Breakfast,Lunch,Dinner" />
            </div>
            <div className="flex items-end">
              <Button onClick={addOrder}>Add Order</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Production Board */}
        <Card className="shadow-md lg:col-span-2">
          <CardHeader>
            <CardTitle>Production Board</CardTitle>
            <CardDescription>Move orders through production → tray → delivery</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Meals</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>ETA</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-sm text-muted-foreground">No orders</TableCell></TableRow>
                ) : orders.map(o => (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium">{o.id}{o.patientId ? ` • ${o.patientId}` : ""}</TableCell>
                    <TableCell>{o.type}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{o.meals.join(", ")}</TableCell>
                    <TableCell>
                      <Badge variant={o.status === "Tray-Ready" ? "secondary" : o.status === "Delivered" ? "default" : "outline"}>{o.status}</Badge>
                    </TableCell>
                    <TableCell>{etaByStatus[o.status]} min</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={()=>moveOrder(o.id)}>Advance</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-4 flex flex-wrap gap-2">
              {recipes.map(r => (
                <Button key={r.name} variant="outline" onClick={()=>consumeInventoryForRecipe(r)}>
                  <Utensils className="h-4 w-4 mr-2" /> Use Recipe: {r.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Inventory */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Inventory</CardTitle>
            <CardDescription>Real-time stock</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Qty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventory.map(i => (
                  <TableRow key={i.sku}>
                    <TableCell className="font-medium">{i.sku}</TableCell>
                    <TableCell>{i.name}</TableCell>
                    <TableCell>{i.qty} {i.unit}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Waste & Billing */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Food Waste Tracking</CardTitle>
            <CardDescription>Reduce overproduction and spoilage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-3 flex gap-2">
              <Button variant="outline" onClick={logWaste}><Recycle className="h-4 w-4 mr-2" /> Log Waste</Button>
              <Button variant="outline" onClick={()=>setWaste([])}>Clear</Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Qty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {waste.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="text-sm text-muted-foreground">No waste entries</TableCell></TableRow>
                ) : waste.map(w => (
                  <TableRow key={w.id}>
                    <TableCell className="font-medium">{w.item}</TableCell>
                    <TableCell>{w.reason}</TableCell>
                    <TableCell>{w.qty} {w.unit}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Billing Integration</CardTitle>
            <CardDescription>Trays and meals summary</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="p-3 rounded-lg border">
                <div className="text-xs text-muted-foreground">Delivered Trays</div>
                <div className="text-2xl font-semibold">{billingEstimate.trays}</div>
              </div>
              <div className="p-3 rounded-lg border">
                <div className="text-xs text-muted-foreground">Staff Meals</div>
                <div className="text-2xl font-semibold">{billingEstimate.staffMeals}</div>
              </div>
              <div className="p-3 rounded-lg border">
                <div className="text-xs text-muted-foreground">Estimated Bill</div>
                <div className="text-2xl font-semibold flex items-center gap-2"><DollarSign className="h-5 w-5 text-emerald-600" /> {billingEstimate.amount}</div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">Export to billing or HIS with patient and cost center mappings.</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
