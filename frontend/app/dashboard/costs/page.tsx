import React from 'react';
import Card from '@/components/ui/Card';

export default function CostsPage() {
    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Cost Management</h2>
            <Card>
                <p className="text-slate-500 text-sm">Financial modules and cost reports will be displayed here.</p>
            </Card>
        </div>
    );
}
