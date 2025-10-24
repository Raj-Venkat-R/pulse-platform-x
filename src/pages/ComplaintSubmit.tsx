import React from 'react';
import ComplaintSubmissionForm from '@/components/ComplaintSubmissionForm';

const ComplaintSubmitPage: React.FC = () => {
  const handleSuccess = (complaint: any) => {
    // Redirect to complaint details or show success message
    window.location.href = `/complaints/${complaint.id}`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Submit a Complaint
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            We value your feedback and are committed to resolving any issues you may have experienced. 
            Please provide detailed information about your complaint so we can assist you effectively.
          </p>
        </div>
        
        <ComplaintSubmissionForm onSuccess={handleSuccess} />
        
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Need immediate assistance? Call our customer service at{' '}
            <a href="tel:+1-800-HELP" className="text-blue-600 hover:text-blue-800">
              1-800-HELP
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ComplaintSubmitPage;
