import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, Mail, Phone, MessageCircle, Globe, Bot, ClipboardList, Plus } from "lucide-react";
import { subscribeComplaintsFirestore, updateComplaintFirestore } from "@/lib/firebase";
import { useNavigate } from "react-router-dom";

 type Ticket = {
  id: string;
  channel: "Web" | "Kiosk" | "IVR" | "WhatsApp" | "Email";
  subject: string;
  description: string;
  reporter: string; // patient/staff id
  category: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  status: "New" | "In-Progress" | "Pending" | "Resolved";
  createdAt: number;
  updatedAt: number;
  slaMin: number;
};

const channels = ["Web","Kiosk","IVR","WhatsApp","Email"] as const;
const categories = ["Clinical","Billing","Housekeeping","Pharmacy","IT","Other"];

function aiCategorize(subject: string, description: string): { category: string; priority: Ticket["priority"]; slaMin: number; escalate: boolean } {
  const text = `${subject} ${description}`.toLowerCase();
  let category = "Other";
  if (/bill|charge|payment|invoice/.test(text)) category = "Billing";
  else if (/clean|spill|sanit|wash|housekeep/.test(text)) category = "Housekeeping";
  else if (/drug|med|pharma|tablet|dose/.test(text)) category = "Pharmacy";
  else if (/login|network|system|it|computer|printer/.test(text)) category = "IT";
  else if (/pain|nurse|doctor|clinical|ward/.test(text)) category = "Clinical";
  let priority: Ticket["priority"] = "Medium";
  if (/critical|urgent|immediate|bleeding|no pulse/.test(text)) priority = "Critical";
  else if (/delay|escalate|angry|unhappy|not working/.test(text)) priority = "High";
  else if (/minor|later|ok/.test(text)) priority = "Low";
  const slaMin = priority === "Critical" ? 30 : priority === "High" ? 120 : priority === "Medium" ? 360 : 720;
  const escalate = priority === "Critical" || (priority === "High" && (category === "Clinical" || category === "IT"));
  return { category, priority, slaMin, escalate };
}

export default function ComplaintIssueTracker() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [alerts, setAlerts] = useState<{ id: string; msg: string }[]>([]);
  const navigate = useNavigate();


  const advance = async (id: string) => {
    const t = tickets.find(x => x.id === id);
    if (!t) return;
    const next = t.status === 'New' ? 'In-Progress' : t.status === 'In-Progress' ? 'Pending' : 'Resolved';
    const statusMap: Record<Ticket['status'], 'open'|'in_progress'|'pending_customer'|'resolved'> = {
      'New': 'open', 'In-Progress': 'in_progress', 'Pending': 'pending_customer', 'Resolved': 'resolved'
    };
    await updateComplaintFirestore(id, { status: statusMap[next] });
  };

  useEffect(() => {
    const unsub = subscribeComplaintsFirestore((items) => {
      // Map Firestore complaints -> UI tickets
      const mapped: Ticket[] = items.map((d: any) => {
        const priority = (d.urgency_level ?? 'medium') as 'low'|'medium'|'high'|'critical';
        const statusRev: Record<string, Ticket['status']> = {
          'open': 'New', 'in_progress': 'In-Progress', 'pending_customer': 'Pending', 'resolved': 'Resolved', 'closed': 'Resolved', 'cancelled': 'Resolved'
        };
        const createdAt = d.created_at?.toMillis ? d.created_at.toMillis() : (d.created_at || Date.now());
        const updatedAt = d.updated_at?.toMillis ? d.updated_at.toMillis() : createdAt;
        return {
          id: d.id,
          channel: (d.channel || 'Web') as Ticket['channel'],
          subject: d.subject || d.complaint_number,
          description: d.description || '',
          reporter: d.reporter || d.patient_name || '',
          category: d.category || 'Other',
          priority: priority === 'critical' ? 'Critical' : priority === 'high' ? 'High' : priority === 'medium' ? 'Medium' : 'Low',
          status: statusRev[d.status] || 'New',
          createdAt,
          updatedAt,
          slaMin: d.slaMin || 360,
        };
      });
      setTickets(mapped);
    });
    return () => unsub();
  }, []);

  const analytics = useMemo(() => {
    const total = tickets.length;
    const byStatus = { New: 0, "In-Progress": 0, Pending: 0, Resolved: 0 } as Record<Ticket["status"], number>;
    const byChannel: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    let within = 0;
    tickets.forEach(t => {
      byStatus[t.status]++;
      byChannel[t.channel] = (byChannel[t.channel] || 0) + 1;
      byCategory[t.category] = (byCategory[t.category] || 0) + 1;
      if (t.status === "Resolved") {
        const mins = Math.max(1, Math.round(((t.updatedAt || Date.now()) - (t.createdAt || Date.now()))/60000));
        if (mins <= t.slaMin) within++;
      }
    });
    const slaPct = total ? Math.round((within/Math.max(1, tickets.filter(t=>t.status==="Resolved").length))*100) : 0;
    return { total, byStatus, byChannel, byCategory, slaPct };
  }, [tickets]);

  const iconForChannel = (c: Ticket["channel"]) => c === "Web" ? Globe : c === "Kiosk" ? ClipboardList : c === "IVR" ? Phone : c === "WhatsApp" ? MessageCircle : Mail;

  return (
    <div className="w-full px-2 md:px-4 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Bot className="h-8 w-8 text-primary" />
          Complaint & Issue Tracker
        </h1>
        <p className="text-muted-foreground mt-1">Multi-channel intake, AI categorization & escalation, and real-time resolution tracking.</p>
        <div className="mt-3">
          <Button className="gap-2" onClick={() => navigate('/complaints/submit')}>
            <Plus className="h-4 w-4" /> Add Complaint
          </Button>
        </div>
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Workflow board */}
        <Card className="shadow-md lg:col-span-2">
          <CardHeader>
            <CardTitle>Ticket Workflow</CardTitle>
            <CardDescription>AI-category and priority badges with escalation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-3">
              {(["New","In-Progress","Pending","Resolved"] as Ticket["status"][ ]).map(col => (
                <div key={col} className="p-3 rounded-lg border min-h-40">
                  <div className="font-medium">{col}</div>
                  <div className="mt-2 space-y-2">
                    {tickets.filter(t=>t.status===col).map(t => {
                      const Icon = iconForChannel(t.channel);
                      return (
                        <div key={t.id} className="p-2 rounded border">
                          <div className="text-sm font-medium flex items-center gap-2"><Icon className="h-4 w-4" /> {t.subject}</div>
                          <div className="text-xs text-muted-foreground">{t.reporter} • {t.category}</div>
                          <div className="mt-1 flex items-center justify-between">
                            <Badge variant={t.priority === "Critical" ? "default" : t.priority === "High" ? "secondary" : "outline"}>{t.priority}</Badge>
                            {col !== "Resolved" && <Button size="sm" variant="outline" onClick={()=>advance(t.id)}>Advance</Button>}
                          </div>
                        </div>
                      );
                    })}
                    {tickets.filter(t=>t.status===col).length===0 && (
                      <div className="text-xs text-muted-foreground">No tickets</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Alerts */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>AI escalations and SLA updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-auto pr-1">
              {alerts.length === 0 && <div className="text-sm text-muted-foreground">No notifications</div>}
              {alerts.map(a => (
                <div key={a.id} className="p-3 rounded-lg border text-sm flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                  <div>{a.msg}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Analytics</CardTitle>
          <CardDescription>Channels, categories, SLA performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="p-3 rounded-lg border"><div className="text-xs text-muted-foreground">Total Tickets</div><div className="text-2xl font-semibold">{analytics.total}</div></div>
            <div className="p-3 rounded-lg border"><div className="text-xs text-muted-foreground">Resolved within SLA</div><div className="text-2xl font-semibold">{analytics.slaPct}%</div></div>
            <div className="p-3 rounded-lg border"><div className="text-xs text-muted-foreground">Open</div><div className="text-2xl font-semibold">{analytics.byStatus["New"] + analytics.byStatus["In-Progress"] + analytics.byStatus["Pending"]}</div></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="text-sm font-medium mb-2">Channels</div>
              <div className="space-y-2">
                {Object.entries(analytics.byChannel).map(([k,v]) => (
                  <div key={k} className="flex items-center gap-3 text-sm">
                    <div className="w-24 text-muted-foreground">{k}</div>
                    <div className="flex-1 h-3 bg-muted rounded"><div className="h-3 rounded bg-sky-500" style={{ width: `${(v/Math.max(1, analytics.total))*100}%` }} /></div>
                    <div className="w-8 text-right">{v}</div>
                  </div>
                ))}
                {Object.keys(analytics.byChannel).length===0 && <div className="text-xs text-muted-foreground">No data</div>}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium mb-2">Categories</div>
              <div className="space-y-2">
                {Object.entries(analytics.byCategory).map(([k,v]) => (
                  <div key={k} className="flex items-center gap-3 text-sm">
                    <div className="w-28 text-muted-foreground">{k}</div>
                    <div className="flex-1 h-3 bg-muted rounded"><div className="h-3 rounded bg-emerald-500" style={{ width: `${(v/Math.max(1, analytics.total))*100}%` }} /></div>
                    <div className="w-8 text-right">{v}</div>
                  </div>
                ))}
                {Object.keys(analytics.byCategory).length===0 && <div className="text-xs text-muted-foreground">No data</div>}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
