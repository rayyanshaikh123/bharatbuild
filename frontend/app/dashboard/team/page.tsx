import React from 'react';
import Card from '@/components/ui/Card';

export default function TeamPage() {
    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Team Management</h2>
            <Card>
                <p className="text-slate-500 text-sm">Workforce allocation and team management interfaces.</p>
            </Card>
        </div>
    );
}
