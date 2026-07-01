import React from 'react';
import { Link } from 'react-router-dom';
import { Home, AlertTriangle } from 'lucide-react';

export const NotFound = () => {
  return (
    <div className="min-h-screen bg-geist-bg-light dark:bg-geist-bg-dark text-geist-text-primary-light dark:text-geist-text-primary-dark flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="p-4 bg-geist-error-light/10 dark:bg-geist-error-dark/10 rounded-full text-geist-error-light dark:text-geist-error-dark">
            <AlertTriangle className="w-12 h-12" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">404</h1>
          <h2 className="text-xl font-medium text-geist-text-secondary-light dark:text-geist-text-secondary-dark">Page not found</h2>
        </div>
        
        <p className="text-geist-text-secondary-light dark:text-geist-text-secondary-dark text-sm">
          Sorry, we couldn't find the page you're looking for. It might have been moved or deleted.
        </p>

        <div className="pt-4">
          <Link 
            to="/" 
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-geist-text-primary-light dark:bg-geist-text-primary-dark text-geist-bg-light dark:text-geist-bg-dark rounded-md hover:opacity-90 transition-opacity font-medium text-sm"
          >
            <Home className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};
