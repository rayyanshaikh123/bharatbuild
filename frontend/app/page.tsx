"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Truck,
  Layers,
  Zap,
  CheckCircle2,
  Activity,
  Construction,
  ArrowRight,
  Sparkles,
  Github,
  Twitter,
  Linkedin,
  Mail,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import ThemeToggle from '@/components/shared/theme-toggle';
import BlueprintTower from '@/components/tower/BlueprintTower';
import SlicedText from '@/components/ui/SlicedText';
import { CurrentYear } from '@/components/shared/CurrentYear';

const LandingPage = () => {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);
  const buildSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);

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

  const navLinks = [
    { label: 'Features', href: '#features' },
    { label: 'About', href: '#about' },
  ];

  return (
    <div className="bg-background text-foreground transition-colors duration-500 selection:bg-primary selection:text-primary-foreground">
      {/* FIXED NAVBAR */}
      <nav className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-500 ${
        isScrolled 
          ? 'py-4 bg-background/70 backdrop-blur-2xl border-b border-border/50 shadow-lg' 
          : 'py-6 bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3">
            <div className={`brand-badge inline-flex items-center gap-3 px-3 py-1 rounded-xl transition-all duration-300 ${
              isScrolled ? 'bg-card/80 shadow-md' : ''
            }`}>
              <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center text-primary-foreground shadow-xl">
                <Construction size={20} />
              </div>
              <span className="text-xl font-black tracking-tighter uppercase italic brand-text">
                Bharat<span className="text-primary">Build</span>
              </span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors uppercase tracking-widest"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link href="/login" className="hidden sm:block">
              <Button variant="ghost" className="text-xs uppercase tracking-widest px-4">
                Login
              </Button>
            </Link>
            <Link href="/signup">
              <Button className="text-xs uppercase tracking-widest px-6">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* 1. HERO SECTION */}
      <section className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden pt-24">
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
            <Link href="/signup">
              <Button 
                size="lg"
                className="px-10 py-4 text-sm uppercase tracking-widest hover:scale-105 transition-all rounded-xl h-auto group"
              >
                Start Building
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Button 
              variant="outline" 
              size="lg"
              className="px-10 py-4 text-sm uppercase tracking-widest hover:border-primary transition-all rounded-xl h-auto"
            >
              Explore Features
            </Button>
          </div>
        </div>
      </section>

      {/* 2. STICKY BUILDER SECTION */}
      <section id="features" ref={buildSectionRef} className="relative h-[1200vh] bg-secondary/30 dark:bg-card">
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

          <div className="relative z-10">
            <BlueprintTower progress={scrollProgress} />
          </div>

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

      {/* 3. CTA SECTION with SlicedText */}
      <section id="about" className="relative py-32 px-6 bg-background overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/[0.03] blur-[100px] rounded-full" />
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          {/* Sliced Text Badge */}
          <div className="mb-8 inline-block cursor-pointer">
            <SlicedText
              text="BUILD WITH US"
              className="text-xl md:text-3xl font-black uppercase tracking-[0.3em] text-primary italic"
              containerClassName="p-6 py-3 bg-primary/5 border border-primary/20 rounded-xl"
              splitSpacing={6}
            />
          </div>

          {/* Headline */}
          <h2 className="text-4xl md:text-6xl font-black tracking-tighter text-foreground uppercase italic mb-6">
            Ready to <span className="text-primary">Digitize</span> Your Sites?
          </h2>

          {/* Subtext */}
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Join leading contractors and builders who trust BharatBuild for real-time site monitoring, 
            automated DPRs, and complete project visibility.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup">
              <Button 
                size="lg"
                className="px-12 py-6 text-base uppercase tracking-widest rounded-xl h-auto group shadow-xl hover:shadow-primary/20 hover:scale-105 transition-all"
              >
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="/login">
              <Button 
                variant="outline"
                size="lg"
                className="px-12 py-6 text-base uppercase tracking-widest rounded-xl h-auto hover:border-primary transition-all"
              >
                Sign In
              </Button>
            </Link>
          </div>

          <p className="mt-8 text-sm text-muted-foreground">
            No credit card required • Setup in under 5 minutes
          </p>
        </div>
      </section>

      {/* 4. FOOTER */}
      <footer className="bg-card border-t border-border py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-primary-foreground shadow-lg">
                  <Construction size={22} />
                </div>
                <span className="text-2xl font-black tracking-tighter uppercase italic">
                  Bharat<span className="text-primary">Build</span>
                </span>
              </div>
              <p className="text-muted-foreground max-w-sm leading-relaxed">
                Enterprise field management for modern construction. 
                Digitize sites, automate reports, and gain complete project visibility.
              </p>
            </div>

            <div>
              <h4 className="text-sm font-bold uppercase tracking-widest text-foreground mb-4">Quick Links</h4>
              <ul className="space-y-3">
                <li>
                  <a href="#features" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                    Features
                  </a>
                </li>
                <li>
                  <Link href="/login" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                    Login
                  </Link>
                </li>
                <li>
                  <Link href="/signup" className="text-muted-foreground hover:text-primary transition-colors text-sm">
                    Get Started
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-bold uppercase tracking-widest text-foreground mb-4">Connect</h4>
              <div className="flex gap-4">
                <a href="#" className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all">
                  <Github size={18} />
                </a>
                <a href="#" className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all">
                  <Twitter size={18} />
                </a>
                <a href="#" className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all">
                  <Linkedin size={18} />
                </a>
                <a href="#" className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all">
                  <Mail size={18} />
                </a>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © <CurrentYear /> BharatBuild. All rights reserved.
            </p>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-foreground transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;