import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { motion } from 'motion/react';
import { ArrowRight, Sparkles, Target, BookOpen } from 'lucide-react';

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
    <div className="min-h-screen bg-black font-sans text-white flex flex-col overflow-hidden selection:bg-white/20 selection:text-white relative">
      <CosmicBackground />
      
      {/* Navigation */}
      <header className="absolute inset-x-0 top-0 z-50">
        <nav className="flex items-center justify-between px-6 lg:px-12 max-w-7xl mx-auto h-16" aria-label="Global">
          <Link to="/" className="flex items-center gap-2 outline-none group relative">
            <span className="font-semibold text-lg tracking-tight text-white group-hover:text-white/80 transition-colors">exmb</span>
          </Link>
          <div className="flex items-center gap-4">
             <Link to="/login" className="text-sm font-medium text-white/70 hover:text-white transition-colors">Sign in</Link>
          </div>
        </nav>
      </header>

      <main className="flex-1 flex flex-col relative z-10 items-center justify-center pt-32 pb-20">
        <section className="relative px-6 flex flex-col items-center text-center max-w-4xl mx-auto w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          >
            <h1 className="text-4xl md:text-6xl font-medium tracking-tight text-white mb-6 leading-[1.1]">
              Master your exams with <br className="hidden md:block"/>
              surgical precision.
            </h1>
          </motion.div>

          <motion.p 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
            className="text-sm md:text-base text-white/40 max-w-xl mx-auto mb-10 leading-relaxed font-light"
          >
            A distraction-free, elegant platform engineered to optimize your focus and track your academic progress.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center gap-4"
          >
            <Link
              to="/login"
              className="group relative inline-flex items-center justify-center h-10 px-8 rounded-full bg-white text-black text-xs font-medium hover:opacity-90 transition-all outline-none"
            >
              <span className="relative z-10 flex items-center gap-2">
                Start Practicing
              </span>
            </Link>
          </motion.div>
        </section>

        {/* Feature Highlights */}
        <motion.section 
           initial={{ opacity: 0, y: 30 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.5 }}
           className="relative z-10 mt-32 grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto px-6 w-full text-left"
        >
           <div className="flex flex-col gap-2">
              <h3 className="text-white text-sm font-medium">Targeted Sessions</h3>
              <p className="text-xs text-white/40 leading-relaxed">Isolate your weaknesses and practice exactly what you need with our modular mock test engine.</p>
           </div>
           <div className="flex flex-col gap-2">
              <h3 className="text-white text-sm font-medium">Analytics & Planning</h3>
              <p className="text-xs text-white/40 leading-relaxed">Track every minute of your focus time and visualize your academic mastery over the entire syllabus.</p>
           </div>
        </motion.section>
      </main>
      
      {/* Footer */}
      <footer className="relative z-10 py-8">
         <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 px-6 lg:px-12">
            <div className="flex items-center gap-2">
               <span className="text-white/30 text-[10px]">© {new Date().getFullYear()} exmb by abmio.</span>
            </div>
            <div className="flex gap-6 text-[10px] text-white/30">
               <Link to="/privacy" className="hover:text-white/50 transition-colors">Privacy Policy</Link>
               <Link to="/terms" className="hover:text-white/50 transition-colors">Terms of Service</Link>
            </div>
         </div>
      </footer>
    </div>
  );
};


