import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Home, LogOut, Menu, X, ShieldAlert, UploadCloud, Network, Layers, Database, FolderTree, User, Bookmark, AlertCircle, History, List, BookOpen, Timer, Calendar } from 'lucide-react';
import { ThemeToggle } from '../components/ThemeToggle';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { motion, AnimatePresence } from 'motion/react';

export const DashboardLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isAdmin } = useAuthStore();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };
  
  const studentNavItems = [
    { name: 'Home', path: '/dashboard', icon: Home },
    { name: 'Exams', path: '/exams', icon: Layers },
    { name: 'Subjects', path: '/subjects', icon: FolderTree },
    { name: 'Bookmarks', path: '/bookmarks', icon: Bookmark },
    { name: 'Mistakes', path: '/mistakes', icon: AlertCircle },
    { name: 'Lists', path: '/custom-lists', icon: List },
    { name: 'Planner', path: '/planner', icon: Calendar },
    { name: 'Focus Timer', path: '/timer', icon: Timer },
    { name: 'History', path: '/history', icon: History },
  ];

  const adminNavItems = isAdmin ? [
    { name: 'Overview', path: '/admin', icon: ShieldAlert },
    { name: 'Academic', path: '/admin/academic', icon: FolderTree },
    { name: 'Question Types', path: '/admin/question-types', icon: Layers },
    { name: 'Books / Sets', path: '/admin/books-sets', icon: BookOpen },
    { name: 'Exams', path: '/admin/exams', icon: Network },
    { name: 'Papers', path: '/admin/papers', icon: Layers },
    { name: 'Questions', path: '/admin/questions', icon: Database },
    { name: 'Import', path: '/admin/import', icon: UploadCloud }
  ] : [];

  const renderNavLinks = (items: typeof studentNavItems) => {
    return items.map((item) => {
      const Icon = item.icon;
      const isActive = location.pathname === item.path || (item.path !== '/admin' && location.pathname.startsWith(item.path) && item.path !== '/dashboard');
      return (
        <Link
          key={item.path}
          to={item.path}
          onClick={() => setMobileMenuOpen(false)}
          className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
            isActive 
              ? 'bg-geist-border-light dark:bg-geist-border-dark text-geist-text-primary-light dark:text-geist-text-primary-dark' 
              : 'text-geist-text-secondary-light dark:text-geist-text-secondary-dark hover:bg-geist-surface-light dark:hover:bg-geist-surface-dark hover:text-geist-text-primary-light dark:hover:text-geist-text-primary-dark'
          }`}
        >
          <Icon className="w-4 h-4 opacity-80" />
          {item.name}
        </Link>
      );
    });
  };

  const mobileNavItems = studentNavItems.slice(0, 4);

  return (
    <div className="h-screen w-full bg-geist-bg-light dark:bg-geist-bg-dark flex selection:bg-geist-border-light dark:selection:bg-geist-border-dark font-sans text-geist-text-primary-light dark:text-geist-text-primary-dark overflow-hidden">
      {/* Sidebar for Desktop */}
      <aside className="w-56 bg-geist-bg-light dark:bg-geist-bg-dark border-r border-geist-border-light dark:border-geist-border-dark flex-col hidden md:flex shrink-0">
        <div className="h-14 flex items-center px-4 justify-between gap-4 border-b border-geist-border-light dark:border-geist-border-dark">
          <Link to="/" className="flex items-center gap-2 outline-none">
            <span className="font-semibold text-sm tracking-tight text-geist-text-primary-light dark:text-geist-text-primary-dark">exmb <span className="text-[10px] font-normal text-geist-text-secondary-light dark:text-geist-text-secondary-dark">by abmio</span></span>
          </Link>
          <ThemeToggle />
        </div>
        
        <nav className="flex-1 py-4 px-2 space-y-6 overflow-y-auto no-scrollbar">
          <div>
            <div className="space-y-0.5">
              {renderNavLinks(studentNavItems)}
            </div>
          </div>

          {isAdmin && (
            <div>
              <h3 className="px-3 text-[10px] font-semibold text-geist-text-secondary-light dark:text-geist-text-secondary-dark uppercase tracking-widest mb-2">Admin</h3>
              <div className="space-y-0.5">
                {renderNavLinks(adminNavItems)}
              </div>
            </div>
          )}
        </nav>
        
        <div className="p-3 border-t border-geist-border-light dark:border-geist-border-dark flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-hidden px-2">
            <User className="w-4 h-4 text-geist-text-secondary-light dark:text-geist-text-secondary-dark shrink-0" />
            <span className="text-xs text-geist-text-secondary-light dark:text-geist-text-secondary-dark truncate font-medium">
              {user?.email}
            </span>
          </div>
          <button 
            onClick={handleSignOut}
            className="p-1.5 rounded-lg transition-colors hover:bg-geist-error-light/10 dark:hover:bg-geist-error-dark/10 text-geist-text-secondary-light dark:text-geist-text-secondary-dark hover:text-geist-error-light dark:hover:text-geist-error-dark shrink-0"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden h-full bg-geist-surface-light/30 dark:bg-geist-surface-dark/30 relative pb-16 md:pb-0">
        {/* Mobile Header */}
        <header className="h-14 border-b border-geist-border-light dark:border-geist-border-dark flex items-center px-4 justify-between shrink-0 bg-geist-bg-light dark:bg-geist-bg-dark md:hidden z-[100] relative">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm tracking-tight text-geist-text-primary-light dark:text-geist-text-primary-dark">exmb <span className="text-[10px] font-normal text-geist-text-secondary-light dark:text-geist-text-secondary-dark">by abmio</span></span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </header>
        
        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-geist-bg-light dark:bg-geist-bg-dark border-t border-geist-border-light dark:border-geist-border-dark flex items-center justify-around px-2 z-40 pb-safe">
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center w-16 h-full gap-1 transition-colors ${
                isActive 
                  ? 'text-geist-text-primary-light dark:text-geist-text-primary-dark' 
                  : 'text-geist-text-secondary-light dark:text-geist-text-secondary-dark hover:text-geist-text-primary-light dark:hover:text-geist-text-primary-dark'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'opacity-100' : 'opacity-70'}`} />
              <span className="text-[10px] font-medium leading-none">{item.name}</span>
            </Link>
          );
        })}
        <button
          onClick={() => setMobileMenuOpen(true)}
          className={`flex flex-col items-center justify-center w-16 h-full gap-1 transition-colors ${
            mobileMenuOpen 
              ? 'text-geist-text-primary-light dark:text-geist-text-primary-dark' 
              : 'text-geist-text-secondary-light dark:text-geist-text-secondary-dark hover:text-geist-text-primary-light dark:hover:text-geist-text-primary-dark'
          }`}
        >
          <Menu className={`w-5 h-5 ${mobileMenuOpen ? 'opacity-100' : 'opacity-70'}`} />
          <span className="text-[10px] font-medium leading-none">Menu</span>
        </button>
      </nav>

      {/* Mobile Menu Overlay / Bottom Sheet */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 z-50 bg-geist-bg-light/80 dark:bg-geist-bg-dark/80 backdrop-blur-sm md:hidden"
            />
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-geist-bg-light dark:bg-geist-bg-dark border-t border-geist-border-light dark:border-geist-border-dark rounded-t-2xl shadow-2xl flex flex-col max-h-[85vh] md:hidden"
            >
              <div className="h-14 flex items-center px-6 justify-between border-b border-geist-border-light dark:border-geist-border-dark shrink-0">
                <span className="font-semibold text-sm">More Options</span>
                <button 
                  className="w-8 h-8 flex items-center justify-center text-geist-text-secondary-light dark:text-geist-text-secondary-dark hover:text-geist-text-primary-light dark:hover:text-geist-text-primary-dark rounded-full bg-geist-surface-light dark:bg-geist-surface-dark transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <nav className="flex-1 py-4 px-4 space-y-6 overflow-y-auto no-scrollbar">
                <div>
                  <div className="space-y-1">
                    {renderNavLinks(studentNavItems.slice(4))}
                  </div>
                </div>

                {isAdmin && (
                  <div>
                    <h3 className="px-3 text-[10px] font-semibold text-geist-text-secondary-light dark:text-geist-text-secondary-dark uppercase tracking-widest mb-2">Admin</h3>
                    <div className="space-y-1">
                      {renderNavLinks(adminNavItems)}
                    </div>
                  </div>
                )}
              </nav>
              
              <div className="p-4 border-t border-geist-border-light dark:border-geist-border-dark shrink-0 bg-geist-surface-light/30 dark:bg-geist-surface-dark/30 pb-safe flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 overflow-hidden px-2">
                  <User className="w-4 h-4 text-geist-text-secondary-light dark:text-geist-text-secondary-dark shrink-0" />
                  <span className="text-xs text-geist-text-secondary-light dark:text-geist-text-secondary-dark truncate font-medium">
                    {user?.email}
                  </span>
                </div>
                <button 
                  onClick={handleSignOut}
                  className="flex justify-center items-center p-2.5 rounded-lg border border-geist-border-light dark:border-geist-border-dark bg-geist-bg-light dark:bg-geist-bg-dark text-geist-text-primary-light dark:text-geist-text-primary-dark hover:bg-geist-error-light/10 dark:hover:bg-geist-error-dark/10 hover:text-geist-error-light dark:hover:text-geist-error-dark hover:border-geist-error-light/20 dark:hover:border-geist-error-dark/20 transition-colors shrink-0 outline-none"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

