import React from 'react';
import ProjectList from '../components/ProjectList';
import DPRList from '../components/DPRList';
import MaterialRequests from '../components/MaterialRequests';
import AttendanceList from '../components/AttendanceList';
import ApprovePanel from '../components/ApprovePanel';

const ManagerDashboard: React.FC = () => {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold">Project Manager — Operations</h2>
          <p className="text-sm text-slate-500">Create projects, review DPRs, material requests and approvals.</p>
        </div>
      </div>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ProjectList showCreate />
        </div>
        <div>
          <ApprovePanel />
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div>
          <DPRList />
        </div>
        <div>
          <MaterialRequests />
        </div>
        <div>
          <AttendanceList />
        </div>
      </section>
    </div>
  );
};

export default ManagerDashboard;