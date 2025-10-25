import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { addComplaintFirestore } from "@/lib/firebase";
import { ClipboardList } from "lucide-react";

const channels = ["Web","Kiosk","IVR","WhatsApp","Email"] as const;
const categories = ["Clinical","Billing","Housekeeping","Pharmacy","IT","Other"];

export default function SubmitComplaint() {
  const [channel, setChannel] = useState<string>("");
  const [subject, setSubject] = useState("");
  const [reporter, setReporter] = useState("");
  const [desc, setDesc] = useState("");
  const [category, setCategory] = useState<string>("");
  const [urgency, setUrgency] = useState<'low'|'medium'|'high'|'critical' | ''>("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const submit = async () => {
    if (!channel || !subject || !reporter || !desc || !category || !urgency) return;
    setBusy(true);
    try {
      const complaint_number = `C-${Math.random().toString(36).slice(2,7).toUpperCase()}`;
      await addComplaintFirestore({
        complaint_number,
        subject,
        description: desc,
        category,
        urgency_level: urgency,
        status: 'open',
        channel,
        reporter,
      } as any);
      navigate('/complaints/tracker');
    } catch (e) {
      // minimal feedback without introducing new toast deps
      window.alert('Failed to submit complaint');
    } finally {
      setBusy(false);
    }
  };

  const isValid = !!channel && !!subject && !!reporter && !!desc && !!category && !!urgency;

  return (
    <div className="w-full px-2 md:px-4 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <ClipboardList className="h-8 w-8 text-primary" />
          Submit Complaint
        </h1>
        <p className="text-muted-foreground mt-1">Create a ticket without AI categorization. All fields are required.</p>
      </div>

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Complaint Details</CardTitle>
          <CardDescription>Provide the basic information for your complaint</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="space-y-2">
              <Label>Channel</Label>
              <Select value={channel} onValueChange={(v)=>setChannel(v)}>
                <SelectTrigger><SelectValue placeholder="Select channel" /></SelectTrigger>
                <SelectContent>
                  {channels.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="subject">Subject</Label>
              <Input id="subject" value={subject} onChange={(e)=>setSubject(e.target.value)} placeholder="Short title" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="reporter">Patient/Staff ID</Label>
              <Input id="reporter" value={reporter} onChange={(e)=>setReporter(e.target.value)} placeholder="e.g., P-1005 or S-204" />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={(v)=>setCategory(v)}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Urgency</Label>
              <Select value={urgency} onValueChange={(v)=>setUrgency(v as any)}>
                <SelectTrigger><SelectValue placeholder="Select urgency" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-6">
              <Label htmlFor="desc">Description</Label>
              <Textarea id="desc" rows={4} value={desc} onChange={(e)=>setDesc(e.target.value)} placeholder="Describe the issue" />
            </div>
            <div className="flex items-end">
              <Button disabled={!isValid || busy} onClick={submit}>Submit</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
