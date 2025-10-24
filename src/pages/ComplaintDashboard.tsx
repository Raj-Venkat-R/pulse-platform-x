import React from 'react';
import ComplaintDashboard from '@/components/ComplaintDashboard';

const ComplaintDashboardPage: React.FC = () => {
  // In a real app, you would get these from authentication context
  const userRole = 'staff'; // or 'supervisor', 'manager', etc.
  const userId = 1; // Current user ID

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <ComplaintDashboard userRole={userRole} userId={userId} />
      </div>
    </div>
  );
};

export default ComplaintDashboardPage;
