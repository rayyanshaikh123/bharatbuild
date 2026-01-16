'use client';

import React from 'react';
import { ChevronRight, Settings } from 'lucide-react';
import ThemeToggle from '../shared/ThemeToggle';
import { usePathname } from 'next/navigation';

const Header = () => {
    const pathname = usePathname();
    const pageName = pathname?.split('/').pop() || 'dashboard';

    return (
        <header className="h-20 header-glass px-8 flex items-center justify-between sticky top-0 z-40 ml-0 lg:ml-64 w-[calc(100%-0px)] lg:w-[calc(100%-256px)] border-b border-slate-200 dark:border-slate-800/80">
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                    <span className="text-slate-900 dark:text-slate-200">{pageName}</span>
                    <ChevronRight size={14} className="text-slate-300 dark:text-slate-700" />
                    <span className="font-mono text-[9px]">ID::40291</span>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <ThemeToggle />
                <button className="p-2 text-slate-400 hover:text-brand-orange transition-colors"><Settings size={18} /></button>
            </div>
        </header>
    );
};

export default Header;
