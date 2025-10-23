import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, TrendingUp, Calendar } from "lucide-react";

export default function Reports() {
  const reports = [
    {
      id: 1,
      title: "Daily Patient Summary",
      description: "Overview of patient admissions, discharges, and current census",
      type: "Daily",
      date: "2025-10-23",
      status: "ready",
    },
    {
      id: 2,
      title: "Emergency Department Performance",
      description: "Response times, patient volumes, and case severity analysis",
      type: "Weekly",
      date: "2025-10-20",
      status: "ready",
    },
    {
      id: 3,
      title: "Bed Occupancy Analytics",
      description: "Ward-wise bed utilization and occupancy trends",
      type: "Monthly",
      date: "2025-10-01",
      status: "ready",
    },
    {
      id: 4,
      title: "Patient Satisfaction Metrics",
      description: "Feedback analysis and satisfaction score trends",
      type: "Monthly",
      date: "2025-10-01",
      status: "ready",
    },
    {
      id: 5,
      title: "Clinical Operations Dashboard",
      description: "Appointment adherence, vitals logging, and consultation metrics",
      type: "Weekly",
      date: "2025-10-20",
      status: "ready",
    },
    {
      id: 6,
      title: "Financial Summary Report",
      description: "Revenue, expenses, and billing analysis",
      type: "Monthly",
      date: "2025-10-01",
      status: "processing",
    },
  ];

  const quickStats = [
    { label: "Reports Generated Today", value: "12", trend: "+3" },
    { label: "Total Reports This Month", value: "147", trend: "+18%" },
    { label: "Pending Reports", value: "3", trend: "-2" },
  ];

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <FileText className="h-8 w-8 text-primary" />
          Reports & Analytics
        </h1>
        <p className="text-muted-foreground mt-1">Access and download hospital performance reports</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {quickStats.map((stat, index) => (
          <Card key={index} className="shadow-md">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <div className="flex items-end justify-between">
                  <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                  <span className="text-sm font-medium text-success flex items-center gap-1">
                    <TrendingUp className="h-4 w-4" />
                    {stat.trend}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Generate New Report */}
      <Card className="shadow-md bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-1">Generate Custom Report</h3>
              <p className="text-sm text-muted-foreground">
                Create customized reports based on specific date ranges and criteria
              </p>
            </div>
            <Button className="gap-2">
              <Calendar className="h-4 w-4" />
              New Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Available Reports */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Available Reports</CardTitle>
          <CardDescription>Download or view generated reports</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {reports.map((report) => (
              <div
                key={report.id}
                className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground">{report.title}</h4>
                    <p className="text-sm text-muted-foreground">{report.description}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <Badge variant="outline">{report.type}</Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {report.date}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={report.status === "ready" ? "default" : "secondary"}>
                    {report.status}
                  </Badge>
                  {report.status === "ready" ? (
                    <Button variant="outline" size="sm" className="gap-2">
                      <Download className="h-4 w-4" />
                      Download
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" disabled>
                      Processing...
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Report Categories */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-md hover:shadow-lg transition-shadow cursor-pointer">
          <CardContent className="pt-6">
            <h3 className="font-semibold text-foreground mb-2">Clinical Reports</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Patient records, treatment outcomes, and clinical performance metrics
            </p>
            <Button variant="outline" size="sm" className="w-full">
              View Reports
            </Button>
          </CardContent>
        </Card>
        <Card className="shadow-md hover:shadow-lg transition-shadow cursor-pointer">
          <CardContent className="pt-6">
            <h3 className="font-semibold text-foreground mb-2">Administrative Reports</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Staff schedules, resource allocation, and operational efficiency
            </p>
            <Button variant="outline" size="sm" className="w-full">
              View Reports
            </Button>
          </CardContent>
        </Card>
        <Card className="shadow-md hover:shadow-lg transition-shadow cursor-pointer">
          <CardContent className="pt-6">
            <h3 className="font-semibold text-foreground mb-2">Financial Reports</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Billing, revenue analysis, and budget tracking reports
            </p>
            <Button variant="outline" size="sm" className="w-full">
              View Reports
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
