import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Bot, Send, Activity, HeartPulse } from "lucide-react";

 type ChatMsg = { id: string; who: "user" | "bot"; text: string };

export default function AINCDChatbot() {
  const [messages, setMessages] = useState<ChatMsg[]>([
    { id: "m1", who: "bot", text: "Hi! I'm your NCD prevention assistant. Let's assess risk and build a plan. What is your age?" },
  ]);
  const [input, setInput] = useState("");

  // Tracked fields for simple risk scoring
  const [age, setAge] = useState<number | null>(null);
  const [bmi, setBmi] = useState<number | null>(null);
  const [smoke, setSmoke] = useState<boolean | null>(null);
  const [bp, setBp] = useState<number | null>(null); // systolic
  const [activityMin, setActivityMin] = useState<number | null>(null);

  const risk = useMemo(() => {
    let score = 0;
    if ((age || 0) >= 45) score += 20;
    if ((bmi || 0) >= 30) score += 25; else if ((bmi || 0) >= 25) score += 15;
    if (smoke) score += 20;
    if ((bp || 0) >= 140) score += 20; else if ((bp || 0) >= 130) score += 10;
    if ((activityMin || 0) < 150) score += 15;
    return Math.min(100, score);
  }, [age, bmi, smoke, bp, activityMin]);

  const riskBand: { label: string; color: string } = risk >= 70 ? { label: "High", color: "#ef4444" } : risk >= 40 ? { label: "Moderate", color: "#f59e0b" } : { label: "Low", color: "#22c55e" };

  const donut = (pct: number, color: string) => {
    const r = 52; const c = 2 * Math.PI * r; const val = Math.max(0, Math.min(100, pct));
    return (
      <svg viewBox="0 0 120 120" className="h-28 w-28">
        <circle cx="60" cy="60" r={r} stroke="#e5e7eb" strokeWidth="12" fill="none" />
        <circle cx="60" cy="60" r={r} stroke={color} strokeWidth="12" fill="none" strokeDasharray={`${(val/100)*c} ${c}`} transform="rotate(-90 60 60)" />
        <text x="60" y="60" dominantBaseline="middle" textAnchor="middle" className="fill-current" style={{ fontSize: 14 }}>{val}%</text>
      </svg>
    );
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    const id = `u-${Date.now()}`;
    setMessages(prev => [...prev, { id, who: "user", text }]);
    setInput("");
    // naive parser to capture fields
    const t = text.toLowerCase();
    const ageMatch = t.match(/age\s*(\d{1,3})/);
    const bmiMatch = t.match(/bmi\s*(\d{2}(?:\.\d+)?)/);
    const bpMatch = t.match(/bp\s*(\d{2,3})/);
    if (ageMatch) setAge(Number(ageMatch[1]));
    if (bmiMatch) setBmi(Number(bmiMatch[1]));
    if (bpMatch) setBp(Number(bpMatch[1]));
    if (/smok(e|er|ing)\s*(yes|y|1|true)/.test(t)) setSmoke(true);
    if (/smok(e|er|ing)\s*(no|n|0|false)/.test(t)) setSmoke(false);
    const actMatch = t.match(/(activity|exercise)\s*(\d{1,3})/);
    if (actMatch) setActivityMin(Number(actMatch[2]));

    // bot reply based on recognized fields
    setTimeout(() => {
      const tips: string[] = [];
      if (ageMatch) tips.push(`Noted age ${ageMatch[1]}.`);
      if (bmiMatch) tips.push(`BMI ${bmiMatch[1]} recorded.`);
      if (bpMatch) tips.push(`Systolic BP ${bpMatch[1]} noted.`);
      if (/smok/.test(t)) tips.push(`Smoking status saved.`);
      if (actMatch) tips.push(`Weekly activity ${actMatch[2]} min saved.`);
      tips.push("Share more: 'BMI 27', 'BP 135', 'smoking no', 'activity 120'.");
      setMessages(prev => [...prev, { id: `b-${Date.now()}`, who: "bot", text: tips.join(" ") }]);
    }, 400);
  };

  const recs = useMemo(() => {
    const list: string[] = [];
    if (risk >= 70) list.push("Consult clinician for risk review. Consider BP/HbA1c checks in next 2 weeks.");
    if ((bmi || 0) >= 25) list.push("Aim for 5–7% weight reduction over 3 months.");
    if (smoke) list.push("Enroll in smoking cessation program.");
    if ((activityMin || 0) < 150) list.push("Target ≥150 min/week moderate activity; start with 20–30 min/day.");
    if ((bp || 0) >= 130) list.push("Home BP monitoring and DASH/Mediterranean diet.");
    if (list.length === 0) list.push("Great work—maintain current lifestyle and annual screening.");
    return list;
  }, [risk, bmi, smoke, activityMin, bp]);

  return (
    <div className="w-full px-2 md:px-4 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Bot className="h-8 w-8 text-primary" />
          AI NCD Prevention Chatbot
        </h1>
        <p className="text-muted-foreground mt-1">Domain: HealthTech / AI / Preventive Care • Real-time risk assessment and lifestyle tracking</p>
      </div>

      {/* Conversational UI */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Chat</CardTitle>
          <CardDescription>Conversational risk assessment</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 rounded-lg border p-3 overflow-auto bg-muted/20">
            <div className="flex flex-col gap-2">
              {messages.map(m => (
                <div key={m.id} className={`max-w-[85%] rounded px-3 py-2 text-sm ${m.who === 'bot' ? 'self-start bg-primary/10 text-foreground' : 'self-end bg-card border'}`}> 
                  {m.text}
                </div>
              ))}
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Input placeholder="Type e.g., 'age 46, BMI 28, BP 132, smoking no, activity 120'" value={input} onChange={(e)=>setInput(e.target.value)} onKeyDown={(e)=>{ if(e.key==='Enter'){ handleSend(); } }} />
            <Button onClick={handleSend} className="gap-1"><Send className="h-4 w-4" /> Send</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Risk scoring visualization */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Risk Score</CardTitle>
            <CardDescription>Dynamic based on your inputs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              {donut(risk, riskBand.color)}
              <div>
                <div className="text-3xl font-semibold">{riskBand.label}</div>
                <div className="text-sm text-muted-foreground mt-1">Age: {age ?? '—'} • BMI: {bmi ?? '—'} • BP: {bp ?? '—'} • Activity: {activityMin ?? '—'} • Smoking: {smoke === null ? '—' : (smoke ? 'Yes' : 'No')}</div>
                <div className="mt-2 text-xs text-muted-foreground">Factors: age, BMI, smoking, BP, activity</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Personalized recommendations */}
        <Card className="shadow-md lg:col-span-2">
          <CardHeader>
            <CardTitle>Personalized Recommendations</CardTitle>
            <CardDescription>Behavioral nudges and checks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recs.map((r, i) => (
                <div key={i} className="p-3 rounded-lg border text-sm flex items-start gap-2">
                  <Activity className="h-4 w-4 text-sky-600 mt-0.5" />
                  <div>{r}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick inputs (optional) */}
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Quick Inputs</CardTitle>
          <CardDescription>Update fields without chat</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <div className="space-y-1"><Label>Age</Label><Input type="number" value={age ?? ''} onChange={(e)=>setAge(Number(e.target.value)||0)} /></div>
            <div className="space-y-1"><Label>BMI</Label><Input type="number" step="0.1" value={bmi ?? ''} onChange={(e)=>setBmi(Number(e.target.value)||0)} /></div>
            <div className="space-y-1"><Label>BP (sys)</Label><Input type="number" value={bp ?? ''} onChange={(e)=>setBp(Number(e.target.value)||0)} /></div>
            <div className="space-y-1"><Label>Weekly Activity (min)</Label><Input type="number" value={activityMin ?? ''} onChange={(e)=>setActivityMin(Number(e.target.value)||0)} /></div>
            <div className="space-y-1"><Label>Smoking</Label>
              <div className="flex gap-2">
                <Button variant={smoke === false ? 'default' : 'outline'} size="sm" onClick={()=>setSmoke(false)}>No</Button>
                <Button variant={smoke === true ? 'default' : 'outline'} size="sm" onClick={()=>setSmoke(true)}>Yes</Button>
              </div>
            </div>
            <div className="flex items-end"><Badge variant="secondary">Domain: HealthTech / AI / Preventive Care</Badge></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
