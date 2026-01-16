import React from 'react';
import Card from '@/components/ui/Card';

const CostReports: React.FC = () => {
  return (
    <Card
      title="Cost & Bill-Readiness"
      subtitle="Approved cost summaries, budget vs actual and downloadable reports."
    >
      <div className="space-y-3 pt-2">
        <button className="w-full text-left px-4 py-3 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors rounded-lg text-sm font-bold text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-slate-700">Download Bill-Readiness Report</button>
        <button className="w-full text-left px-4 py-3 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors rounded-lg text-sm font-bold text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-slate-700">Export Cost Summary</button>
      </div>
    </Card>
  );
};

export default CostReports;