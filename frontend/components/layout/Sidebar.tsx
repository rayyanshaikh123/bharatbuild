'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Building2,
    Wallet,
    ClipboardCheck,
    FileText,
    Users,
    LogOut,
    Construction
} from 'lucide-react';
import { useAppContext } from '../providers/AppProvider';

const Sidebar = () => {
    const { role } = useAppContext();
    const pathname = usePathname();

    const menuItems = role === 'OWNER' ? [
        { id: 'dashboard', label: 'Command Hub', icon: LayoutDashboard, href: '/dashboard' },
        { id: 'projects', label: 'Sites', icon: Building2, href: '/dashboard/projects' },
        { id: 'costs', label: 'Costs', icon: Wallet, href: '/dashboard/costs' },
        { id: 'approvals', label: 'Logs', icon: ClipboardCheck, href: '/dashboard/approvals' },
        { id: 'reports', label: 'Reports', icon: FileText, href: '/dashboard/reports' },
    ] : role === 'MANAGER' ? [
        { id: 'dashboard', label: 'Operations Hub', icon: LayoutDashboard, href: '/dashboard' },
        { id: 'projects', label: 'Sites', icon: Building2, href: '/dashboard/projects' },
        { id: 'approvals', label: 'Pending', icon: ClipboardCheck, href: '/dashboard/approvals' },
        { id: 'team', label: 'Team', icon: Users, href: '/dashboard/team' },
    ] : [
        { id: 'dashboard', label: 'Command Hub', icon: LayoutDashboard, href: '/dashboard' },
        { id: 'projects', label: 'Sites', icon: Building2, href: '/dashboard/projects' },
        { id: 'approvals', label: 'Logs', icon: ClipboardCheck, href: '/dashboard/approvals' },
    ];

    return (
        <aside className="hidden lg:flex w-64 sidebar-refined border-r border-slate-200 dark:border-slate-800/60 text-slate-700 dark:text-white flex-col h-screen z-50 fixed left-0 top-0">
            <div className="p-8 h-20 flex items-center gap-3">
                <div className="brand-badge inline-flex items-center gap-3 px-3 py-1 rounded-xl shadow-sm bg-white/90 dark:bg-white/5 backdrop-blur-md">
                    <div className="w-8 h-8 bg-brand-orange rounded-lg flex items-center justify-center text-white shadow-lg">
                        <Construction size={20} />
                    </div>
                    <span className="text-lg font-extrabold tracking-tighter uppercase leading-none italic brand-text text-slate-900 dark:text-white">Bharat<span className="text-brand-orange">Build</span></span>
                </div>
            </div>

            <nav className="flex-1 p-4 space-y-1 mt-6">
                {menuItems.map(item => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.id}
                            href={item.href}
                            className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-lg transition-all font-bold text-xs uppercase tracking-wider nav-item ${isActive
                                    ? 'active shadow-lg shadow-orange-950/20'
                                    : 'hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/5'
                                }`}
                        >
                            <item.icon size={16} />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                <Link href="/" className="w-full flex items-center gap-3 font-bold text-[10px] text-slate-500 dark:text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 px-4 transition-colors uppercase tracking-widest">
                    <LogOut size={14} /> End Session
                </Link>
            </div>
        </aside>
    );
};

export default Sidebar;
