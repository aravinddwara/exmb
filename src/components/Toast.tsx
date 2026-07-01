import React, { useEffect, useState } from 'react';
import { CheckCircle } from 'lucide-react';

export const Toast = ({ message, onClose }: { message: string, onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 bg-geist-success/10 border border-geist-success text-geist-success rounded-md shadow-sm z-50 animate-in fade-in slide-in-from-top-4">
      <CheckCircle className="w-3.5 h-3.5" />
      <span className="text-xs font-medium">{message}</span>
    </div>
  );
};
