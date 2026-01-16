import React from 'react';
import Card from '@/components/ui/Card';
import StatusBadge from '@/components/ui/StatusBadge';
import { MOCK_LOGS } from '@/lib/data';

const DPRList: React.FC<{ compact?: boolean }> = ({ compact }) => {
  return (
    <Card title="Daily Progress Reports">
      <div className="space-y-4 pt-2">
        {MOCK_LOGS.map(d => (
          <div key={d.id} className="flex items-center justify-between">
            <div className='flex flex-col'>
              <span className="font-bold text-sm text-slate-900 dark:text-white">{d.project}</span>
              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">{d.engineer}</span>
            </div>
            <StatusBadge status={d.status} />
          </div>
        ))}
      </div>
    </Card>
  );
};

export default DPRList;