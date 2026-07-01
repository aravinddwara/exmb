import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface DropdownOption {
  value: string;
  label: string;
}

interface CustomDropdownProps {
  value: string;
  onChange: (val: string) => void;
  options: string[] | DropdownOption[];
  placeholder?: string;
  className?: string;
}

export const CustomDropdown: React.FC<CustomDropdownProps> = ({ value, onChange, options, placeholder = 'Select', className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const normalizedOptions: DropdownOption[] = options.map(opt => 
    typeof opt === 'string' ? { value: opt, label: opt } : opt
  );

  const selectedOption = normalizedOptions.find(opt => opt.value === value);
  const displayLabel = selectedOption ? selectedOption.label : (value === 'All' || value === 'all' ? placeholder : value);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full bg-transparent text-sm text-geist-text-primary-light dark:text-geist-text-primary-dark outline-none cursor-pointer group"
      >
        <span className="truncate pr-2">{displayLabel}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-geist-text-secondary-light transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            transition={{ duration: 0.15 }}
            className="absolute z-[100] mt-2 w-48 max-h-60 overflow-y-auto bg-geist-bg-light dark:bg-geist-bg-dark border border-geist-border-light dark:border-geist-border-dark rounded-xl shadow-lg p-1 right-0 sm:left-0 sm:right-auto"
          >
            <div 
              onClick={() => { onChange('All'); setIsOpen(false); }}
              className={`flex items-center justify-between px-3 py-2 text-sm rounded-lg cursor-pointer transition-colors ${value === 'All' || value === 'all' ? 'bg-geist-surface-light dark:bg-geist-surface-dark font-medium' : 'hover:bg-geist-surface-light dark:hover:bg-geist-surface-dark text-geist-text-secondary-light dark:text-geist-text-secondary-dark'}`}
            >
              <span className="truncate">{placeholder}</span>
              {(value === 'All' || value === 'all') && <Check className="w-4 h-4 text-geist-text-primary-light dark:text-geist-text-primary-dark" />}
            </div>
            {normalizedOptions.map((opt) => (
              <div
                key={opt.value}
                onClick={() => { onChange(opt.value); setIsOpen(false); }}
                className={`flex items-center justify-between px-3 py-2 text-sm rounded-lg cursor-pointer transition-colors ${value === opt.value ? 'bg-geist-surface-light dark:bg-geist-surface-dark font-medium' : 'hover:bg-geist-surface-light dark:hover:bg-geist-surface-dark text-geist-text-secondary-light dark:text-geist-text-secondary-dark'}`}
              >
                <span className="truncate">{opt.label}</span>
                {value === opt.value && <Check className="w-4 h-4 text-geist-text-primary-light dark:text-geist-text-primary-dark" />}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

