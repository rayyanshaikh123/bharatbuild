import React from 'react';
import Card from '@/components/ui/Card';
import { MOCK_PROJECTS } from '@/lib/data';

const ProjectList: React.FC<{ showCreate?: boolean }> = ({ showCreate }) => {
  return (
    <Card
      title="Projects"
      action={showCreate ? <button className="text-xs font-bold text-brand-orange hover:text-orange-600 transition-colors uppercase tracking-wider">+ New</button> : undefined}
    >
      <div className="space-y-4 pt-2">
        {MOCK_PROJECTS.slice(0, 3).map(p => (
          <div key={p.id} className="flex items-center justify-between">
            <div>
              <div className="font-extrabold text-slate-900 dark:text-white text-sm">{p.name}</div>
              <div className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">{p.location}</div>
            </div>
            <div className="w-32">
              <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-brand-orange" style={{ width: `${p.progress}%` }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default ProjectList;