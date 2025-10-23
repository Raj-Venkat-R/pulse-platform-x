import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Activity, Heart, Thermometer, Wind, Droplet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Vitals() {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    patientId: "",
    patientName: "",
    bloodPressureSystolic: "",
    bloodPressureDiastolic: "",
    heartRate: "",
    temperature: "",
    respiratoryRate: "",
    oxygenSaturation: "",
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Vitals Recorded Successfully",
      description: `Vital signs for ${formData.patientName} have been logged.`,
    });
    setFormData({
      patientId: "",
      patientName: "",
      bloodPressureSystolic: "",
      bloodPressureDiastolic: "",
      heartRate: "",
      temperature: "",
      respiratoryRate: "",
      oxygenSaturation: "",
    });
  };

  const recentVitals = [
    {
      id: 1,
      patient: "John Doe",
      patientId: "P001",
      time: "10:30 AM",
      bp: "120/80",
      hr: "72",
      temp: "98.6",
      spo2: "98",
      status: "normal",
    },
    {
      id: 2,
      patient: "Sarah Smith",
      patientId: "P002",
      time: "11:15 AM",
      bp: "145/95",
      hr: "88",
      temp: "99.2",
      spo2: "96",
      status: "alert",
    },
    {
      id: 3,
      patient: "Michael Brown",
      patientId: "P003",
      time: "12:00 PM",
      bp: "118/78",
      hr: "68",
      temp: "98.4",
      spo2: "99",
      status: "normal",
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Activity className="h-8 w-8 text-primary" />
          Digital Vitals Logging
        </h1>
        <p className="text-muted-foreground mt-1">Record and monitor patient vital signs</p>
      </div>

      {/* Vitals Input Form */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Log Patient Vitals</CardTitle>
          <CardDescription>Enter vital sign measurements for real-time monitoring</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="patientId">Patient ID *</Label>
                <Input
                  id="patientId"
                  placeholder="P001"
                  value={formData.patientId}
                  onChange={(e) => handleInputChange("patientId", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="patientName">Patient Name *</Label>
                <Input
                  id="patientName"
                  value={formData.patientName}
                  onChange={(e) => handleInputChange("patientName", e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="bpSystolic" className="flex items-center gap-2">
                  <Heart className="h-4 w-4 text-destructive" />
                  Blood Pressure (mmHg) *
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="bpSystolic"
                    type="number"
                    placeholder="Systolic"
                    value={formData.bloodPressureSystolic}
                    onChange={(e) => handleInputChange("bloodPressureSystolic", e.target.value)}
                    required
                  />
                  <span className="self-center text-muted-foreground">/</span>
                  <Input
                    type="number"
                    placeholder="Diastolic"
                    value={formData.bloodPressureDiastolic}
                    onChange={(e) => handleInputChange("bloodPressureDiastolic", e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="heartRate" className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  Heart Rate (bpm) *
                </Label>
                <Input
                  id="heartRate"
                  type="number"
                  placeholder="72"
                  value={formData.heartRate}
                  onChange={(e) => handleInputChange("heartRate", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="temperature" className="flex items-center gap-2">
                  <Thermometer className="h-4 w-4 text-warning" />
                  Temperature (°F) *
                </Label>
                <Input
                  id="temperature"
                  type="number"
                  step="0.1"
                  placeholder="98.6"
                  value={formData.temperature}
                  onChange={(e) => handleInputChange("temperature", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="respiratoryRate" className="flex items-center gap-2">
                  <Wind className="h-4 w-4 text-accent" />
                  Respiratory Rate (breaths/min) *
                </Label>
                <Input
                  id="respiratoryRate"
                  type="number"
                  placeholder="16"
                  value={formData.respiratoryRate}
                  onChange={(e) => handleInputChange("respiratoryRate", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="oxygenSaturation" className="flex items-center gap-2">
                  <Droplet className="h-4 w-4 text-secondary" />
                  Oxygen Saturation (%) *
                </Label>
                <Input
                  id="oxygenSaturation"
                  type="number"
                  placeholder="98"
                  value={formData.oxygenSaturation}
                  onChange={(e) => handleInputChange("oxygenSaturation", e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="flex gap-4 justify-end">
              <Button type="button" variant="outline">
                Clear
              </Button>
              <Button type="submit">Save Vitals</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Recent Vitals */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Recent Vital Sign Recordings</CardTitle>
          <CardDescription>Latest vitals logged today</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentVitals.map((vital) => (
              <div
                key={vital.id}
                className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Activity className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{vital.patient}</p>
                    <p className="text-sm text-muted-foreground">ID: {vital.patientId} • {vital.time}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">BP</p>
                    <p className="text-sm font-medium">{vital.bp}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">HR</p>
                    <p className="text-sm font-medium">{vital.hr}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">Temp</p>
                    <p className="text-sm font-medium">{vital.temp}°F</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">SpO2</p>
                    <p className="text-sm font-medium">{vital.spo2}%</p>
                  </div>
                  <Badge variant={vital.status === "normal" ? "default" : "destructive"}>
                    {vital.status === "normal" ? "Normal" : "Alert"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
