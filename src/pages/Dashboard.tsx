import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  Calendar, 
  Bed, 
  Activity,
  AlertTriangle,
  Clock,
  TrendingUp,
  FileText,
  UserPlus,
  Stethoscope,
  Ambulance,
  Heart
} from "lucide-react";

const recentActivities = [
  { id: 1, type: "admission", patient: "John Doe", action: "Admitted to ICU - Bed 12", time: "5 mins ago", priority: "high" },
  { id: 2, type: "appointment", patient: "Sarah Smith", action: "Scheduled cardiology consultation", time: "12 mins ago", priority: "normal" },
  { id: 3, type: "discharge", patient: "Michael Brown", action: "Discharged from Ward A", time: "25 mins ago", priority: "normal" },
  { id: 4, type: "emergency", patient: "Emergency Case #4521", action: "Ambulance arriving in 3 mins", time: "30 mins ago", priority: "critical" },
  { id: 5, type: "vitals", patient: "Emma Wilson", action: "Vital signs recorded - Normal", time: "45 mins ago", priority: "normal" },
];

const emergencyAlerts = [
  { id: 1, message: "Critical patient in ER Bay 3 - Requires immediate attention", severity: "critical", time: "2 mins ago" },
  { id: 2, message: "ICU Bed 8 - Patient vitals abnormal", severity: "high", time: "15 mins ago" },
  { id: 3, message: "Ambulance ETA 5 minutes - Cardiac emergency", severity: "critical", time: "18 mins ago" },
];

const quickActions = [
  { icon: UserPlus, label: "Register Patient", path: "/patients", variant: "default" as const },
  { icon: Calendar, label: "New Appointment", path: "/appointments", variant: "default" as const },
  { icon: Activity, label: "Log Vitals", path: "/vitals", variant: "default" as const },
  { icon: Ambulance, label: "Emergency Case", path: "/emergency", variant: "destructive" as const },
];

export default function Dashboard() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary to-accent rounded-xl p-8 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Welcome to MediCare HMS</h1>
            <p className="text-white/90 text-lg">Comprehensive hospital management at your fingertips</p>
          </div>
          <Heart className="h-16 w-16 opacity-20" />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Patients"
          value="1,247"
          icon={Users}
          trend={{ value: "12% from last month", isPositive: true }}
          variant="primary"
        />
        <StatCard
          title="Today's Appointments"
          value="43"
          icon={Calendar}
          trend={{ value: "8 pending", isPositive: false }}
          variant="success"
        />
        <StatCard
          title="Occupied Beds"
          value="87/120"
          icon={Bed}
          trend={{ value: "72% occupancy", isPositive: true }}
          variant="warning"
        />
        <StatCard
          title="Emergency Cases"
          value="5"
          icon={AlertTriangle}
          trend={{ value: "Active now", isPositive: false }}
          variant="destructive"
        />
      </div>

      {/* Quick Actions */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Quick Actions
          </CardTitle>
          <CardDescription>Frequently used operations for faster workflow</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Button
                  key={action.label}
                  variant={action.variant}
                  className="h-24 flex-col gap-2"
                  onClick={() => window.location.href = action.path}
                >
                  <Icon className="h-6 w-6" />
                  <span>{action.label}</span>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Emergency Alerts */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Emergency Alerts
            </CardTitle>
            <CardDescription>Critical notifications requiring immediate attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {emergencyAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-start gap-3 p-4 rounded-lg border-l-4 bg-card"
                  style={{
                    borderLeftColor: alert.severity === "critical" 
                      ? "hsl(var(--destructive))" 
                      : "hsl(var(--warning))"
                  }}
                >
                  <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium text-foreground">{alert.message}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {alert.time}
                    </p>
                  </div>
                  <Badge variant={alert.severity === "critical" ? "destructive" : "default"}>
                    {alert.severity.toUpperCase()}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity
            </CardTitle>
            <CardDescription>Latest events and updates across the hospital</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="p-2 rounded-full bg-primary/10">
                    {activity.type === "emergency" && <Ambulance className="h-4 w-4 text-destructive" />}
                    {activity.type === "admission" && <Bed className="h-4 w-4 text-primary" />}
                    {activity.type === "appointment" && <Calendar className="h-4 w-4 text-success" />}
                    {activity.type === "discharge" && <FileText className="h-4 w-4 text-muted-foreground" />}
                    {activity.type === "vitals" && <Stethoscope className="h-4 w-4 text-accent" />}
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium text-foreground">{activity.patient}</p>
                    <p className="text-xs text-muted-foreground">{activity.action}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {activity.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Status */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>System Status</CardTitle>
          <CardDescription>Overview of hospital departments and services</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg border border-border bg-card hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Emergency Dept</span>
                <Badge variant="destructive">Active</Badge>
              </div>
              <p className="text-2xl font-bold">5 Cases</p>
              <p className="text-xs text-muted-foreground">2 critical, 3 moderate</p>
            </div>
            <div className="p-4 rounded-lg border border-border bg-card hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Operation Theaters</span>
                <Badge className="bg-success">Operational</Badge>
              </div>
              <p className="text-2xl font-bold">3/5 In Use</p>
              <p className="text-xs text-muted-foreground">2 surgeries scheduled</p>
            </div>
            <div className="p-4 rounded-lg border border-border bg-card hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">ICU</span>
                <Badge className="bg-warning">Near Capacity</Badge>
              </div>
              <p className="text-2xl font-bold">14/16 Beds</p>
              <p className="text-xs text-muted-foreground">87.5% occupancy</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
