import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bed, AlertCircle } from "lucide-react";

export default function Beds() {
  const beds = [
    { id: "B-101", ward: "ICU", patient: "John Doe", status: "occupied", condition: "critical" },
    { id: "B-102", ward: "ICU", patient: null, status: "available", condition: null },
    { id: "B-103", ward: "ICU", patient: "Sarah Smith", status: "occupied", condition: "stable" },
    { id: "B-201", ward: "General Ward A", patient: "Michael Brown", status: "occupied", condition: "stable" },
    { id: "B-202", ward: "General Ward A", patient: null, status: "cleaning", condition: null },
    { id: "B-203", ward: "General Ward A", patient: "Emma Wilson", status: "occupied", condition: "stable" },
    { id: "B-301", ward: "General Ward B", patient: null, status: "available", condition: null },
    { id: "B-302", ward: "General Ward B", patient: null, status: "available", condition: null },
  ];

  const stats = {
    total: 120,
    occupied: 87,
    available: 28,
    cleaning: 5,
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Bed className="h-8 w-8 text-primary" />
          Bed Management
        </h1>
        <p className="text-muted-foreground mt-1">Real-time bed allocation and availability tracking</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="shadow-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Total Beds</p>
              <p className="text-3xl font-bold text-foreground">{stats.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-md border-destructive/20">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Occupied</p>
              <p className="text-3xl font-bold text-destructive">{stats.occupied}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-md border-success/20">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Available</p>
              <p className="text-3xl font-bold text-success">{stats.available}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Cleaning</p>
              <p className="text-3xl font-bold text-foreground">{stats.cleaning}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bed List */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Bed Allocation Status</CardTitle>
          <CardDescription>Current status of all hospital beds</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {beds.map((bed) => (
              <div
                key={bed.id}
                className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`p-3 rounded-lg ${
                      bed.status === "occupied"
                        ? "bg-destructive/10"
                        : bed.status === "available"
                        ? "bg-success/10"
                        : "bg-muted"
                    }`}
                  >
                    <Bed
                      className={`h-5 w-5 ${
                        bed.status === "occupied"
                          ? "text-destructive"
                          : bed.status === "available"
                          ? "text-success"
                          : "text-muted-foreground"
                      }`}
                    />
                  </div>
                  <div>
                    <p className="font-bold text-foreground">{bed.id}</p>
                    <p className="text-sm text-muted-foreground">{bed.ward}</p>
                    {bed.patient && <p className="text-sm font-medium text-foreground">{bed.patient}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {bed.condition && (
                    <div className="flex items-center gap-2">
                      {bed.condition === "critical" && <AlertCircle className="h-4 w-4 text-destructive" />}
                      <Badge variant={bed.condition === "critical" ? "destructive" : "default"}>
                        {bed.condition}
                      </Badge>
                    </div>
                  )}
                  <Badge
                    variant={
                      bed.status === "occupied"
                        ? "destructive"
                        : bed.status === "available"
                        ? "default"
                        : "secondary"
                    }
                  >
                    {bed.status}
                  </Badge>
                  <Button variant="outline" size="sm">
                    {bed.status === "available" ? "Assign" : "Details"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
