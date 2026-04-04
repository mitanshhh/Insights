"use client";

import Link from "next/link";
import { 
  Shield, 
  Terminal, 
  FileText, 
  Settings, 
  Mail, 
  ExternalLink,
  Activity,
  Zap,
  ChevronRight,
  Menu,
  ShieldAlert
} from "lucide-react";
import NetworkSimulation from "@/components/NetworkSimulation";
import { useEffect, useState } from "react";

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#000000] text-[#D4D4D8] font-sans selection:bg-brand-primary selection:text-white">
      {/* Noise Overlay */}
      <div className="fixed inset-0 pointer-events-none z-50 opacity-[0.04] bg-[url('data:image/svg+xml,%3Csvg_viewBox=%270_0_200_200%27_xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cfilter_id=%27noiseFilter%27%3E%3CfeTurbulence_type=%27fractalNoise%27_baseFrequency=%270.75%27_numOctaves=%273%27_stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect_width=%27100%25%27_height=%27100%25%27_filter=%27url(%23noiseFilter)%27/%3E%3C/svg%3E')]" />

      {/* Header */}
      <header className={`fixed top-0 left-0 w-full z-40 transition-all duration-300 border-b border-white/5 backdrop-blur-md ${scrolled ? 'bg-[#0f0f11]/80 py-3' : 'bg-transparent py-5'}`}>
        <div className="container mx-auto px-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="p-1.5 bg-brand-primary/10 rounded-lg group-hover:bg-brand-primary/20 transition-colors">
               <img src="/logo.png" alt="Insights Logo" className="w-7 h-7 object-contain" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">Insights</span>
          </Link>

          <nav className="hidden md:flex items-center gap-10">
             <Link href="#features" className="text-sm font-medium hover:text-brand-primary transition-colors">Features</Link>
             <Link href="#simulation" className="text-sm font-medium hover:text-brand-primary transition-colors">Simulation</Link>
             <Link href="#contact" className="text-sm font-medium hover:text-brand-primary transition-colors">Contact</Link>
          </nav>

          <div className="flex items-center gap-4">
             <Link 
               href="/login.html" 
               className="hidden md:inline-flex px-6 py-2 bg-brand-primary hover:bg-brand-primary-hover text-white rounded-xl font-bold text-sm transition-all shadow-[0_4px_15px_rgba(249,115,22,0.4)] hover:translate-y-[-1px] active:scale-95"
             >
               Get Started
             </Link>
             <button className="md:hidden text-white" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                <Menu className="w-6 h-6" />
             </button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="pt-48 pb-24 text-center px-6">
           <div className="max-w-4xl mx-auto">
              <h1 className="text-5xl md:text-7xl font-extrabold text-white leading-tight tracking-tighter mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                 Turn Queries into <span className="bg-gradient-to-r from-brand-primary to-orange-400 bg-clip-text text-transparent italic">Clarity</span>
              </h1>
              <p className="text-lg md:text-xl text-gray-400 mb-12 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
                 Analyze logs, detect anomalies, and secure your systems with a context-aware AI engine designed for security professionals.
              </p>
              
              <div className="w-full max-w-5xl mx-auto rounded-2xl overflow-hidden border border-brand-primary/20 shadow-[0_0_50px_rgba(249,115,22,0.1)] mb-12 animate-in fade-in zoom-in duration-1000 delay-300">
                 <img src="/landing_page_dashboard.png" alt="Insights Dashboard" className="w-full h-auto object-cover grayscale-[0.2] hover:grayscale-0 transition-all duration-700" />
              </div>
           </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24 bg-gradient-to-b from-[#000000] to-[#0a0a0c]">
           <div className="container mx-auto px-6">
              <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-16 underline decoration-brand-primary/30 underline-offset-8">
                 AI-Driven Detection Workflow
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                 <FeatureCard 
                    step="1"
                    title="Log Ingestion"
                    desc="Stream massive volumes of CSV and system logs into the processing engine with zero latency."
                    icon={<FileText className="w-6 h-6" />}
                 />
                 <FeatureCard 
                    step="2"
                    title="AI Classification"
                    desc="Neural networks categorize logs in real-time into Critical, Warning, and Informational tiers."
                    icon={<Activity className="w-6 h-6" />}
                 />
                 <FeatureCard 
                    step="3"
                    title="Actionable Intelligence"
                    desc="Receive precise remediation steps and automated containment protocols directly in chat."
                    icon={<Terminal className="w-6 h-6" />}
                 />
              </div>
           </div>
        </section>

        {/* Simulation Section - THE PLACEHOLDER */}
        <section id="simulation" className="py-32 relative overflow-hidden bg-[#0A0A0C]">
           <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-brand-primary/5 blur-[120px] rounded-full" />
           <div className="container mx-auto px-6 relative z-10">
              <div className="text-center mb-16">
                 <h2 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tighter">
                   Graph Simulation Engine
                 </h2>
                 <p className="text-gray-500 max-w-xl mx-auto text-lg">
                   Visualize threat vectors through our Digital Twin network map and see how an attack propagates.
                 </p>
              </div>

              {/* THE NETWORK SIMULATION COMPONENT */}
              <div className="max-w-6xl mx-auto opacity-100 scale-100">
                 <NetworkSimulation />
              </div>
           </div>
        </section>

        {/* Footer */}
        <footer id="contact" className="bg-[#000000] border-t border-white/5 py-24">
           <div className="container mx-auto px-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-16 mb-20 text-left items-start">
                 <div>
                    <div className="flex items-center gap-3 mb-6">
                       <img src="/logo.png" alt="Logo" className="w-8 h-8 opacity-80" />
                       <span className="text-2xl font-bold text-white tracking-tight">Insights</span>
                    </div>
                    <p className="text-gray-500 leading-relaxed max-w-xs">
                       Advanced threat detection and context-aware mitigation engine built for SOC analysts.
                    </p>
                 </div>

                 <div>
                    <h3 className="text-white font-bold mb-6 text-sm uppercase tracking-widest">Built With</h3>
                    <ul className="space-y-4 text-sm text-gray-500">
                       <li className="flex items-center gap-2 hover:text-white transition-colors cursor-default">
                          <Zap className="w-3 h-3 text-brand-primary" />
                          <span>React & Next.js 15+</span>
                       </li>
                       <li className="flex items-center gap-2">
                          <Zap className="w-3 h-3 text-brand-primary" />
                          <span>Cytoscape.js Orchestration</span>
                       </li>
                       <li className="flex items-center gap-2">
                          <Zap className="w-3 h-3 text-brand-primary" />
                          <span>FastAPI Backend Engine</span>
                       </li>
                       <li className="flex items-center gap-2">
                          <Zap className="w-3 h-3 text-brand-primary" />
                          <span>Llama 3.3 (Groq AI)</span>
                       </li>
                    </ul>
                 </div>

                 <div className="space-y-8">
                    <h3 className="text-white font-bold text-sm uppercase tracking-widest">Contact Engineering</h3>
                    <div className="space-y-6">
                       <ContactPerson name="Mitansh Jadhav" email="mitansh.jadhav2007@gmail.com" />
                       <ContactPerson name="Om Korade" email="omkorade23@gmail.com" />
                    </div>
                 </div>
              </div>

              <div className="pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 text-xs text-gray-600 font-bold uppercase tracking-widest">
                 <p>© 2026 Insights Intelligence</p>
                 <div className="flex gap-8">
                    <span className="hover:text-brand-primary cursor-pointer transition-colors">Privacy Policy</span>
                    <span className="hover:text-brand-primary cursor-pointer transition-colors">Github OSS</span>
                 </div>
              </div>
           </div>
        </footer>
      </main>
    </div>
  );
}

function FeatureCard({ step, title, desc, icon }: { step: string, title: string, desc: string, icon: React.ReactNode }) {
  return (
    <div className="p-8 rounded-2xl bg-bg-panel border border-border/60 hover:border-brand-primary/40 transition-all duration-300 group hover:translate-y-[-4px]">
      <div className="flex items-center justify-between mb-8">
         <div className="p-3 bg-brand-primary/10 rounded-xl text-brand-primary group-hover:bg-brand-primary group-hover:text-white transition-all duration-300">
            {icon}
         </div>
         <span className="text-4xl font-black text-white/5 tracking-tighter italic">0{step}</span>
      </div>
      <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
      <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
    </div>
  );
}

function ContactPerson({ name, email }: { name: string, email: string }) {
  return (
    <div className="group">
       <div className="text-white font-semibold text-sm mb-2 group-hover:text-brand-primary transition-colors">{name}</div>
       <div className="flex items-center gap-4">
          <a href={`mailto:${email}`} className="text-gray-500 hover:text-white transition-colors">
             <Mail className="w-4 h-4" />
          </a>
          <Link href="#" className="text-gray-500 hover:text-white transition-colors">
             <ExternalLink className="w-4 h-4" />
          </Link>
          <span className="text-[10px] text-gray-700 font-mono italic truncate">{email}</span>
       </div>
    </div>
  );
}
