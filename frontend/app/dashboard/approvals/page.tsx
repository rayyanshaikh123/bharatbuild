'use client';

import React from 'react';
import { Plus, Clock } from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import StatusBadge from '@/components/ui/StatusBadge';
import { MOCK_LOGS } from '@/lib/data';

export default function ApprovalsPage() {
    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Intelligence Logs</h2>
                    <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-2">Field Authentication Layer</p>
                </div>
                <Button icon={Plus}>New Log Entry</Button>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {MOCK_LOGS.map(log => (
                    <Card key={log.id} className="p-0">
                        <div className="flex flex-col md:flex-row items-stretch">
                            <div className="md:w-1/4 p-6 bg-slate-50 dark:bg-slate-900/50 border-r border-slate-100 dark:border-slate-800">
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase leading-none mb-6">{log.project}</h4>
                                <p className="text-xs font-bold text-slate-500">{log.engineer}</p>
                            </div>
                            <div className="flex-1 p-6 space-y-4">
                                <div className="flex items-center gap-4">
                                    <StatusBadge status={log.status} />
                                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1.5 uppercase tracking-wider"><Clock size={12} /> {log.time}</span>
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">{log.type}</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                                    {log.summary}
                                </p>
                            </div>
                            <div className="md:w-48 p-6 flex flex-col justify-center gap-2 border-l border-slate-100 dark:border-slate-800">
                                <Button className="w-full">Authorize</Button>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}
