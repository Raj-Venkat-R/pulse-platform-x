import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Ambulance, Clock, MapPin } from "lucide-react";

export default function Emergency() {
  const emergencyCases = [
    {
      id: "ER-4521",
      type: "Cardiac",
      patient: "Unknown - Ambulance Incoming",
      severity: "critical",
      eta: "3 mins",
      location: "Bay 3",
      status: "incoming",
    },
    {
      id: "ER-4520",
      type: "Trauma",
      patient: "Jane Doe",
      severity: "high",
      eta: "In progress",
      location: "Bay 1",
      status: "active",
    },
    {
      id: "ER-4519",
      type: "Respiratory",
      patient: "Robert Smith",
      severity: "moderate",
      eta: "Stabilized",
      location: "Bay 5",
      status: "stable",
    },
    {
      id: "ER-4518",
      type: "Allergic Reaction",
      patient: "Emily Johnson",
      severity: "moderate",
      eta: "Under observation",
      location: "Bay 7",
      status: "stable",
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-destructive to-warning rounded-xl p-8 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
              <AlertTriangle className="h-8 w-8" />
              Emergency Department
            </h1>
            <p className="text-white/90 text-lg">Real-time emergency case management and tracking</p>
          </div>
          <div className="text-right">
            <p className="text-5xl font-bold">5</p>
            <p className="text-white/90">Active Cases</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Button variant="destructive" size="lg" className="h-24 flex-col gap-2">
          <Ambulance className="h-6 w-6" />
          <span>Log New Emergency</span>
        </Button>
        <Button variant="warning" size="lg" className="h-24 flex-col gap-2">
          <MapPin className="h-6 w-6" />
          <span>Ambulance Dispatch</span>
        </Button>
        <Button variant="outline" size="lg" className="h-24 flex-col gap-2">
          <AlertTriangle className="h-6 w-6" />
          <span>Triage Management</span>
        </Button>
      </div>

      {/* Emergency Cases */}
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-6 w-6" />
            Active Emergency Cases
          </CardTitle>
          <CardDescription>Current emergency department cases requiring attention</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {emergencyCases.map((case_) => (
              <div
                key={case_.id}
                className="p-6 rounded-lg border-2 hover:shadow-md transition-all"
                style={{
                  borderColor:
                    case_.severity === "critical"
                      ? "hsl(var(--destructive))"
                      : case_.severity === "high"
                      ? "hsl(var(--warning))"
                      : "hsl(var(--border))",
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={
                          case_.severity === "critical"
                            ? "destructive"
                            : case_.severity === "high"
                            ? "default"
                            : "secondary"
                        }
                        className="text-sm"
                      >
                        {case_.severity.toUpperCase()}
                      </Badge>
                      <h3 className="text-xl font-bold text-foreground">{case_.id}</h3>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-lg font-medium text-foreground">{case_.type}</span>
                    </div>
                    <div className="space-y-2">
                      <p className="text-foreground font-medium">{case_.patient}</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {case_.eta}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {case_.location}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      variant={case_.status === "incoming" ? "destructive" : "default"}
                      size="sm"
                    >
                      {case_.status === "incoming" ? "Prepare Bay" : "View Details"}
                    </Button>
                    {case_.status === "active" && (
                      <Button variant="outline" size="sm">
                        Update Status
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ER Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">Emergency Bays</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Total Bays</span>
                <span className="font-bold text-2xl">10</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Occupied</span>
                <span className="font-bold text-2xl text-warning">7</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Available</span>
                <span className="font-bold text-2xl text-success">3</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">Ambulances</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Total Units</span>
                <span className="font-bold text-2xl">8</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">On Route</span>
                <span className="font-bold text-2xl text-destructive">2</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Available</span>
                <span className="font-bold text-2xl text-success">6</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">Staff on Duty</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Doctors</span>
                <span className="font-bold text-2xl">4</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Nurses</span>
                <span className="font-bold text-2xl">12</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Paramedics</span>
                <span className="font-bold text-2xl">6</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
