"use client";

import "./(marketing)/landing.css";
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Truck,
  Layers,
  Zap,
  CheckCircle2,
  Activity,
  Construction,
  ArrowRight,
  ShieldCheck,
  Github,
  Twitter,
  Linkedin,
  Mail,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
// ThemeToggle removed for static landing page colors
import BlueprintTower from '@/components/tower/BlueprintTower';
import SlicedText from '@/components/ui/SlicedText';
import { CurrentYear } from '@/components/shared/CurrentYear';

const LandingPage = () => {
  const router = useRouter();
  const [scrollProgress, setScrollProgress] = useState(0);
  const buildSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      const el = buildSectionRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const scrolled = Math.max(0, -rect.top);
      const winHeight = typeof window !== 'undefined' ? window.innerHeight : 0;
      const scrollableTotal = Math.max(1, rect.height - winHeight);
      const progress = Math.min(1, Math.max(0, scrolled / scrollableTotal));
      setScrollProgress(progress);
    };

    // run once to initialize
    handleScroll();

    if (typeof window !== 'undefined') {
      window.addEventListener('scroll', handleScroll);
      return () => window.removeEventListener('scroll', handleScroll);
    }
  }, []);

  const phases = [
    { title: 'Ground Scan', desc: 'Digital twin excavation monitoring with high-precision site telemetry.', icon: Truck, side: 'left' },
    { title: 'Core Alignment', desc: 'Automated casting lifecycle tracking using decentralized node verification.', icon: Layers, side: 'right' },
    { title: 'Grid Integrity', desc: 'Real-time predictive clash detection for dense MEP networks and flow paths.', icon: Zap, side: 'left' },
    { title: 'Audit Phase', desc: 'AI-powered structural quality audit for enterprise compliance checks.', icon: CheckCircle2, side: 'right' },
  ];

  return (
    <div className="dot-grid transition-colors duration-500" style={{ background: '#ffffff', color: '#0F172A' }}>
      {/* 1. HERO SECTION */}
      <section className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden dot-grid">
        <div className="absolute inset-0 pointer-events-none dot-grid" style={{ backgroundImage: 'radial-gradient(rgba(15,23,42,0.06) 1px, transparent 1px)', backgroundSize: '22px 22px', opacity: 0.08, zIndex: 0 }}></div>
        <div className="absolute top-[-5%] right-[-5%] w-[400px] h-[400px] bg-brand-orange/[0.04] blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-5%] left-[-5%] w-[400px] h-[400px] bg-brand-orange/[0.08] blur-[120px] rounded-full"></div>

        <div className="max-w-6xl w-full text-center space-y-12 relative z-10">
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full border animate-fade-in shadow-sm" style={{ background: '#ffffff', borderColor: '#E2E8F0' }}>
              <Activity size={12} style={{ color: '#F97316' }} className="animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#64748B' }}>Enterprise Field OS v5.2 Established</span>
            </div>

          <h1 className="text-6xl md:text-[8rem] font-black tracking-tighter leading-[0.8] uppercase italic" style={{ color: '#0F172A' }}>
            Unified <br />
            <span style={{ color: '#F97316' }}>Industrial</span>
          </h1>

          <p className="text-xl font-medium max-w-2xl mx-auto leading-relaxed" style={{ color: '#64748B' }}>
            Standardizing massive infrastructure through blueprint-level field digitization and real-time site orchestration.
          </p>

          <div className="flex flex-col sm:flex-row gap-5 justify-center pt-6">
            <Button onClick={() => router.push('/login')} className="px-10 py-4 text-sm uppercase tracking-widest hover:scale-105 transition-all rounded-xl" style={{ background: '#F97316', color: '#ffffff' }}>Terminal Entry</Button>
            <Button onClick={() => router.push('/dashboard')} variant="outline" className="px-10 py-4 text-sm uppercase tracking-widest hover:border-brand-orange transition-all rounded-xl" style={{ borderColor: '#E2E8F0', color: '#ffffff' }}>Specs Grid</Button>
          </div>
        </div>

          <div className="absolute bottom-12 flex flex-col items-center gap-4" style={{ color: '#64748B' }}>
          <span className="text-[10px] font-black uppercase tracking-[0.6em] animate-pulse">Syncing Site Data</span>
          <div className="w-px h-16" style={{ backgroundImage: 'linear-gradient(#E2E8F0 1px, transparent 1px)' }}></div>
        </div>

        <div className="fixed top-0 left-0 right-0 p-8 flex justify-between items-center z-[100]  " >
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-0 bg-white rounded-2xl shadow-2xl border border-white/20" style={{ boxShadow: '0 16px 32px rgba(249, 116, 22, 0)' }}>
              <div className="w-10 h-10 flex items-center justify-center rounded-l-xl">
                <Construction size={22} style={{ color: '#F97316' }} />
              </div>
              <div className="px-4 py-2">
                <span className="text-xl font-black tracking-tighter uppercase italic" style={{ color: '#0F172A' }}>Bharat<span style={{ color: '#F97316' }}>Build</span></span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-8">
            <Button onClick={() => router.push('/login')} className="uppercase tracking-[0.2em] text-[10px] px-8 py-3" style={{ background: '#ffffff', borderColor: '#ffffff00', color: '#0F172A' }}>Access Tier</Button>
          </div>
        </div>
      </section>

      {/* 2. STICKY BUILDER SECTION - Blueprint Theme */}
      <section ref={buildSectionRef} className="relative h-[1200vh] bg-[#050B18]">
        {/* Subtle technical background grid */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'linear-gradient(#F9731611 1px, transparent 1px), linear-gradient(90deg, #F9731611 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}></div>
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: 'linear-gradient(#F9731608 1px, transparent 1px), linear-gradient(90deg, #F9731608 1px, transparent 1px)',
          backgroundSize: '200px 200px',
        }}></div>

        <div className="sticky top-0 h-screen w-full flex flex-col items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-[#050B18] via-transparent to-[#050B18] pointer-events-none"></div>

          {/* Centered Tower Container */}
          <div className="relative z-10">
            <BlueprintTower progress={scrollProgress} />
          </div>

          {/* Phase Overlay Cards */}
          <div className="absolute inset-0 pointer-events-none">
            {phases.map((phase, idx) => {
              const start = idx / phases.length;
              const end = (idx + 1) / phases.length;
              const isActive = scrollProgress >= start && scrollProgress < end;
              const isPast = scrollProgress >= end;

              return (
                <div key={idx} className={`absolute inset-0 flex items-center px-10 md:px-24 pointer-events-none transition-all duration-1000 ${phase.side === 'right' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[320px] md:max-w-[400px] transition-all duration-1000 transform ${isActive ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 ' + (isPast ? '-translate-y-48' : 'translate-y-48') + ' scale-95'} pointer-events-auto`}  style={{ color: 'var(--primary)' }}>
                    <div className="p-6 border-l-2 border-orange/40"  style={{ color: 'var(--primary)' }}>
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-10 h-10 bg-brand-orange/5 rounded-xl flex items-center justify-center text-brand-orange border border-brand-orange/20" style={{ color: 'var(--primary)' }}>
                          <phase.icon size={20} />
                        </div>
                        <h3 className="text-2xl md:text-3xl font-black uppercase italic tracking-tighter" style={{ color: 'white' }}>NODE_0{idx + 1}</h3>
                      </div>
                      <p className="text-sm md:text-base leading-tight font-bold mb-6 tracking-tight" style={{ color: 'var(--muted-foreground)' }}>{phase.desc}</p>

                      <div className="flex items-center gap-3">
                        <div className="h-0.5 flex-1 bg-slate-800 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                          <div className="h-full bg-brand-orange transition-all duration-1000" style={{ width: isActive ? '100%' : '0%' , color: 'var(--primary)'}}></div>
                        </div>
                        <span className="font-mono text-[8px] font-black uppercase" style={{ color: 'var(--primary)' }}>LOCKED_SYNC</span>
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
              <p className="text-[10px] font-black uppercase tracking-[0.5em]" style={{ color: 'var(--primary)' }}>BLUEPRINT_OVERLAY_ACTIVE</p>
              <h4 className="text-[12px] font-bold uppercase" style={{ color: 'var(--muted-foreground)' }}>TELEMETRY_SCAN::CORE_LINK</h4>
            </div>
            <div className="text-right">
              <h4 className="text-6xl font-black uppercase tracking-tighter leading-none" style={{ color: 'white' }}>
                {Math.round(scrollProgress * 100)}%
              </h4>
              <p className="text-[10px] font-black uppercase tracking-widest mt-2" style={{ color: 'var(--muted-foreground)' }}>VECTOR_STABILITY_INDEX</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. FINAL CALL TO ACTION */}
      <section className="h-screen flex flex-col items-center justify-center p-6 relative z-20 overflow-hidden dot-grid" style={{ color: '#ffffff', background: '#0F172A' }}>
         <div className="absolute inset-0 pointer-events-none dot-grid" style={{ backgroundImage: 'radial-gradient(rgba(15,23,42,0.06) 1px, transparent 1px)', backgroundSize: '22px 22px', opacity: 0.08, zIndex: 0 }}></div>
        <div className="max-w-4xl w-full text-center space-y-10 relative z-10">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-white shadow-2xl mx-auto mb-10 border-4 border-white/5 animate-pulse" style={{ background: '#F97316' }}>
            <ShieldCheck size={40} />
          </div>
          <h2 className="text-6xl md:text-8xl font-black uppercase italic tracking-tighter leading-none mb-6" style={{ color: '#ffffff' }}>
            Initialize <br /><span style={{ color: '#F97316' }}>Industrial</span> Session
          </h2>
          <div className="flex flex-col sm:flex-row gap-6 justify-center pt-10">
            <Button onClick={() => router.push('/login')} className="px-14 py-6 text-xl uppercase tracking-widest hover:scale-105 transition-all rounded-2xl" style={{ color: '#ffffff', background: '#F97316' }}>Open Terminal</Button>
            <Button onClick={() => router.push('/dashboard')} variant="outline" className="px-14 py-6 text-xl uppercase tracking-widest transition-all rounded-2xl" style={{ borderColor: '#E2E8F0', color: '#64748B' }}>Network Map</Button>
          </div>
        </div>
      </section>

      <style>{`
        .preserve-3d { transform-style: preserve-3d; }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 1s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes spin-reverse-slow {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        .animate-spin-slow { animation: spin-slow 20s linear infinite; }
        .animate-spin-reverse-slow { animation: spin-reverse-slow 25s linear infinite; }
      `}</style>
    </div>
  );
};

export default LandingPage;