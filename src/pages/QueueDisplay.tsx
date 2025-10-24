import React from 'react';
import RealTimeQueueDisplay from '@/components/RealTimeQueueDisplay';
import OfflineSyncIndicator from '@/components/OfflineSyncIndicator';

const QueueDisplayPage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Sync Status Indicator */}
      <OfflineSyncIndicator />
      
      {/* Queue Display */}
      <RealTimeQueueDisplay />
    </div>
  );
};

export default QueueDisplayPage;
