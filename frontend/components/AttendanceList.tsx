import React from 'react';
import Card from '@/components/ui/Card';

const AttendanceList: React.FC<{ compact?: boolean }> = ({ compact }) => {
  const mock = [
    { id: 'a1', name: 'Ramesh', hours: 9 },
    { id: 'a2', name: 'Sita', hours: 8 },
  ];

  return (
    <Card title="Attendance">
      <div className="space-y-3 pt-2 text-sm">
        {mock.map(m => (
          <div key={m.id} className="flex items-center justify-between">
            <div className="font-bold text-slate-900 dark:text-white">{m.name}</div>
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400">{m.hours}h</div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default AttendanceList;