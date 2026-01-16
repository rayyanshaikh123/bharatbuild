'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Truck,
  Layers,
  Zap,
  CheckCircle2,
  Activity,
  Construction,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import ThemeToggle from '@/components/shared/theme-toggle';
import BlueprintTower from '@/components/tower/BlueprintTower';

const LandingPage = () => {
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
    console.log('Dashboard route pending - shadcn migration in progress');
  };

  return (
    <div className="bg-background text-foreground transition-colors duration-500 selection:bg-primary selection:text-primary-foreground">
      {/* 1. HERO SECTION */}
      <section className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden dot-grid">
        <div className="absolute top-[-5%] right-[-5%] w-[400px] h-[400px] bg-primary/[0.04] blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-5%] left-[-5%] w-[400px] h-[400px] bg-primary/[0.08] blur-[120px] rounded-full"></div>

        <div className="max-w-6xl w-full text-center space-y-12 relative z-10">
          <div className="inline-flex items-center gap-3 px-4 py-2 bg-muted rounded-full border border-border animate-fade-in shadow-sm">
            <Activity size={12} className="text-primary animate-pulse" />
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Enterprise Field OS v5.2 Established</span>
          </div>

          <h1 className="text-6xl md:text-[8rem] font-black tracking-tighter text-foreground leading-[0.8] uppercase italic">
            Unified <br />
            <span className="text-primary">Industrial</span>
          </h1>

          <p className="text-xl text-muted-foreground font-medium max-w-2xl mx-auto leading-relaxed">
            Standardizing massive infrastructure through blueprint-level field digitization and real-time site orchestration.
          </p>

          <div className="flex flex-col sm:flex-row gap-5 justify-center pt-6">
            <Button 
              onClick={handleEnter} 
              size="lg"
              className="px-10 py-4 text-sm uppercase tracking-widest hover:scale-105 transition-all rounded-xl h-auto"
            >
              Terminal Entry
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              className="px-10 py-4 text-sm uppercase tracking-widest hover:border-primary transition-all rounded-xl h-auto"
            >
              Specs Grid
            </Button>
          </div>
        </div>
{/* 
        <div className="absolute bottom-12 flex flex-col items-center gap-4 text-slate-400">
          <span className="text-[10px] font-black uppercase tracking-[0.6em] animate-pulse">Syncing Site Data</span>
          <div className="w-px h-16 bg-gradient-to-b from-slate-200 to-transparent dark:from-slate-800"></div>
        </div> */}

        <div className="fixed top-0 left-0 right-0 p-8 flex justify-between items-center z-[100] bg-transparent backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="brand-badge inline-flex items-center gap-3 px-3 py-1 rounded-xl shadow-sm">
              <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center text-primary-foreground shadow-xl">
                <Construction size={20} />
              </div>
              <span className="text-xl font-black tracking-tighter uppercase italic brand-text">Bharat<span className="text-primary">Build</span></span>
            </div>
          </div>
          <div className="flex items-center gap-8">
            <ThemeToggle />
            <Button 
              onClick={handleEnter} 
              variant="outline"
              className="uppercase tracking-[0.2em] text-[10px] px-8 py-3 h-auto"
            >
              Access Tier
            </Button>
          </div>
        </div>
      </section>

      {/* 2. STICKY BUILDER SECTION - Blueprint Theme */}
      <section ref={buildSectionRef} className="relative h-[1200vh] bg-secondary/30 dark:bg-card">
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
          <div className="absolute inset-0 bg-transparent dark:bg-gradient-to-b dark:from-card dark:via-transparent dark:to-card pointer-events-none"></div>

          {/* Centered Tower Container */}
          <div className="relative z-10">
            <BlueprintTower progress={scrollProgress} />
          </div>

          {/* Phase Overlay Cards - Compact */}
          <div className="absolute inset-0 pointer-events-none">
            {phases.map((phase, idx) => {
              const start = (idx) / phases.length;
              const end = (idx + 1) / phases.length;
              const isActive = scrollProgress >= start && scrollProgress < end;
              const isPast = scrollProgress >= end;

              return (
                <div key={idx} className={`absolute inset-0 flex items-center px-4 md:px-8 pointer-events-none transition-all duration-1000 ${phase.side === 'right' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[240px] md:max-w-[280px] transition-all duration-1000 transform ${isActive ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 ' + (isPast ? '-translate-y-32' : 'translate-y-32') + ' scale-95'} pointer-events-auto`}>
                    <div className="p-4 border-l-2 border-primary/40 bg-card/80 backdrop-blur-sm rounded-r-lg">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary border border-primary/20">
                          <phase.icon size={16} />
                        </div>
                        <h3 className="text-lg md:text-xl font-black text-foreground uppercase italic tracking-tighter">NODE_0{idx + 1}</h3>
                      </div>
                      <p className="text-xs md:text-sm text-muted-foreground leading-snug font-medium mb-3">{phase.desc}</p>

                      <div className="flex items-center gap-2">
                        <div className="h-0.5 flex-1 bg-border rounded-full overflow-hidden">
                          <div className="h-full bg-primary transition-all duration-1000" style={{ width: isActive ? '100%' : '0%' }}></div>
                        </div>
                        <span className="font-mono text-[7px] font-bold text-primary/60 uppercase">SYNC</span>
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
              <p className="text-[10px] font-black text-primary uppercase tracking-[0.5em]">BLUEPRINT_OVERLAY_ACTIVE</p>
              <h4 className="text-[12px] font-bold text-muted-foreground uppercase">TELEMETRY_SCAN::CORE_LINK</h4>
            </div>
            <div className="text-right">
              <h4 className="text-6xl font-black text-foreground uppercase tracking-tighter leading-none">
                {Math.round(scrollProgress * 100)}%
              </h4>
              <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mt-2">VECTOR_STABILITY_INDEX</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;