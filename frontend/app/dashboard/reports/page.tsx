import React from 'react';
import Card from '@/components/ui/Card';

export default function ReportsPage() {
    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Reports & Analytics</h2>
            <Card>
                <p className="text-slate-500 text-sm">Detailed site analytics and exportable reports will be available here.</p>
            </Card>
        </div>
    );
}
