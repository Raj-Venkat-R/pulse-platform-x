import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { BarChart3, TrendingUp, ShieldCheck, Users, FileText, AlertTriangle } from "lucide-react";

export default function OperationsQualityDashboard() {
  const [occ, setOcc] = useState(78); // Occupancy Rate %
  const [billEff, setBillEff] = useState(92); // Billing Efficiency %
  const [compScore, setCompScore] = useState(88); // Compliance Score %

  const trend = useMemo(() => {
    // 12 months synthetic
    return Array.from({ length: 12 }).map((_, i) => ({
      m: `M${i + 1}`,
      occ: Math.round(70 + Math.sin(i / 2) * 10 + Math.random() * 5),
      bill: Math.round(85 + Math.cos(i / 3) * 7 + Math.random() * 3),
      comp: Math.round(80 + Math.sin(i / 4) * 8 + Math.random() * 3),
    }));
  }, []);

  const renderLine = (data: number[], color: string) => {
    const max = Math.max(...data, 1);
    const min = Math.min(...data, 0);
    const h = 80, w = 320;
    const pts = data.map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / Math.max(1, max - min)) * (h - 8) - 4;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");
    return (
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-24">
        <polyline fill="none" stroke={color} strokeWidth="2" points={pts} />
      </svg>
    );
  };

  const audits = useMemo(() => (
    [
      { id: "AUD-1001", item: "Policy updates", status: "Ready" },
      { id: "AUD-1002", item: "Incident RCA logs", status: "Pending" },
      { id: "AUD-1003", item: "Training completion", status: "Ready" },
      { id: "AUD-1004", item: "Vendor compliance", status: "In Progress" },
    ]
  ), []);

  return (
    <div className="w-full px-2 md:px-4 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <BarChart3 className="h-8 w-8 text-primary" />
          Operations & Quality Management
        </h1>
        <p className="text-muted-foreground mt-1">Unified KPIs from HR, Billing, Incidents, and Compliance systems.</p>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-md">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Occupancy Rate</CardTitle><CardDescription>Inpatient bed utilization</CardDescription></CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{occ}%</div>
            <div className="mt-2">{renderLine(trend.map(t=>t.occ), "#0ea5e9")}</div>
          </CardContent>
        </Card>
        <Card className="shadow-md">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Billing Efficiency</CardTitle><CardDescription>First-pass acceptance</CardDescription></CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{billEff}%</div>
            <div className="mt-2">{renderLine(trend.map(t=>t.bill), "#22c55e")}</div>
          </CardContent>
        </Card>
        <Card className="shadow-md">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Compliance Score</CardTitle><CardDescription>Audits & certifications</CardDescription></CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{compScore}%</div>
            <div className="mt-2">{renderLine(trend.map(t=>t.comp), "#f59e0b")}</div>
          </CardContent>
        </Card>
      </div>

      {/* Trend analytics */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Trend Analytics</CardTitle>
          <CardDescription>Last 12 months across core KPIs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 rounded-lg border">
              <div className="text-sm font-medium flex items-center gap-2"><Users className="h-4 w-4" /> HR: Absenteeism</div>
              {renderLine(Array.from({length:12}).map(()=>Math.round(3+Math.random()*4)), "#60a5fa")}
            </div>
            <div className="p-3 rounded-lg border">
              <div className="text-sm font-medium flex items-center gap-2"><FileText className="h-4 w-4" /> Billing: AR Days</div>
              {renderLine(Array.from({length:12}).map(()=>Math.round(25+Math.random()*10)), "#34d399")}
            </div>
            <div className="p-3 rounded-lg border">
              <div className="text-sm font-medium flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> Incidents: Rate</div>
              {renderLine(Array.from({length:12}).map(()=>Math.round(2+Math.random()*3)), "#f87171")}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit readiness summary */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Audit Readiness</CardTitle>
          <CardDescription>Key items for next audit cycle</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {audits.map(a => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.item}</TableCell>
                  <TableCell>
                    {a.status === "Ready" && <Badge>Ready</Badge>}
                    {a.status === "In Progress" && <Badge variant="secondary">In Progress</Badge>}
                    {a.status === "Pending" && <Badge variant="outline">Pending</Badge>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
