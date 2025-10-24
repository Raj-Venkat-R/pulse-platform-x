import React from 'react';
import AppointmentBookingWizard from '@/components/AppointmentBookingWizard';
import OfflineSyncIndicator from '@/components/OfflineSyncIndicator';

const AppointmentBookingPage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Sync Status Indicator */}
      <OfflineSyncIndicator />
      
      {/* Main Booking Wizard */}
      <AppointmentBookingWizard />
    </div>
  );
};

export default AppointmentBookingPage;
