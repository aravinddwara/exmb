import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';

export const PrivacyPolicy: React.FC = () => {
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
        <h1 className="text-3xl font-medium tracking-tight text-geist-text-primary-light dark:text-geist-text-primary-dark mb-8">Privacy Policy</h1>
        
        <div className="space-y-8 text-geist-text-secondary-light dark:text-geist-text-secondary-dark font-light leading-relaxed">
          <section>
            <h2 className="text-xl font-medium text-geist-text-primary-light dark:text-geist-text-primary-dark mb-3">1. Information We Collect</h2>
            <p>
              We collect information to provide better services to our users. This includes basic account information such as your name, email address, and profile picture provided through third-party authentication services (e.g., Google). We also may collect usage data, test scores, and analytics regarding your interaction with the platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium text-geist-text-primary-light dark:text-geist-text-primary-dark mb-3">2. How We Use Information</h2>
            <p>
              The information we collect is used to personalize your learning experience, synchronize your progress across devices, provide analytics on your performance, and improve our services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium text-geist-text-primary-light dark:text-geist-text-primary-dark mb-3">3. Data Security</h2>
            <p>
              We implement industry-standard security measures to protect your personal information. Our databases are secured using Row-Level Security (RLS) to ensure that your private data is accessible only by you.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium text-geist-text-primary-light dark:text-geist-text-primary-dark mb-3">4. Third-Party Services</h2>
            <p>
              We use third-party services such as Supabase for database and authentication. These services have their own privacy policies governing their use of your data.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-medium text-geist-text-primary-light dark:text-geist-text-primary-dark mb-3">5. Changes to This Policy</h2>
            <p>
              We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page.
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
