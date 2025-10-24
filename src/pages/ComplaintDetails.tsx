import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ComplaintDetails from '@/components/ComplaintDetails';

const ComplaintDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const complaintId = id ? parseInt(id) : 0;

  const handleBack = () => {
    navigate('/complaints/dashboard');
  };

  if (!complaintId || isNaN(complaintId)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Invalid Complaint ID</h1>
          <p className="text-gray-600 mb-4">The complaint ID provided is not valid.</p>
          <button
            onClick={() => navigate('/complaints/dashboard')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <ComplaintDetails complaintId={complaintId} onBack={handleBack} />
      </div>
    </div>
  );
};

export default ComplaintDetailsPage;
