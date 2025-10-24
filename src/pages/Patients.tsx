import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Search, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { addPatientFirestore, listPatientsFirestore, searchPatientsFirestore } from "@/lib/firebase";

type Patient = {
  id: string | number;
  first_name?: string;
  last_name?: string;
  name?: string;
  age?: number;
  gender?: string;
  phone?: string;
  email?: string;
  date_of_birth?: string;
  address?: string;
  lastVisit?: string;
  status?: string;
};

export default function Patients() {
  const { toast } = useToast();
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    gender: "",
    phone: "",
    email: "",
    address: "",
    emergencyContact: "",
    bloodGroup: "",
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPatients = async (query = "") => {
    try {
      setLoading(true);
      const list = query ? await searchPatientsFirestore(query) : await listPatientsFirestore();
      setPatients(list);
    } catch (err) {
      console.error("Failed to fetch patients", err);
      toast({ title: "Failed to load patients", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients("");
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const payload = {
        first_name: formData.firstName,
        last_name: formData.lastName,
        date_of_birth: formData.dateOfBirth,
        gender: formData.gender,
        phone: formData.phone,
        email: formData.email,
        address: formData.address,
        emergency_contact: formData.emergencyContact,
        blood_group: formData.bloodGroup,
      };
      await addPatientFirestore(payload);
      {
        toast({
          title: "Patient Registered Successfully",
          description: `${formData.firstName} ${formData.lastName} has been added to the system.`,
        });
        setShowRegistrationForm(false);
        setFormData({
          firstName: "",
          lastName: "",
          dateOfBirth: "",
          gender: "",
          phone: "",
          email: "",
          address: "",
          emergencyContact: "",
          bloodGroup: "",
        });
        // refresh list
        fetchPatients("");
      }
    } catch (err: any) {
      console.error("Create patient failed", err);
      toast({ title: "Failed to create patient", description: String(err?.message || err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };
  const recentPatients = patients;

  return (
    <div className="w-full px-2 md:px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Users className="h-8 w-8 text-primary" />
            Patient Management
          </h1>
          <p className="text-muted-foreground mt-1">Register and manage patient information</p>
        </div>
        <Button
          onClick={() => setShowRegistrationForm(!showRegistrationForm)}
          className="gap-2"
        >
          <UserPlus className="h-4 w-4" />
          {showRegistrationForm ? "View Patients" : "New Patient"}
        </Button>
      </div>

      {showRegistrationForm ? (
        /* Registration Form */
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Patient Registration</CardTitle>
            <CardDescription>Enter patient details to create a new medical record</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange("firstName", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange("lastName", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => handleInputChange("dateOfBirth", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender *</Label>
                  <Select value={formData.gender} onValueChange={(value) => handleInputChange("gender", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bloodGroup">Blood Group</Label>
                  <Select value={formData.bloodGroup} onValueChange={(value) => handleInputChange("bloodGroup", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select blood group" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A+">A+</SelectItem>
                      <SelectItem value="A-">A-</SelectItem>
                      <SelectItem value="B+">B+</SelectItem>
                      <SelectItem value="B-">B-</SelectItem>
                      <SelectItem value="AB+">AB+</SelectItem>
                      <SelectItem value="AB-">AB-</SelectItem>
                      <SelectItem value="O+">O+</SelectItem>
                      <SelectItem value="O-">O-</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergencyContact">Emergency Contact *</Label>
                  <Input
                    id="emergencyContact"
                    type="tel"
                    value={formData.emergencyContact}
                    onChange={(e) => handleInputChange("emergencyContact", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleInputChange("address", e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-4 justify-end">
                <Button type="button" variant="outline" onClick={() => setShowRegistrationForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="gap-2">
                  {loading && <span className="inline-block h-4 w-4 border-2 border-current border-r-transparent rounded-full animate-spin" />}
                  Register Patient
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        /* Patient List */
        <>
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Search Patients</CardTitle>
              <CardDescription>Find patients by name, ID, or phone number</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, ID, or phone..."
                    className="pl-10"
                    onKeyDown={(e)=>{ if(e.key==='Enter'){ const target=e.target as HTMLInputElement; fetchPatients(target.value); } }}
                  />
                </div>
                <Button onClick={() => fetchPatients("")}>Refresh</Button>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardHeader>
              <CardTitle>Recent Patients</CardTitle>
              <CardDescription>Recently registered and active patients</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {loading && <div className="text-sm text-muted-foreground">Loading patients...</div>}
                {!loading && recentPatients.length === 0 && (
                  <div className="text-sm text-muted-foreground">No patients found.</div>
                )}
                {!loading && recentPatients.map((patient) => (
                  <div
                     key={patient.id}
                     className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-lg font-bold text-primary">
                          {(
                            (patient.first_name || "").charAt(0) + (patient.last_name || "").charAt(0)
                          ) || (patient.name ? patient.name.split(" ").map(n=>n[0]).join("") : "P")}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{patient.name || `${patient.first_name ?? ""} ${patient.last_name ?? ""}`.trim()}</p>
                        <p className="text-sm text-muted-foreground">
                          ID: {patient.id}{patient.age ? ` • ${patient.age} years` : ""} • {patient.gender || ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Last Visit</p>
                        <p className="text-sm font-medium">{patient.lastVisit || "—"}</p>
                      </div>
                      <Badge variant={patient.status === "Active" ? "default" : "secondary"}>
                        {patient.status || "Active"}
                      </Badge>
                      <Button variant="outline" size="sm">View Details</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
