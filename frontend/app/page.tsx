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
  Smartphone,
  Play,
} from 'lucide-react';
import Image from 'next/image';
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

      {/* 3. MOBILE APP SECTION */}
      <section className="py-24 px-6 bg-white overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="flex-1 space-y-8 text-left">
              <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full border" style={{ background: '#F8FAFC', borderColor: '#E2E8F0' }}>
                <Smartphone size={14} style={{ color: '#F97316' }} />
                <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#64748B' }}>Now Available for Field Teams</span>
              </div>
              
              <h2 className="text-5xl md:text-7xl font-black uppercase italic tracking-tighter leading-none" style={{ color: '#0F172A' }}>
                Industrial <br />
                <span style={{ color: '#F97316' }}>Mobility</span>
              </h2>
              
              <p className="text-lg font-medium leading-relaxed max-w-xl" style={{ color: '#64748B' }}>
                Stay connected to the site grid from anywhere. BharatBuild Mobile provides real-time telemetry, offline-first reporting, and automated geofence verification for your entire field workforce.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                <div className="flex items-center gap-3 p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                  <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-600">
                    <CheckCircle2 size={16} />
                  </div>
                  <span className="text-sm font-bold text-slate-700">Real-time Site Sync</span>
                </div>
                <div className="flex items-center gap-3 p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                  <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-600">
                    <CheckCircle2 size={16} />
                  </div>
                  <span className="text-sm font-bold text-slate-700">Offline DPR Mode</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 pt-8">
                <Button className="h-14 px-8 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white flex items-center gap-3 transition-all hover:scale-[1.02]">
                  <Smartphone size={20} />
                  <div className="text-left">
                    <div className="text-[10px] uppercase font-bold opacity-70">Download on</div>
                    <div className="text-sm font-black">App Store</div>
                  </div>
                </Button>
                <Button className="h-14 px-8 rounded-xl bg-[#0F172A] hover:bg-[#1E293B] text-white flex items-center gap-3 transition-all hover:scale-[1.02]">
                  <Play size={20} fill="white" />
                  <div className="text-left">
                    <div className="text-[10px] uppercase font-bold opacity-70">Get it on</div>
                    <div className="text-sm font-black">Google Play</div>
                  </div>
                </Button>
              </div>
            </div>

            <div className="flex-1 relative min-h-[600px] flex items-center justify-center">
              <div className="absolute inset-0 bg-brand-orange/5 blur-[120px] rounded-full transform scale-75 animate-pulse"></div>
              
              {/* Technical HUD Overlays */}
              <div className="absolute -top-10 -left-10 w-32 h-32 border-l border-t border-brand-orange/20 pointer-events-none hidden lg:block">
                <div className="absolute top-2 left-2 text-[8px] font-mono text-brand-orange/40 uppercase tracking-[0.3em]">UI_MODE::MOBILE_SYNC</div>
                <div className="absolute top-6 left-2 flex gap-1">
                   <div className="w-1 h-3 bg-brand-orange/20"></div>
                   <div className="w-1 h-2 bg-brand-orange/20"></div>
                   <div className="w-1 h-4 bg-brand-orange/40"></div>
                </div>
              </div>

              <div className="relative w-full max-w-[500px] h-[500px]">
                {/* Main Phone (Portrait) */}
                <div className="absolute left-1/2 -translate-x-1/2 top-0 w-[60%] z-20 animate-float">
                  <div className="relative drop-shadow-[0_45px_45px_rgba(0,0,0,0.5)]">
                    <Image 
                      src="/img 2-portrait.png" 
                      alt="BharatBuild Mobile Dashboard" 
                      width={500} 
                      height={1000}
                      className="w-full h-auto rounded-[2.5rem]"
                    />
                  </div>
                </div>

                {/* Floating HUD Elements */}
                <div className="absolute top-[15%] -right-8 bg-white/20 backdrop-blur-xl border border-white/30 p-4 rounded-2xl shadow-2xl animate-float [animation-delay:-3s] z-30 hidden md:block">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
                      <span className="text-[11px] font-black uppercase text-slate-900 tracking-tight">Active_Uplink</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-200/50 rounded-full overflow-hidden">
                      <div className="h-full bg-brand-orange w-[88%] rounded-full"></div>
                    </div>
                  </div>
                </div>

                <div className="absolute bottom-[20%] -left-16 bg-[#0F172A]/90 backdrop-blur-md p-5 rounded-2xl shadow-2xl animate-float [animation-delay:-1.5s] z-30 hidden md:block border border-white/5">
                  <div className="space-y-3">
                    <div className="flex gap-1.5">
                      {[1,2,3,4].map(i => <div key={i} className={`h-1.5 w-6 rounded-sm ${i < 4 ? 'bg-brand-orange' : 'bg-brand-orange/20'}`}></div>)}
                    </div>
                    <div>
                      <div className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-1">Grid Connectivity</div>
                      <div className="text-xs font-black text-white italic tracking-tighter uppercase">Industrial_Session::Stable</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-32">
            <div className="text-center mb-16">
              <h3 className="text-sm font-black uppercase tracking-[0.4em] text-slate-400 mb-2">Core capabilities</h3>
              <div className="w-12 h-1 bg-brand-orange mx-auto rounded-full"></div>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <div className="text-center p-8 rounded-3xl border transition-all hover:shadow-xl hover:-translate-y-1 group" style={{ background: '#ffffff', borderColor: '#E2E8F0' }}>
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 transition-transform group-hover:scale-110" style={{ background: 'rgba(249, 115, 22, 0.1)' }}>
                  <Zap size={32} style={{ color: '#F97316' }} />
                </div>
                <h3 className="text-xl font-black uppercase mb-3" style={{ color: '#0F172A' }}>Real-time Sync</h3>
                <p className="text-sm font-medium leading-relaxed" style={{ color: '#64748B' }}>Instant updates across all devices, ensuring everyone on site is aligned with the latest telemetry.</p>
              </div>

              <div className="text-center p-8 rounded-3xl border transition-all hover:shadow-xl hover:-translate-y-1 group" style={{ background: '#ffffff', borderColor: '#E2E8F0' }}>
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 transition-transform group-hover:scale-110" style={{ background: 'rgba(249, 115, 22, 0.1)' }}>
                  <Layers size={32} style={{ color: '#F97316' }} />
                </div>
                <h3 className="text-xl font-black uppercase mb-3" style={{ color: '#0F172A' }}>Offline Ready</h3>
                <p className="text-sm font-medium leading-relaxed" style={{ color: '#64748B' }}>Work flawlessly in remote sites. Sync automatically when connectivity is restored without data loss.</p>
              </div>

              <div className="text-center p-8 rounded-3xl border transition-all hover:shadow-xl hover:-translate-y-1 group" style={{ background: '#ffffff', borderColor: '#E2E8F0' }}>
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 transition-transform group-hover:scale-110" style={{ background: 'rgba(249, 115, 22, 0.1)' }}>
                  <ShieldCheck size={32} style={{ color: '#F97316' }} />
                </div>
                <h3 className="text-xl font-black uppercase mb-3" style={{ color: '#0F172A' }}>Secure Access</h3>
                <p className="text-sm font-medium leading-relaxed" style={{ color: '#64748B' }}>Enterprise-grade security with encrypted local storage and biometric authentication support.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
      

      {/* 4. FINAL CALL TO ACTION */}
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
            <Button onClick={() => router.push('/dashboard')} variant="outline" className="px-14 py-6 text-xl uppercase tracking-widest transition-all rounded-2xl" style={{ borderColor: '#E2E8F0', color: '#ffffff' }}>Network Map</Button>
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
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(1deg); }
        }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-spin-slow { animation: spin-slow 20s linear infinite; }
        .animate-spin-reverse-slow { animation: spin-reverse-slow 25s linear infinite; }
      `}</style>
    </div>
  );
};

export default LandingPage;