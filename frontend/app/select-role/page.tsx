'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Layers, HardHat, ChevronRight } from 'lucide-react';
import { useAppContext } from '../../components/providers/AppProvider';
import ThemeToggle from '../../components/shared/ThemeToggle';

type Role = 'OWNER' | 'MANAGER';

const RoleSelection = () => {
    const { setRole } = useAppContext();
    const router = useRouter();

    const handleRoleSelect = (role: Role) => {
        setRole(role);
        router.push('/dashboard');
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 transition-colors duration-500 relative selection:bg-brand-orange selection:text-white overflow-hidden">
            <div className="absolute inset-0 dot-grid opacity-50 dark:opacity-20"></div>
            <div className="max-w-6xl w-full relative z-10">
                <Link href="/" className="mb-12 flex items-center gap-4 text-slate-400 hover:text-brand-orange font-bold text-[10px] uppercase tracking-widest transition-all group w-fit">
                    <ArrowRight className="rotate-180 group-hover:-translate-x-2 transition-transform" size={18} /> ROOT_EXIT
                </Link>
                <div className="mb-20">
                    <h2 className="text-6xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none mb-6">Authorization</h2>
                    <p className="text-xl text-slate-500 dark:text-slate-400 font-medium">Select access level for session established.</p>
                </div>

                <div className="grid md:grid-cols-2 gap-10">
                    {[
                        { id: 'OWNER' as Role, title: 'Strategic Command', desc: 'Portfolio management, resource optimization, and executive auditing.', icon: Layers },
                        { id: 'MANAGER' as Role, title: 'Operations', desc: 'Real-time site orchestration and active asset synchronization.', icon: HardHat }
                    ].map(opt => (
                        <button
                            key={opt.id}
                            onClick={() => handleRoleSelect(opt.id)}
                            className="group bg-white dark:bg-slate-900/50 border-2 border-slate-200 dark:border-slate-800 rounded-[3rem] p-12 text-left hover:border-brand-orange transition-all flex flex-col items-start shadow-sm hover:shadow-xl dark:shadow-none hover:scale-[1.02]"
                        >
                            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 mb-10 group-hover:bg-brand-orange group-hover:text-white transition-all shadow-inner border border-slate-100 dark:border-slate-700">
                                <opt.icon size={32} />
                            </div>
                            <h3 className="text-4xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter mb-6 leading-none">{opt.title}</h3>
                            <p className="text-lg text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-16 h-16 overflow-hidden">{opt.desc}</p>
                            <div className="mt-auto flex items-center gap-4 text-brand-orange font-black text-[10px] uppercase tracking-widest group-hover:gap-8 transition-all">
                                AUTHORIZE_SESSION <ChevronRight size={18} />
                            </div>
                        </button>
                    ))}
                </div>
            </div>
            <div className="fixed top-12 right-12 z-50">
                <ThemeToggle />
            </div>
        </div>
    );
};

export default RoleSelection;
