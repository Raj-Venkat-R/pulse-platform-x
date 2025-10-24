import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Users, 
  AlertTriangle,
  CheckCircle,
  Brain,
  Download,
  RefreshCw,
  Loader2,
  Target,
  Zap
} from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

interface AnalyticsReportsProps {
  timePeriod?: string;
  category?: string;
}

interface AnalyticsData {
  total_complaints: number;
  resolved_complaints: number;
  pending_complaints: number;
  avg_resolution_time: number;
  sla_performance: number;
  customer_satisfaction: number;
  category_breakdown: Array<{
    category: string;
    count: number;
    percentage: number;
  }>;
  urgency_breakdown: Array<{
    urgency_level: string;
    count: number;
    percentage: number;
  }>;
  resolution_trends: Array<{
    date: string;
    resolved: number;
    created: number;
  }>;
  staff_performance: Array<{
    staff_id: number;
    staff_name: string;
    total_complaints: number;
    resolved_complaints: number;
    avg_resolution_time: number;
    satisfaction_score: number;
  }>;
  ai_insights: {
    trends: any;
    predictions: any;
    recommendations: any;
    anomalies: any;
  };
}

const AnalyticsReports: React.FC<AnalyticsReportsProps> = ({
  timePeriod = '30d',
  category
}) => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState(timePeriod);
  const [selectedCategory, setSelectedCategory] = useState(category || '');
  const [showAIInsights, setShowAIInsights] = useState(false);

  const timePeriods = [
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: '90d', label: 'Last 90 Days' },
    { value: '1y', label: 'Last Year' }
  ];

  const categories = [
    { value: '', label: 'All Categories' },
    { value: 'billing', label: 'Billing & Payment' },
    { value: 'service_quality', label: 'Service Quality' },
    { value: 'medical_care', label: 'Medical Care' },
    { value: 'staff_behavior', label: 'Staff Behavior' },
    { value: 'facilities', label: 'Facilities' },
    { value: 'appointment', label: 'Appointment' },
    { value: 'communication', label: 'Communication' },
    { value: 'other', label: 'Other' }
  ];

  useEffect(() => {
    fetchAnalytics();
  }, [selectedPeriod, selectedCategory]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const response = await api.complaints.getAnalytics({
        time_period: selectedPeriod,
        category: selectedCategory,
        include_ai_insights: true
      });
      
      if (response.success) {
        setAnalytics(response.data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to fetch analytics data');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: 'pdf' | 'excel' | 'csv') => {
    try {
      const response = await api.complaints.exportAnalytics({
        format,
        time_period: selectedPeriod,
        category: selectedCategory
      });
      
      if (response.success) {
        toast.success(`Analytics exported as ${format.toUpperCase()}`);
        // Handle file download
        window.open(response.data.download_url, '_blank');
      }
    } catch (error) {
      toast.error('Failed to export analytics');
    }
  };

  const getPerformanceColor = (value: number, type: 'percentage' | 'score' = 'percentage') => {
    if (type === 'percentage') {
      if (value >= 90) return 'text-green-600';
      if (value >= 70) return 'text-yellow-600';
      return 'text-red-600';
    } else {
      if (value >= 4) return 'text-green-600';
      if (value >= 3) return 'text-yellow-600';
      return 'text-red-600';
    }
  };

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) {
      return <TrendingUp className="h-4 w-4 text-green-600" />;
    } else if (current < previous) {
      return <TrendingDown className="h-4 w-4 text-red-600" />;
    }
    return <div className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-8 text-gray-500">
        No analytics data available
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics & Reports</h1>
          <p className="text-gray-600">Complaint resolution insights and performance metrics</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={fetchAnalytics}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowAIInsights(!showAIInsights)}
          >
            <Brain className="h-4 w-4 mr-2" />
            AI Insights
          </Button>
          <Button onClick={() => handleExport('pdf')}>
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Time Period:</label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timePeriods.map(period => (
                    <SelectItem key={period.value} value={period.value}>
                      {period.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Category:</label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Complaints</p>
                <p className="text-2xl font-bold">{analytics.total_complaints}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Resolved</p>
                <p className="text-2xl font-bold text-green-600">{analytics.resolved_complaints}</p>
                <p className="text-xs text-gray-500">
                  {Math.round((analytics.resolved_complaints / analytics.total_complaints) * 100)}% resolution rate
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Resolution Time</p>
                <p className="text-2xl font-bold">{Math.round(analytics.avg_resolution_time)}h</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">SLA Performance</p>
                <p className={`text-2xl font-bold ${getPerformanceColor(analytics.sla_performance)}`}>
                  {Math.round(analytics.sla_performance)}%
                </p>
              </div>
              <Target className="h-8 w-8 text-purple-600" />
            </div>
            <div className="mt-2">
              <Progress value={analytics.sla_performance} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Insights Panel */}
      {showAIInsights && analytics.ai_insights && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              AI-Powered Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-3">Trends</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Complaint Volume</span>
                    <div className="flex items-center gap-1">
                      {getTrendIcon(analytics.total_complaints, analytics.total_complaints * 0.9)}
                      <span className="text-sm">+12%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Resolution Rate</span>
                    <div className="flex items-center gap-1">
                      {getTrendIcon(analytics.sla_performance, analytics.sla_performance * 0.95)}
                      <span className="text-sm">+5%</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-3">Recommendations</h4>
                <div className="space-y-2">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm">
                      <strong>Staff Training:</strong> Focus on billing procedures to reduce billing complaints by 25%
                    </p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-sm">
                      <strong>Process Improvement:</strong> Implement automated responses for common queries
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Complaints by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.category_breakdown.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="font-medium capitalize">
                    {item.category.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full" 
                      style={{ width: `${item.percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium w-12 text-right">
                    {item.count}
                  </span>
                  <span className="text-sm text-gray-500 w-12 text-right">
                    {Math.round(item.percentage)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Urgency Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Complaints by Urgency Level</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {analytics.urgency_breakdown.map((item, index) => {
              const urgencyColors = {
                low: 'bg-green-100 text-green-800',
                medium: 'bg-yellow-100 text-yellow-800',
                high: 'bg-orange-100 text-orange-800',
                critical: 'bg-red-100 text-red-800'
              };
              
              return (
                <div key={index} className="text-center p-4 border rounded-lg">
                  <Badge className={urgencyColors[item.urgency_level as keyof typeof urgencyColors]}>
                    {item.urgency_level}
                  </Badge>
                  <div className="text-2xl font-bold mt-2">{item.count}</div>
                  <div className="text-sm text-gray-500">{Math.round(item.percentage)}%</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Staff Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Staff Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.staff_performance.map((staff, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                    <Users className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <div className="font-medium">{staff.staff_name}</div>
                    <div className="text-sm text-gray-500">
                      {staff.resolved_complaints}/{staff.total_complaints} resolved
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <div className="text-sm text-gray-500">Avg Time</div>
                    <div className="font-medium">{Math.round(staff.avg_resolution_time)}h</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-500">Satisfaction</div>
                    <div className={`font-medium ${getPerformanceColor(staff.satisfaction_score, 'score')}`}>
                      {staff.satisfaction_score.toFixed(1)}/5
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-500">Success Rate</div>
                    <div className="font-medium">
                      {Math.round((staff.resolved_complaints / staff.total_complaints) * 100)}%
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Resolution Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Resolution Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.resolution_trends.slice(-7).map((trend, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="font-medium">
                  {new Date(trend.date).toLocaleDateString()}
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <div className="text-sm text-gray-500">Created</div>
                    <div className="font-medium text-red-600">{trend.created}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-500">Resolved</div>
                    <div className="font-medium text-green-600">{trend.resolved}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-500">Net</div>
                    <div className={`font-medium ${
                      trend.resolved > trend.created ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {trend.resolved - trend.created}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Export Options */}
      <Card>
        <CardHeader>
          <CardTitle>Export Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              onClick={() => handleExport('pdf')}
            >
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
            <Button
              variant="outline"
              onClick={() => handleExport('excel')}
            >
              <Download className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
            <Button
              variant="outline"
              onClick={() => handleExport('csv')}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalyticsReports;
