import React, { useEffect, useRef } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';

import { CosmicBackground } from '../components/CosmicBackground';

export const LandingPage: React.FC = () => {
  const { user, isLoading } = useAuthStore();

  if (isLoading) {
    return <div className="min-h-screen bg-black flex items-center justify-center text-white/50 font-sans text-sm">Initializing...</div>;
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="h-screen bg-black font-sans text-white flex flex-col overflow-hidden selection:bg-white/20 selection:text-white relative">
      <CosmicBackground />
      
      {/* Navigation */}
      <header className="absolute inset-x-0 top-0 z-50">
        <nav className="flex items-center justify-center px-4 lg:px-8 max-w-7xl mx-auto h-14" aria-label="Global">
          <Link to="/" className="flex items-center gap-1.5 outline-none group relative">
            <span className="font-bold text-xl tracking-tight text-white group-hover:text-white/80 transition-colors">exmb <span className="font-normal text-sm text-white/50">by abmio</span></span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="none" className="text-white/80 absolute -right-3.5 top-0.5">
              <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
            </svg>
          </Link>
        </nav>
      </header>

      <main className="flex-1 flex flex-col relative z-10 items-center justify-center pt-24 pb-12">
        <section className="relative px-6 flex flex-col items-center text-center max-w-xl mx-auto w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          >
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-4">
              Ace Your <span className="text-white">Exams.</span>
            </h1>
          </motion.div>

          <motion.p 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
            className="text-xs md:text-sm text-white/50 max-w-sm mx-auto mb-8 leading-relaxed font-light"
          >
            A clean, distraction-free practice environment designed for focus. Master your subjects with precision.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 15, filter: 'blur(5px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
          >
            <Link
              to="/login"
              className="group relative inline-flex items-center justify-center h-10 px-6 rounded-full bg-white text-black text-xs font-semibold hover:scale-[1.02] active:scale-[0.98] transition-all outline-none"
            >
              <span className="relative z-10 flex items-center gap-1.5">
                Start Practicing <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </Link>
          </motion.div>
        </section>
      </main>
      
      {/* Footer */}
      <footer className="absolute bottom-0 inset-x-0 py-4 z-10 bg-gradient-to-t from-black/80 to-transparent">
         <div className="max-w-7xl mx-auto flex flex-col items-center justify-center gap-1.5 px-4">
            <div className="flex gap-5 text-[11px] text-white/30">
               <Link to="/privacy" className="hover:text-white/60 transition-colors">Privacy</Link>
               <Link to="/terms" className="hover:text-white/60 transition-colors">Terms</Link>
               <a href="https://exmb.abmio.co" className="hover:text-white/60 transition-colors">exmb.abmio.co</a>
            </div>
            <span className="text-white/25 text-[9px]">© {new Date().getFullYear()} exmb by abmio</span>
         </div>
      </footer>
    </div>
  );
};


