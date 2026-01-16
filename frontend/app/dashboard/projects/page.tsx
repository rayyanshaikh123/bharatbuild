'use client';

import React from 'react';
import { Plus } from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import StatusBadge from '@/components/ui/StatusBadge';
import { MOCK_PROJECTS } from '@/lib/data';

export default function ProjectsPage() {
    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex justify-between items-center shadow-sm">
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight uppercase">Operational Site Matrix</h2>
                <Button icon={Plus}>Add Site</Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {MOCK_PROJECTS.map(p => (
                    <Card key={p.id}>
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{p.name}</h3>
                                <p className="text-xs text-slate-500 font-medium">{p.location}</p>
                            </div>
                            <StatusBadge status={p.status} />
                        </div>

                        <div className="space-y-4">
                            <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-slate-500">
                                <span>Completion</span>
                                <span>{p.progress}%</span>
                            </div>
                            <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-brand-orange transition-all duration-1000" style={{ width: `${p.progress}%` }}></div>
                            </div>
                            <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-800">
                                <span className="text-[10px] font-mono text-slate-400">{p.siteCode}</span>
                                <span className="text-[10px] font-bold text-slate-400">Updated {p.lastUpdate}</span>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}
