import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Star, ThumbsUp, ThumbsDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Feedback() {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    patientName: "",
    patientId: "",
    department: "",
    rating: "",
    feedback: "",
    category: "",
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({
      title: "Feedback Submitted",
      description: "Thank you for your feedback. We value your input!",
    });
    setFormData({
      patientName: "",
      patientId: "",
      department: "",
      rating: "",
      feedback: "",
      category: "",
    });
  };

  const recentFeedback = [
    {
      id: 1,
      patient: "John Doe",
      department: "Cardiology",
      rating: 5,
      comment: "Excellent service and very caring staff. Dr. Smith was thorough and explained everything clearly.",
      date: "2025-10-22",
      sentiment: "positive",
    },
    {
      id: 2,
      patient: "Sarah Smith",
      department: "Emergency",
      rating: 4,
      comment: "Quick response time but waiting area could be more comfortable.",
      date: "2025-10-22",
      sentiment: "positive",
    },
    {
      id: 3,
      patient: "Michael Brown",
      department: "Orthopedics",
      rating: 3,
      comment: "Long wait time for appointment. However, doctor was professional.",
      date: "2025-10-21",
      sentiment: "neutral",
    },
  ];

  const stats = {
    total: 247,
    positive: 198,
    neutral: 38,
    negative: 11,
    avgRating: 4.3,
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <MessageSquare className="h-8 w-8 text-primary" />
          Patient Feedback & Satisfaction
        </h1>
        <p className="text-muted-foreground mt-1">Collect and analyze patient feedback to improve services</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="shadow-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Total Feedback</p>
              <p className="text-3xl font-bold text-foreground">{stats.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-md border-success/20">
          <CardContent className="pt-6">
            <div className="text-center">
              <ThumbsUp className="h-6 w-6 text-success mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-1">Positive</p>
              <p className="text-3xl font-bold text-success">{stats.positive}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-1">Neutral</p>
              <p className="text-3xl font-bold text-foreground">{stats.neutral}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-md border-destructive/20">
          <CardContent className="pt-6">
            <div className="text-center">
              <ThumbsDown className="h-6 w-6 text-destructive mx-auto mb-2" />
              <p className="text-sm text-muted-foreground mb-1">Negative</p>
              <p className="text-3xl font-bold text-destructive">{stats.negative}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-md border-primary/20">
          <CardContent className="pt-6">
            <div className="text-center">
              <Star className="h-6 w-6 text-warning mx-auto mb-2 fill-warning" />
              <p className="text-sm text-muted-foreground mb-1">Avg Rating</p>
              <p className="text-3xl font-bold text-foreground">{stats.avgRating}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Feedback Form */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Submit Feedback</CardTitle>
            <CardDescription>Share your experience to help us improve</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="patientName">Patient Name</Label>
                <Input
                  id="patientName"
                  value={formData.patientName}
                  onChange={(e) => handleInputChange("patientName", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="patientId">Patient ID (Optional)</Label>
                <Input
                  id="patientId"
                  value={formData.patientId}
                  onChange={(e) => handleInputChange("patientId", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Select value={formData.department} onValueChange={(value) => handleInputChange("department", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="emergency">Emergency</SelectItem>
                    <SelectItem value="cardiology">Cardiology</SelectItem>
                    <SelectItem value="orthopedics">Orthopedics</SelectItem>
                    <SelectItem value="pediatrics">Pediatrics</SelectItem>
                    <SelectItem value="general">General Medicine</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Feedback Category</Label>
                <Select value={formData.category} onValueChange={(value) => handleInputChange("category", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="service">Service Quality</SelectItem>
                    <SelectItem value="cleanliness">Cleanliness</SelectItem>
                    <SelectItem value="staff">Staff Behavior</SelectItem>
                    <SelectItem value="facilities">Facilities</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rating">Rating</Label>
                <Select value={formData.rating} onValueChange={(value) => handleInputChange("rating", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select rating" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">⭐⭐⭐⭐⭐ Excellent</SelectItem>
                    <SelectItem value="4">⭐⭐⭐⭐ Good</SelectItem>
                    <SelectItem value="3">⭐⭐⭐ Average</SelectItem>
                    <SelectItem value="2">⭐⭐ Below Average</SelectItem>
                    <SelectItem value="1">⭐ Poor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="feedback">Your Feedback</Label>
                <Textarea
                  id="feedback"
                  rows={4}
                  value={formData.feedback}
                  onChange={(e) => handleInputChange("feedback", e.target.value)}
                  placeholder="Please share your experience..."
                  required
                />
              </div>
              <Button type="submit" className="w-full">Submit Feedback</Button>
            </form>
          </CardContent>
        </Card>

        {/* Recent Feedback */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Recent Feedback</CardTitle>
            <CardDescription>Latest patient reviews and comments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentFeedback.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium text-foreground">{item.patient}</p>
                      <p className="text-sm text-muted-foreground">{item.department}</p>
                    </div>
                    <Badge
                      variant={
                        item.sentiment === "positive"
                          ? "default"
                          : item.sentiment === "negative"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {item.sentiment}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 mb-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i < item.rating ? "text-warning fill-warning" : "text-muted-foreground"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{item.comment}</p>
                  <p className="text-xs text-muted-foreground">{item.date}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
