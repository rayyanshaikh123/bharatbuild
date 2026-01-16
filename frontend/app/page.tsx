'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Truck,
  Layers,
  Zap,
  CheckCircle2,
  Activity,
  Construction,
  ShieldCheck
} from 'lucide-react';
import Button from '@/components/ui/Button';
import ThemeToggle from '@/components/shared/ThemeToggle';
import BlueprintTower from '@/components/tower/BlueprintTower';

const LandingPage = () => {
  const router = useRouter();
  const [scrollProgress, setScrollProgress] = useState(0);
  const buildSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (!buildSectionRef.current) return;
      const rect = buildSectionRef.current.getBoundingClientRect();
      const scrolled = -rect.top;
      const total = rect.height - window.innerHeight - 400;
      const progress = Math.min(1, Math.max(0, scrolled / total));
      setScrollProgress(progress);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const phases = [
    { title: "Ground Scan", desc: "Digital twin excavation monitoring with high-precision site telemetry.", icon: Truck, side: 'left' },
    { title: "Core Alignment", desc: "Automated casting lifecycle tracking using decentralized node verification.", icon: Layers, side: 'right' },
    { title: "Grid Integrity", desc: "Real-time predictive clash detection for dense MEP networks and flow paths.", icon: Zap, side: 'left' },
    { title: "Audit Phase", desc: "AI-powered structural quality audit for enterprise compliance checks.", icon: CheckCircle2, side: 'right' }
  ];

  const handleEnter = () => {
    router.push('/select-role');
  };

  return (
    <div className="bg-white dark:bg-slate-950 transition-colors duration-500 selection:bg-brand-orange selection:text-white">
      {/* 1. HERO SECTION */}
      <section className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden dot-grid">
        <div className="absolute top-[-5%] right-[-5%] w-[400px] h-[400px] bg-brand-orange/[0.04] blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-5%] left-[-5%] w-[400px] h-[400px] bg-brand-orange/[0.08] blur-[120px] rounded-full"></div>

        <div className="max-w-6xl w-full text-center space-y-12 relative z-10">
          <div className="inline-flex items-center gap-3 px-4 py-2 bg-slate-100 dark:bg-slate-900 rounded-full border border-slate-200 dark:border-slate-800 animate-fade-in shadow-sm">
            <Activity size={12} className="text-brand-orange animate-pulse" />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Enterprise Field OS v5.2 Established</span>
          </div>

          <h1 className="text-6xl md:text-[8rem] font-black tracking-tighter text-slate-900 dark:text-white leading-[0.8] uppercase italic">
            Unified <br />
            <span className="text-brand-orange">Industrial</span>
          </h1>

          <p className="text-xl text-slate-500 dark:text-slate-400 font-medium max-w-2xl mx-auto leading-relaxed">
            Standardizing massive infrastructure through blueprint-level field digitization and real-time site orchestration.
          </p>

          <div className="flex flex-col sm:flex-row gap-5 justify-center pt-6">
            <Button onClick={handleEnter} className="px-10 py-4 text-sm uppercase tracking-widest bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:scale-105 transition-all rounded-xl">Terminal Entry</Button>
            <Button variant="outline" className="px-10 py-4 text-sm uppercase tracking-widest border-slate-300 dark:border-slate-800 hover:border-brand-orange transition-all rounded-xl">Specs Grid</Button>
          </div>
        </div>

        <div className="absolute bottom-12 flex flex-col items-center gap-4 text-slate-400">
          <span className="text-[10px] font-black uppercase tracking-[0.6em] animate-pulse">Syncing Site Data</span>
          <div className="w-px h-16 bg-gradient-to-b from-slate-200 to-transparent dark:from-slate-800"></div>
        </div>

        <div className="fixed top-0 left-0 right-0 p-8 flex justify-between items-center z-[100] bg-transparent backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="brand-badge inline-flex items-center gap-3 px-3 py-1 rounded-xl shadow-sm">
              <div className="w-9 h-9 bg-brand-orange rounded-xl flex items-center justify-center text-white shadow-xl shadow-orange-500/30">
                <Construction size={20} />
              </div>
              <span className="text-xl font-black tracking-tighter uppercase italic brand-text">Bharat<span className="text-brand-orange">Build</span></span>
            </div>
          </div>
          <div className="flex items-center gap-8">
            <ThemeToggle />
            <Button onClick={handleEnter} variant="ghost" className="uppercase tracking-[0.2em] text-[10px] border border-slate-300 dark:border-slate-800 px-8 py-3">Access Tier</Button>
          </div>
        </div>
      </section>

      {/* 2. STICKY BUILDER SECTION - Blueprint Theme */}
      <section ref={buildSectionRef} className="relative h-[1200vh] bg-slate-50 dark:bg-[#050B18]">
        {/* Subtle technical background grid (theme-aware via CSS variables) */}
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(var(--grid-accent) 1px, transparent 1px), linear-gradient(90deg, var(--grid-accent) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          opacity: 0.1
        }}></div>
        <div className="absolute inset-0" style={{
          backgroundImage: 'linear-gradient(var(--grid-accent-weak) 1px, transparent 1px), linear-gradient(90deg, var(--grid-accent-weak) 1px, transparent 1px)',
          backgroundSize: '200px 200px',
          opacity: 0.2
        }}></div>

        <div className="sticky top-0 h-screen w-full flex flex-col items-center justify-center overflow-hidden">

          <div className="absolute inset-0 bg-transparent dark:bg-gradient-to-b dark:from-[#050B18] dark:via-transparent dark:to-[#050B18] pointer-events-none"></div>

          {/* Centered Tower Container */}
          <div className="relative z-10 ">
            <BlueprintTower progress={scrollProgress} />
          </div>

          {/* Phase Overlay Cards */}
          <div className="absolute inset-0 pointer-events-none">
            {phases.map((phase, idx) => {
              const start = (idx) / phases.length;
              const end = (idx + 1) / phases.length;
              const isActive = scrollProgress >= start && scrollProgress < end;
              const isPast = scrollProgress >= end;

              return (
                <div key={idx} className={`absolute inset-0 flex items-center px-10 md:px-24 pointer-events-none transition-all duration-1000 ${phase.side === 'right' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[320px] md:max-w-[400px] transition-all duration-1000 transform ${isActive ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 ' + (isPast ? '-translate-y-48' : 'translate-y-48') + ' scale-95'} pointer-events-auto`}>
                    <div className="p-6 border-l-2 border-brand-orange/40">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-10 h-10 bg-brand-orange/5 rounded-xl flex items-center justify-center text-brand-orange border border-brand-orange/20">
                          <phase.icon size={20} />
                        </div>
                        <h3 className="text-2xl md:text-3xl font-black text-white uppercase italic tracking-tighter">NODE_0{idx + 1}</h3>
                      </div>
                      <p className="text-sm md:text-base text-slate-400 leading-tight font-bold mb-6 tracking-tight">{phase.desc}</p>

                      <div className="flex items-center gap-3">
                        <div className="h-0.5 flex-1 bg-slate-800 rounded-full overflow-hidden">
                          <div className="h-full bg-brand-orange transition-all duration-1000" style={{ width: isActive ? '100%' : '0%' }}></div>
                        </div>
                        <span className="font-mono text-[8px] font-black text-brand-orange/70 uppercase">LOCKED_SYNC</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Technical HUD */}
          <div className="absolute top-40 left-12 right-12 flex justify-between items-start z-20 pointer-events-none font-mono">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-brand-orange uppercase tracking-[0.5em]">BLUEPRINT_OVERLAY_ACTIVE</p>
              <h4 className="text-[12px] font-bold text-slate-600 uppercase">TELEMETRY_SCAN::CORE_LINK</h4>
            </div>
            <div className="text-right">
              <h4 className="text-6xl font-black text-white uppercase tracking-tighter leading-none">
                {Math.round(scrollProgress * 100)}%
              </h4>
              <p className="text-xs font-black text-slate-600 uppercase tracking-widest mt-2">VECTOR_STABILITY_INDEX</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. FINAL CALL TO ACTION */}
      <section className="h-screen flex flex-col items-center justify-center p-6 relative z-20 bg-slate-950 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-[0.05] dot-grid scale-[2]"></div>
        <div className="max-w-4xl w-full text-center space-y-10 relative z-10">
          <div className="w-20 h-20 bg-brand-orange rounded-3xl flex items-center justify-center text-white shadow-2xl mx-auto mb-10 border-4 border-white/5 animate-pulse">
            <ShieldCheck size={40} />
          </div>
          <h2 className="text-6xl md:text-8xl font-black uppercase italic tracking-tighter leading-none mb-6">
            Initialize <br /><span className="text-brand-orange">Industrial</span> Session
          </h2>
          <div className="flex flex-col sm:flex-row gap-6 justify-center pt-10">
            <Button onClick={handleEnter} className="px-14 py-6 text-xl uppercase tracking-widest bg-brand-orange hover:bg-orange-600 shadow-2xl hover:scale-105 transition-all rounded-2xl">Open Terminal</Button>
            <Button variant="outline" className="px-14 py-6 text-xl uppercase tracking-widest border-slate-700 text-slate-400 hover:text-white hover:border-slate-500 transition-all rounded-2xl">Network Map</Button>
          </div>
        </div>
      </section>

      <style jsx global>{`
        .preserve-3d { transform-style: preserve-3d; }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 1s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        
        .tower-panel { background: linear-gradient(180deg, rgba(8,10,16,0.6), rgba(12,14,20,0.8)); border: 1px solid rgba(249,115,22,0.06); box-shadow: inset 0 1px 0 rgba(255,255,255,0.02), 0 8px 30px rgba(2,6,23,0.45); }
        .dark .tower-panel { background: linear-gradient(180deg, rgba(8,10,16,0.8), rgba(12,14,20,0.9)); border: 1px solid rgba(249,115,22,0.08); box-shadow: inset 0 1px 0 rgba(255,255,255,0.03), 0 8px 30px rgba(2,6,23,0.6); }
        
        .tower-window { background: linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01)); border: 1px solid rgba(255,255,255,0.02); box-shadow: inset 0 -2px 6px rgba(2,6,23,0.25); height: 10px; }
        .dark .tower-window { background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02)); border: 1px solid rgba(255,255,255,0.04); box-shadow: inset 0 -2px 6px rgba(2,6,23,0.4); }
        
        .tower-shadow { background: radial-gradient(ellipse at center, rgba(2,6,23,0.45), rgba(2,6,23,0.12) 40%, transparent 70%); filter: blur(8px); border-radius: 999px; }
        .dark .tower-shadow { background: radial-gradient(ellipse at center, rgba(2,6,23,0.6), rgba(2,6,23,0.2) 40%, transparent 70%); filter: blur(10px); }

        .neon-stripe { background: linear-gradient(180deg, rgba(249,115,22,0.16), rgba(249,115,22,0.04)); box-shadow: 0 0 10px rgba(249,115,22,0.08); display:flex; align-items:center; justify-content:center; }
        .dark .neon-stripe { background: linear-gradient(180deg, rgba(249,115,22,0.2), rgba(249,115,22,0.06)); box-shadow: 0 0 12px rgba(249,115,22,0.12); }
        
        .neon-dots { display:flex; flex-direction:column; gap:10px; align-items:center; }
        .neon-dot { width:6px; height:6px; border-radius:999px; background: rgba(249,115,22,0.75); box-shadow: 0 0 8px rgba(249,115,22,0.75); opacity:0.04; transform:translateY(0); animation: neonPulse 3s infinite cubic-bezier(0.4,0,0.2,1); }
        .dark .neon-dot { background: rgba(249,115,22,0.85); box-shadow: 0 0 10px rgba(249,115,22,0.85); }
        .neon-dot:nth-child(2){ animation-delay:0.18s } .neon-dot:nth-child(3){ animation-delay:0.36s } .neon-dot:nth-child(4){ animation-delay:0.54s } .neon-dot:nth-child(5){ animation-delay:0.72s } .neon-dot:nth-child(6){ animation-delay:0.9s }

        @keyframes neonPulse {
          0% { opacity: 0.04; transform: translateY(-1px) scale(0.95); filter: blur(0px); }
          50% { opacity: 0.65; transform: translateY(0) scale(1); filter: blur(3px); }
          100% { opacity: 0.04; transform: translateY(1px) scale(0.95); filter: blur(0px); }
        }

        .floor-top { background: linear-gradient(180deg, #111318, #0b0f14); border-top: 1px solid rgba(255,255,255,0.02); box-shadow: inset 0 -6px 18px rgba(2,6,23,0.6); }
        .panel-expand { transition: transform 700ms cubic-bezier(0.16, 1, 0.3, 1); transform-origin: center bottom; }
        .tower-zoom { transition: transform 1100ms cubic-bezier(0.16, 1, 0.3, 1); }
        .brand-badge { background: rgba(255,255,255,0.96); }
        .brand-text { color: #0b1220; }
        .dark .brand-badge { background: rgba(255,255,255,0.06); }
        .dark .brand-text { color: #ffffff; }
        .brand-badge { display: inline-flex; align-items: center; gap: 0.5rem; }
      `}</style>
    </div>
  );
};

export default LandingPage;
