import React from 'react';
import Card from '@/components/ui/Card';
import StatusBadge from '@/components/ui/StatusBadge';

const MaterialRequests: React.FC<{ compact?: boolean }> = ({ compact }) => {
  const mock = [
    { id: 'm1', material: 'Cement', qty: '200 bags', status: 'PENDING' },
    { id: 'm2', material: 'Rebar', qty: '2 tons', status: 'APPROVED' },
  ];

  return (
    <Card title="Material Requests">
      <div className="space-y-4 pt-2 text-sm">
        {mock.map(r => (
          <div key={r.id} className="flex items-center justify-between">
            <div>
              <div className="font-bold text-slate-900 dark:text-white">{r.material}</div>
              <div className="text-xs font-bold text-slate-500 dark:text-slate-400">{r.qty}</div>
            </div>
            <StatusBadge status={r.status} />
          </div>
        ))}
      </div>
    </Card>
  );
};

export default MaterialRequests;