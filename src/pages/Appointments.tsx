import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Calendar, Clock, CalendarPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { addAppointmentFirestore, listAppointmentsFirestore } from "@/lib/firebase";

export default function Appointments() {
  const { toast } = useToast();
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [loading, setLoading] = useState(false);
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

  const [appointments, setAppointments] = useState<any[]>([]);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState<any | null>(null);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      const items = await listAppointmentsFirestore();
      setAppointments(items);
    } catch (err) {
      console.error("Failed to load appointments", err);
      toast({ title: "Failed to load appointments", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      await addAppointmentFirestore({
        patient_id: formData.patientId,
        patient_name: formData.patientName,
        department: formData.department,
        doctor: formData.doctor,
        date: formData.date,
        time: formData.time,
        reason: formData.reason,
        status: "confirmed",
      });
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
      loadAppointments();
    } catch (err) {
      console.error("Failed to schedule appointment", err);
      toast({ title: "Failed to schedule appointment", description: String((err as any)?.message || err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const todayAppointments = appointments;

  return (
    <div className="w-full px-2 md:px-4 py-8 space-y-6">
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
                <Button type="submit" disabled={loading} className="gap-2">
                  {loading && <span className="inline-block h-4 w-4 border-2 border-current border-r-transparent rounded-full animate-spin" />}
                  Schedule Appointment
                </Button>
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
              {loading && <div className="text-sm text-muted-foreground">Loading appointments...</div>}
              {!loading && todayAppointments.length === 0 && (
                <div className="text-sm text-muted-foreground">No appointments found.</div>
              )}
              {!loading && todayAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-primary/10">
                      <Clock className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{appointment.patient_name}</p>
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
                      {String(appointment.status || "").charAt(0).toUpperCase() + String(appointment.status || "").slice(1)}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedAppt(appointment);
                        setDetailsOpen(true);
                      }}
                    >
                      Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Details Modal */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Appointment Details</DialogTitle>
            <DialogDescription>Full information for the selected appointment</DialogDescription>
          </DialogHeader>
          {selectedAppt && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Patient</p>
                  <p className="font-medium">{selectedAppt.patient_name}</p>
                </div>
                <Badge>{String(selectedAppt.status || "").charAt(0).toUpperCase() + String(selectedAppt.status || "").slice(1)}</Badge>
              </div>

              {selectedAppt.patient_id && (
                <div>
                  <p className="text-sm text-muted-foreground">Patient ID</p>
                  <p className="font-mono text-sm">{selectedAppt.patient_id}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">Department</p>
                  <p className="font-medium">{selectedAppt.department}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Doctor</p>
                  <p className="font-medium">{selectedAppt.doctor}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium">{selectedAppt.date}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Time</p>
                  <p className="font-medium">{selectedAppt.time}</p>
                </div>
              </div>

              {selectedAppt.reason && (
                <div>
                  <p className="text-sm text-muted-foreground">Reason</p>
                  <p className="font-medium">{selectedAppt.reason}</p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setDetailsOpen(false)}>Close</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
