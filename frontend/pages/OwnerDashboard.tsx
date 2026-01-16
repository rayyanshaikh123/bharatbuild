import React from 'react';
import ProjectList from '../components/ProjectList';
import CostReports from '../components/CostReports';
import AttendanceList from '../components/AttendanceList';
import DPRList from '../components/DPRList';
import MaterialRequests from '../components/MaterialRequests';

const OwnerDashboard: React.FC = () => {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold">Owner — Command Center</h2>
          <p className="text-sm text-slate-500">Portfolio overview, audits and verified cost reports.</p>
        </div>
      </div>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ProjectList />
        </div>
        <div>
          <CostReports />
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div>
          <AttendanceList compact />
        </div>
        <div>
          <DPRList compact />
        </div>
        <div>
          <MaterialRequests compact />
        </div>
      </section>
    </div>
  );
};

export default OwnerDashboard;