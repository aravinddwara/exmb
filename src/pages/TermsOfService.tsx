import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';

export const TermsOfService: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-geist-bg-light dark:bg-geist-bg-dark font-sans text-geist-text-primary-light dark:text-geist-text-primary-dark flex flex-col selection:bg-geist-surface-light dark:selection:bg-geist-surface-dark">
      <header className="border-b border-geist-border-light dark:border-geist-border-dark sticky top-0 bg-geist-bg-light/80 dark:bg-geist-bg-dark/80 backdrop-blur-md z-50">
        <nav className="flex items-center justify-between p-4 lg:px-8 max-w-7xl mx-auto h-14">
          <Link to="/" className="font-bold text-xl tracking-tight text-geist-text-primary-light dark:text-geist-text-primary-dark">
            exmb <span className="font-normal text-sm text-geist-text-secondary-light dark:text-geist-text-secondary-dark">by abmio</span>
          </Link>
          <Link to="/login" className="text-sm font-medium text-geist-text-secondary-light dark:text-geist-text-secondary-dark hover:text-geist-text-primary-light dark:hover:text-geist-text-primary-dark transition-colors">
            Sign In
          </Link>
        </nav>
      </header>
      
      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-16 lg:py-24">
        <h1 className="text-3xl font-medium tracking-tight text-geist-text-primary-light dark:text-geist-text-primary-dark mb-8">Terms of Service</h1>
        
        <div className="space-y-8 text-geist-text-secondary-light dark:text-geist-text-secondary-dark font-light leading-relaxed">
          <section>
            <h2 className="text-xl font-medium text-geist-text-primary-light dark:text-geist-text-primary-dark mb-3">1. Acceptance of Terms</h2>
            <p>
              By accessing and using exmb, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by these terms, please do not use this service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium text-geist-text-primary-light dark:text-geist-text-primary-dark mb-3">2. Description of Service</h2>
            <p>
              exmb provides an online mock testing and question bank platform designed specifically for exam preparation. We reserve the right to modify or discontinue, temporarily or permanently, the service with or without notice.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium text-geist-text-primary-light dark:text-geist-text-primary-dark mb-3">3. User Conduct</h2>
            <p>
              You agree to use our services only for lawful purposes. You are prohibited from violating or attempting to violate the security of the platform, including unauthorized access, data scraping, or attempting to reverse engineer the application.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium text-geist-text-primary-light dark:text-geist-text-primary-dark mb-3">4. Intellectual Property</h2>
            <p>
              All content on this platform, including text, graphics, logos, and software, is the property of exmb or its content suppliers and is protected by copyright laws.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium text-geist-text-primary-light dark:text-geist-text-primary-dark mb-3">5. Disclaimer of Warranties</h2>
            <p>
              The service is provided on an "as is" and "as available" basis without any warranties of any kind. We do not guarantee that the service will be uninterrupted, timely, secure, or error-free.
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-geist-border-light dark:border-geist-border-dark py-8 text-center text-sm text-geist-text-secondary-light dark:text-geist-text-secondary-dark">
         <p>&copy; {new Date().getFullYear()} <span className="font-bold text-geist-text-primary-light dark:text-geist-text-primary-dark">exmb by abmio</span>. All rights reserved.</p>
      </footer>
    </div>
  );
};
