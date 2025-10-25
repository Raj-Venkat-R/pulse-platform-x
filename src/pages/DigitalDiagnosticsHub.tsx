import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Beaker, Bell, CheckCircle2, AlertTriangle, FileText } from "lucide-react";

type Sample = {
  id: string;
  patientId: string;
  testType: string;
  status: "Collected" | "In-Process" | "Validated" | "Reported";
  qc: "Pending" | "Passed" | "Failed";
};

type ValidationItem = {
  id: string;
  patientId: string;
  testType: string;
  qc: "Pending" | "Passed" | "Failed";
  flags?: string[];
};

type AlertItem = {
  id: string;
  type: "Critical" | "Info";
  message: string;
};

const DigitalDiagnosticsHub = () => {
  const [patientId, setPatientId] = useState("");
  const [testType, setTestType] = useState("");
  const [sampleId, setSampleId] = useState("");
  const [query, setQuery] = useState("");

  const [samples, setSamples] = useState<Sample[]>([]);
  const [validations, setValidations] = useState<ValidationItem[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);

  const filteredSamples = samples.filter(
    s => !query || s.id.includes(query) || s.patientId.includes(query) || s.testType.toLowerCase().includes(query.toLowerCase())
  );

  const createOrder = () => {
    if (!patientId || !testType) return;
    const id = sampleId || `S-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
    const newSample: Sample = { id, patientId, testType, status: "Collected", qc: "Pending" };
    setSamples(prev => [newSample, ...prev]);
    setValidations(prev => [{ id, patientId, testType, qc: "Pending" }, ...prev]);
    setPatientId("");
    setTestType("");
    setSampleId("");
  };

  const runQc = (id: string) => {
    setValidations(prev => prev.map(v => v.id === id ? { ...v, qc: Math.random() > 0.15 ? "Passed" : "Failed", flags: Math.random() > 0.7 ? ["Delta high", "Hemolysis suspect"] : [] } : v));
    setSamples(prev => prev.map(s => s.id === id ? { ...s, status: "In-Process", qc: "Pending" } : s));
  };

  const verifyAndReport = (id: string) => {
    const val = validations.find(v => v.id === id);
    if (!val) return;
    if (val.qc === "Failed") {
      setAlerts(prev => [{ id: `A-${Date.now()}`, type: "Critical", message: `QC failed for ${id} (${val.testType}). Review required.` }, ...prev]);
      return;
    }
    setSamples(prev => prev.map(s => s.id === id ? { ...s, status: "Reported", qc: "Passed" } : s));
    setValidations(prev => prev.filter(v => v.id !== id));
    setAlerts(prev => [{ id: `A-${Date.now()}`, type: "Info", message: `Report verified and sent to EMR for ${id}.` }, ...prev]);
  };

  return (
    <div className="w-full px-2 md:px-4 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Beaker className="h-8 w-8 text-primary" />
          Digital Diagnostics Hub
        </h1>
        <p className="text-muted-foreground mt-1">
          Automate test orders, track samples, run AI-driven QC, validate results, and push verified reports to EMR with alerts.
        </p>
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>New Test Order</CardTitle>
          <CardDescription>Create a lab order and accession a sample</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="patientId">Patient ID</Label>
              <Input id="patientId" value={patientId} onChange={(e) => setPatientId(e.target.value)} placeholder="e.g., P-10293" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="testType">Test Type</Label>
              <Select value={testType} onValueChange={(v) => setTestType(v)}>
                <SelectTrigger id="testType">
                  <SelectValue placeholder="Select a test" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CBC">CBC</SelectItem>
                  <SelectItem value="LFT">LFT</SelectItem>
                  <SelectItem value="KFT">KFT</SelectItem>
                  <SelectItem value="CRP">CRP</SelectItem>
                  <SelectItem value="Culture">Culture & Sensitivity</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sampleId">Sample ID</Label>
              <Input id="sampleId" value={sampleId} onChange={(e) => setSampleId(e.target.value)} placeholder="auto if empty" />
            </div>
            <div className="flex items-end">
              <Button className="w-full" onClick={createOrder}>Create Order</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="shadow-md lg:col-span-2">
          <CardHeader>
            <CardTitle>Sample Tracking</CardTitle>
            <CardDescription>Collection to report with QC status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-3 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search samples by ID, patient, or test" className="pl-9" value={query} onChange={(e)=>setQuery(e.target.value)} />
              </div>
              <Button variant="outline" onClick={()=>setQuery("")}>Clear</Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sample ID</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Test</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>QC</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSamples.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-sm text-muted-foreground">No samples</TableCell>
                  </TableRow>
                ) : (
                  filteredSamples.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.id}</TableCell>
                      <TableCell>{s.patientId}</TableCell>
                      <TableCell>{s.testType}</TableCell>
                      <TableCell>
                        <Badge variant={s.status === "Reported" ? "default" : s.status === "Validated" ? "secondary" : "outline"}>{s.status}</Badge>
                      </TableCell>
                      <TableCell>
                        {s.qc === "Passed" && <span className="inline-flex items-center gap-1 text-emerald-600 text-sm"><CheckCircle2 className="h-4 w-4" />Passed</span>}
                        {s.qc === "Pending" && <span className="inline-flex items-center gap-1 text-amber-600 text-sm"><AlertTriangle className="h-4 w-4" />Pending</span>}
                        {s.qc === "Failed" && <span className="inline-flex items-center gap-1 text-red-600 text-sm"><AlertTriangle className="h-4 w-4" />Failed</span>}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Alerts</CardTitle>
            <CardDescription>Critical and informational notifications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.length === 0 && <div className="text-sm text-muted-foreground">No alerts</div>}
              {alerts.map(a => (
                <div key={a.id} className="p-3 rounded-lg border flex items-start gap-2">
                  {a.type === "Critical" ? (
                    <Bell className="h-4 w-4 text-red-600 mt-0.5" />
                  ) : (
                    <Bell className="h-4 w-4 text-sky-600 mt-0.5" />
                  )}
                  <div>
                    <div className="text-sm font-medium flex items-center gap-2">
                      <Badge variant={a.type === "Critical" ? "default" : "secondary"}>{a.type}</Badge>
                      <span>Diagnostics</span>
                    </div>
                    <p className="text-sm text-foreground mt-1">{a.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Validation Queue</CardTitle>
            <CardDescription>Run AI QC and validate test results</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sample</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Test</TableHead>
                  <TableHead>QC</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {validations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-sm text-muted-foreground">No pending validations</TableCell>
                  </TableRow>
                ) : (
                  validations.map(v => (
                    <TableRow key={v.id}>
                      <TableCell className="font-medium">{v.id}</TableCell>
                      <TableCell>{v.patientId}</TableCell>
                      <TableCell>{v.testType}</TableCell>
                      <TableCell>
                        {v.qc === "Pending" && <Badge variant="outline">Pending</Badge>}
                        {v.qc === "Passed" && <Badge>Passed</Badge>}
                        {v.qc === "Failed" && <Badge variant="destructive">Failed</Badge>}
                        {v.flags?.length ? (
                          <div className="text-xs text-amber-600 mt-1">{v.flags.join(", ")}</div>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="sm" variant="outline" onClick={() => runQc(v.id)}>Run QC</Button>
                        <Button size="sm" onClick={() => verifyAndReport(v.id)}>
                          <FileText className="h-4 w-4 mr-1" /> Report
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Shortcuts for routine workflows</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-3">
              <Button variant="outline" className="justify-start">
                <CheckCircle2 className="h-4 w-4 mr-2" /> Auto-approve normal results
              </Button>
              <Button variant="outline" className="justify-start" onClick={() => setAlerts(prev => [{ id:`A-${Date.now()}`, type:"Info", message:"Sample recollection scheduled for S-XXXX."}, ...prev])}>
                <Bell className="h-4 w-4 mr-2" /> Schedule recollection
              </Button>
              <Button variant="outline" className="justify-start" onClick={() => setAlerts(prev => [{ id:`A-${Date.now()}`, type:"Critical", message:"Critical potassium level flagged for S-XXXX."}, ...prev])}>
                <AlertTriangle className="h-4 w-4 mr-2" /> Trigger critical alert
              </Button>
              <Button variant="outline" className="justify-start">
                <Beaker className="h-4 w-4 mr-2" /> Add reflex test rule
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DigitalDiagnosticsHub;
