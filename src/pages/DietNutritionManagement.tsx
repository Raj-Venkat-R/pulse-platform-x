import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Salad, Utensils, Activity, ClipboardCheck, AlertTriangle, ChefHat } from "lucide-react";

 type Plan = {
  patientId: string;
  kcal: number;
  protein: number; // g
  carbs: number; // g
  fat: number; // g
  restrictions: string[];
  meals: { name: string; items: string[] }[];
};

 type Tray = {
  id: string;
  patientId: string;
  meal: string;
  status: "Queued" | "Preparing" | "Delivered" | "Returned";
  compliance: number; // 0-100 eaten
};

 type Feedback = {
  id: string;
  patientId: string;
  rating: number; // 1-5
  notes: string;
};

export default function DietNutritionManagement() {
  const [patientId, setPatientId] = useState("");
  const [dietType, setDietType] = useState<string>("");
  const [emrData, setEmrData] = useState<any | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [trayQueue, setTrayQueue] = useState<Tray[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);

  // Simulated EMR fetch
  const fetchEMR = async () => {
    if (!patientId) return;
    const demo = {
      dx: ["T2DM", "Hypertension"],
      bmi: 29.1,
      allergies: ["Peanut"],
      prescription: { kcals: 1800, protein: "1.2g/kg", sodiumRestricted: true },
      weightKg: 72,
    };
    setEmrData(demo);
  };

  // Simple AI-like planner
  const generatePlan = () => {
    if (!emrData) return;
    const kcalBase = emrData.prescription?.kcals || 2000;
    const protein = Math.round((emrData.weightKg || 70) * (dietType === "Renal" ? 0.8 : 1.2));
    const fat = Math.round((kcalBase * 0.3) / 9);
    const carbs = Math.round((kcalBase - protein * 4 - fat * 9) / 4);
    const restrictions: string[] = [];
    if (emrData.dx?.includes("T2DM")) restrictions.push("Low simple sugars");
    if (emrData.prescription?.sodiumRestricted) restrictions.push("Low sodium");
    if (dietType === "Renal") restrictions.push("Controlled potassium/phosphorus");
    if (emrData.allergies?.length) restrictions.push(...emrData.allergies.map((a:string)=>`Allergy: ${a}`));

    const meals = [
      { name: "Breakfast", items: ["Oats + skim milk", "Boiled egg", "Apple"] },
      { name: "Lunch", items: ["Grilled chicken", "Quinoa", "Steamed veggies"] },
      { name: "Snack", items: ["Greek yogurt", "Nuts (no peanuts)"] },
      { name: "Dinner", items: ["Dal (low sodium)", "Brown rice", "Salad"] },
    ];

    setPlan({ patientId, kcal: kcalBase, protein, carbs, fat, restrictions, meals });
  };

  const pushToKitchen = () => {
    if (!plan) return;
    const id = `TR-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    setTrayQueue(prev => [{ id, patientId: plan.patientId, meal: plan.meals[0]?.name || "Meal", status: "Queued", compliance: 0 }, ...prev]);
  };

  const advanceTray = (id: string) => {
    setTrayQueue(prev => prev.map(t => t.id === id ? { ...t,
      status: t.status === "Queued" ? "Preparing" : t.status === "Preparing" ? "Delivered" : t.status === "Delivered" ? "Returned" : "Returned",
      compliance: t.status === "Delivered" ? Math.round(70 + Math.random()*30) : t.compliance
    } : t));
  };

  const addFeedback = () => {
    if (!patientId) return;
    setFeedback(prev => [{ id: `FB-${Date.now()}`, patientId, rating: Math.ceil(Math.random()*5), notes: "Tasty but a bit salty" }, ...prev]);
  };

  const macroPct = useMemo(() => {
    if (!plan) return { p:0,c:0,f:0 };
    const kcal = plan.kcal;
    const p = (plan.protein*4)/kcal*100;
    const f = (plan.fat*9)/kcal*100;
    const c = 100 - p - f;
    return { p: Math.max(0, Math.round(p)), c: Math.max(0, Math.round(c)), f: Math.max(0, Math.round(f)) };
  }, [plan]);

  const compliance = useMemo(() => {
    const delivered = trayQueue.filter(t=>t.status==="Delivered" || t.status === "Returned");
    const avg = delivered.length ? Math.round(delivered.reduce((a,b)=>a+b.compliance,0)/delivered.length) : 0;
    return { delivered: delivered.length, avg };
  }, [trayQueue]);

  return (
    <div className="w-full px-2 md:px-4 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Salad className="h-8 w-8 text-primary" />
          Diet & Nutrition Management
        </h1>
      </div>

      {/* Controls */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Plan Generator</CardTitle>
          <CardDescription>Automated meal planning from EMR prescriptions with real-time kitchen sync</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="pid">Patient ID</Label>
              <Input id="pid" value={patientId} onChange={(e)=>setPatientId(e.target.value)} placeholder="e.g., P-10442" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Diet Type</Label>
              <Select value={dietType} onValueChange={setDietType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select diet" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Standard">Standard</SelectItem>
                  <SelectItem value="Diabetic">Diabetic</SelectItem>
                  <SelectItem value="Renal">Renal</SelectItem>
                  <SelectItem value="Cardiac">Cardiac</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-3">
              <Button variant="outline" onClick={fetchEMR}><ClipboardCheck className="h-4 w-4 mr-2" /> Fetch EMR</Button>
              <Button onClick={generatePlan}><Activity className="h-4 w-4 mr-2" /> Generate Plan</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Plan & Macros */}
        <Card className="shadow-md lg:col-span-2">
          <CardHeader>
            <CardTitle>Diet Plan</CardTitle>
            <CardDescription>Personalized meals and macro chart</CardDescription>
          </CardHeader>
          <CardContent>
            {!plan ? (
              <div className="text-sm text-muted-foreground">No plan generated</div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg border">
                    <div className="text-sm">Calories</div>
                    <div className="text-2xl font-semibold">{plan.kcal}</div>
                  </div>
                  <div className="p-3 rounded-lg border">
                    <div className="text-sm">Protein</div>
                    <div className="text-2xl font-semibold">{plan.protein}g</div>
                  </div>
                  <div className="p-3 rounded-lg border">
                    <div className="text-sm">Carbs / Fat</div>
                    <div className="text-2xl font-semibold">{plan.carbs}g / {plan.fat}g</div>
                  </div>
                </div>

                {/* Macro Ring */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-center">
                    <svg viewBox="0 0 120 120" className="h-40 w-40">
                      <circle cx="60" cy="60" r="50" stroke="#e5e7eb" strokeWidth="12" fill="none" />
                      {/* protein */}
                      <circle cx="60" cy="60" r="50" stroke="#10b981" strokeWidth="12" fill="none" strokeDasharray={`${macroPct.p*3.14}, 314`} transform="rotate(-90 60 60)" />
                      {/* carbs */}
                      <circle cx="60" cy="60" r="50" stroke="#38bdf8" strokeWidth="12" fill="none" strokeDasharray={`${macroPct.c*3.14}, 314`} transform="rotate(${(macroPct.p/100)*360 - 90} 60 60)" />
                      {/* fat */}
                      <circle cx="60" cy="60" r="50" stroke="#f59e0b" strokeWidth="12" fill="none" strokeDasharray={`${macroPct.f*3.14}, 314`} transform="rotate(${((macroPct.p+macroPct.c)/100)*360 - 90} 60 60)" />
                    </svg>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2"><span className="h-2 w-2 rounded bg-emerald-500" /> Protein {macroPct.p}%</div>
                    <div className="flex items-center gap-2"><span className="h-2 w-2 rounded bg-sky-400" /> Carbs {macroPct.c}%</div>
                    <div className="flex items-center gap-2"><span className="h-2 w-2 rounded bg-amber-500" /> Fat {macroPct.f}%</div>
                    <Separator />
                    <div className="space-y-1">
                      {plan.restrictions.map((r, i)=>(
                        <div key={i} className="text-muted-foreground">• {r}</div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {plan.meals.map((m, idx)=>(
                    <div key={idx} className="p-3 rounded-lg border">
                      <div className="font-medium flex items-center gap-2"><Utensils className="h-4 w-4" /> {m.name}</div>
                      <div className="mt-2 text-sm text-muted-foreground space-y-1">
                        {m.items.map((it, i)=>(<div key={i}>{it}</div>))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <Button onClick={pushToKitchen}><ChefHat className="h-4 w-4 mr-2" /> Send to Kitchen</Button>
                  <Button variant="outline" onClick={()=>setPlan(null)}>Reset</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Kitchen / Tray Tracking */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Kitchen Sync & Tray Tracking</CardTitle>
            <CardDescription>Real-time queue and delivery compliance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {trayQueue.length === 0 && <div className="text-sm text-muted-foreground">No trays in queue</div>}
              {trayQueue.map(t => (
                <div key={t.id} className="p-3 rounded-lg border flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{t.id} • {t.patientId} • {t.meal}</div>
                    <div className="text-xs text-muted-foreground">Compliance: {t.compliance}%</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={t.status === "Delivered" ? "secondary" : t.status === "Returned" ? "default" : "outline"}>{t.status}</Badge>
                    <Button size="sm" variant="outline" onClick={()=>advanceTray(t.id)}>Advance</Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Feedback & Reports */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Feedback Analysis</CardTitle>
            <CardDescription>Sentiment and ratings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 mb-3">
              <Button variant="outline" onClick={addFeedback}>Capture Feedback</Button>
              <Button variant="outline" onClick={()=>setFeedback([])}>Clear</Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {feedback.length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="text-sm text-muted-foreground">No feedback</TableCell></TableRow>
                ) : feedback.map(f=> (
                  <TableRow key={f.id}>
                    <TableCell className="font-medium">{f.patientId}</TableCell>
                    <TableCell>
                      <Badge variant={f.rating >=4 ? "default" : f.rating>=2 ? "secondary" : "destructive"}>{f.rating}/5</Badge>
                    </TableCell>
                    <TableCell>{f.notes}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Nutritional Reports</CardTitle>
            <CardDescription>Compliance metrics and meal performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="p-3 rounded-lg border">
                <div className="text-xs text-muted-foreground">Delivered</div>
                <div className="text-2xl font-semibold">{compliance.delivered}</div>
              </div>
              <div className="p-3 rounded-lg border">
                <div className="text-xs text-muted-foreground">Avg Compliance</div>
                <div className="text-2xl font-semibold">{compliance.avg}%</div>
              </div>
              <div className="p-3 rounded-lg border">
                <div className="text-xs text-muted-foreground">Alerts</div>
                <div className="text-2xl font-semibold flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-600" /> {Math.max(0, trayQueue.length - compliance.delivered)}</div>
              </div>
            </div>

            {/* Simple bar for compliance distribution */}
            <div>
              <div className="text-sm font-medium mb-2">Compliance Distribution</div>
              <div className="space-y-2">
                {[25,50,75,100].map((bucket)=>{
                  const count = feedback.filter(f=>f.rating*20 >= bucket-25 && f.rating*20 <= bucket).length;
                  const max = Math.max(1, feedback.length);
                  return (
                    <div key={bucket} className="flex items-center gap-3 text-sm">
                      <div className="w-16 text-muted-foreground">≤{bucket}%</div>
                      <div className="flex-1 h-3 bg-muted rounded">
                        <div className="h-3 rounded bg-sky-400" style={{ width: `${(count/max)*100}%` }} />
                      </div>
                      <div className="w-8 text-right">{count}</div>
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
