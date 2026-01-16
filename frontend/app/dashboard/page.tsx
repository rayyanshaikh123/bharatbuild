'use client';

import React from 'react';
import {
    Wallet,
    Building2,
    Users,
    CheckCircle2,
    TrendingUp
} from 'lucide-react';
import {
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area
} from 'recharts';
import Card from '@/components/ui/Card';
import StatusBadge from '@/components/ui/StatusBadge';
import Button from '@/components/ui/Button';
import { MOCK_PROJECTS } from '@/lib/data';
import { useTheme } from 'next-themes';

const Dashboard = () => {
    const { theme } = useTheme();
    const chartColors = theme === 'dark' ? { grid: '#1E293B', text: '#64748B' } : { grid: '#F1F5F9', text: '#94A3B8' };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Portfolio Value', value: '₹436.8 Cr', icon: Wallet, trend: '+4.2%' },
                    { label: 'Active Sites', value: '14 Nodes', icon: Building2, trend: 'Stable' },
                    { label: 'Site Workforce', value: '3,294', icon: Users, trend: '+124 today' },
                    { label: 'Safety Index', value: '98.2%', icon: CheckCircle2, trend: 'Optimal' }
                ].map((stat, i) => (
                    <Card key={i} className="hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                                <stat.icon size={20} />
                            </div>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${stat.trend.includes('+') ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500'}`}>
                                {stat.trend}
                            </span>
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">{stat.label}</p>
                        <h4 className="text-2xl font-extrabold text-slate-900 dark:text-white">{stat.value}</h4>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card title="Project Velocity" subtitle="Comparative progress metrics" className="lg:col-span-2">
                    <div className="h-[280px] mt-6">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={[{ n: 'Jan', v: 35, b: 20 }, { n: 'Feb', v: 42, b: 25 }, { n: 'Mar', v: 38, b: 30 }, { n: 'Apr', v: 55, b: 45 }, { n: 'May', v: 68, b: 52 }]}>
                                <defs>
                                    <linearGradient id="colorOrange" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#F97316" stopOpacity={0.15} />
                                        <stop offset="95%" stopColor="#F97316" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                                <XAxis dataKey="n" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: chartColors.text }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: chartColors.text }} />
                                <Tooltip
                                    contentStyle={{
                                        background: theme === 'dark' ? '#0F172A' : '#FFF',
                                        border: `1px solid ${theme === 'dark' ? '#1E293B' : '#E2E8F0'}`,
                                        borderRadius: '8px',
                                        fontSize: '11px',
                                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                                    }}
                                    itemStyle={{ color: '#F97316' }}
                                />
                                <Area type="monotone" dataKey="v" stroke="#F97316" strokeWidth={2.5} fillOpacity={1} fill="url(#colorOrange)" />
                                <Area type="monotone" dataKey="b" stroke={theme === 'dark' ? '#475569' : '#CBD5E1'} strokeWidth={1.5} strokeDasharray="4 4" fill="transparent" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <Card title="Active Sites" subtitle="Priority Node Monitoring">
                    <div className="space-y-6 mt-4">
                        {MOCK_PROJECTS.map(p => (
                            <div key={p.id}>
                                <div className="flex justify-between items-center mb-2">
                                    <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase truncate w-32">{p.name}</h5>
                                    <StatusBadge status={p.status} />
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-brand-orange transition-all duration-1000" style={{ width: `${p.progress}%` }}></div>
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">{p.progress}%</span>
                                </div>
                            </div>
                        ))}
                        <Button variant="outline" className="w-full mt-2" icon={TrendingUp}>View Full Node Map</Button>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default Dashboard;
