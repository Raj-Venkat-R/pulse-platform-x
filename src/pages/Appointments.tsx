import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, CalendarPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Appointments() {
  const { toast } = useToast();
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [formData, setFormData] = useState({
    patientId: "",
    patientName: "",
    department: "",
    doctor: "",
    date: "",
    time: "",
    reason: "",
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Appointment Scheduled",
      description: `Appointment for ${formData.patientName} on ${formData.date} at ${formData.time}`,
    });
    setShowScheduleForm(false);
    setFormData({
      patientId: "",
      patientName: "",
      department: "",
      doctor: "",
      date: "",
      time: "",
      reason: "",
    });
  };

  const todayAppointments = [
    { id: 1, time: "09:00 AM", patient: "John Doe", doctor: "Dr. Smith", department: "Cardiology", status: "confirmed" },
    { id: 2, time: "10:30 AM", patient: "Sarah Johnson", doctor: "Dr. Patel", department: "Orthopedics", status: "pending" },
    { id: 3, time: "11:00 AM", patient: "Michael Brown", doctor: "Dr. Lee", department: "Neurology", status: "confirmed" },
    { id: 4, time: "02:00 PM", patient: "Emma Wilson", doctor: "Dr. Smith", department: "Cardiology", status: "completed" },
    { id: 5, time: "03:30 PM", patient: "David Chen", doctor: "Dr. Garcia", department: "Pediatrics", status: "pending" },
  ];

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Calendar className="h-8 w-8 text-primary" />
            Appointment Management
          </h1>
          <p className="text-muted-foreground mt-1">Schedule and manage patient appointments</p>
        </div>
        <Button
          onClick={() => setShowScheduleForm(!showScheduleForm)}
          className="gap-2"
        >
          <CalendarPlus className="h-4 w-4" />
          {showScheduleForm ? "View Schedule" : "New Appointment"}
        </Button>
      </div>

      {showScheduleForm ? (
        /* Schedule Form */
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Schedule New Appointment</CardTitle>
            <CardDescription>Book an appointment for a patient</CardDescription>
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
                <div className="space-y-2">
                  <Label htmlFor="department">Department *</Label>
                  <Select value={formData.department} onValueChange={(value) => handleInputChange("department", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cardiology">Cardiology</SelectItem>
                      <SelectItem value="orthopedics">Orthopedics</SelectItem>
                      <SelectItem value="neurology">Neurology</SelectItem>
                      <SelectItem value="pediatrics">Pediatrics</SelectItem>
                      <SelectItem value="general">General Medicine</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="doctor">Doctor *</Label>
                  <Select value={formData.doctor} onValueChange={(value) => handleInputChange("doctor", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select doctor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dr-smith">Dr. Smith</SelectItem>
                      <SelectItem value="dr-patel">Dr. Patel</SelectItem>
                      <SelectItem value="dr-lee">Dr. Lee</SelectItem>
                      <SelectItem value="dr-garcia">Dr. Garcia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Date *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => handleInputChange("date", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time">Time *</Label>
                  <Input
                    id="time"
                    type="time"
                    value={formData.time}
                    onChange={(e) => handleInputChange("time", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="reason">Reason for Visit</Label>
                  <Input
                    id="reason"
                    placeholder="Brief description of the consultation reason"
                    value={formData.reason}
                    onChange={(e) => handleInputChange("reason", e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-4 justify-end">
                <Button type="button" variant="outline" onClick={() => setShowScheduleForm(false)}>
                  Cancel
                </Button>
                <Button type="submit">Schedule Appointment</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        /* Appointment List */
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Today's Appointments
            </CardTitle>
            <CardDescription>Scheduled appointments for today - October 23, 2025</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {todayAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-primary/10">
                      <Clock className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{appointment.patient}</p>
                      <p className="text-sm text-muted-foreground">
                        {appointment.doctor} • {appointment.department}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-lg font-bold text-foreground">{appointment.time}</p>
                    </div>
                    <Badge
                      variant={
                        appointment.status === "confirmed"
                          ? "default"
                          : appointment.status === "completed"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                    </Badge>
                    <Button variant="outline" size="sm">Details</Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
