import React from 'react';
import Card from '@/components/ui/Card';

const ApprovePanel: React.FC = () => {
  const mock = [
    { id: 'r1', title: 'DPR: Skyline - 2026-01-15', type: 'DPR', status: 'PENDING' },
    { id: 'r2', title: 'Material: Cement Request', type: 'MATERIAL', status: 'PENDING' },
  ];

  return (
    <Card
      title="Approvals"
      subtitle="Items awaiting manager review"
      className="dark:bg-slate-950"
    >
      <div className="space-y-3 pt-2">
        {mock.map(i => (
          <div key={i.id} className="flex items-center justify-between">
            <div>
              <div className="font-bold text-sm text-slate-900 dark:text-white">{i.title}</div>
              <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">{i.type}</div>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold">
              <button className="px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 hover:bg-emerald-100 transition-colors">Approve</button>
              <button className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 hover:bg-rose-100 transition-colors">Reject</button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default ApprovePanel;