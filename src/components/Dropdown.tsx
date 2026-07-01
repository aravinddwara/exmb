import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: DropdownOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const Dropdown: React.FC<DropdownProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Select option',
  className = '',
  disabled = false,
}) => {
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

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div className={`relative inline-block text-left min-w-[140px] ${className}`} ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`flex items-center justify-between w-full rounded-md border px-3 py-1.5 text-xs outline-none transition-colors min-h-[32px] ${
          disabled
            ? 'opacity-50 cursor-not-allowed bg-geist-surface-light border-geist-border-light dark:bg-geist-surface-dark dark:border-geist-border-dark text-geist-text-secondary-light dark:text-geist-text-secondary-dark'
            : 'bg-geist-bg-light border-geist-border-light dark:bg-geist-bg-dark dark:border-geist-border-dark text-geist-text-primary-light dark:text-geist-text-primary-dark hover:border-geist-text-secondary-light dark:hover:border-geist-text-secondary-dark focus:border-geist-text-secondary-light dark:focus:border-geist-text-secondary-dark'
        }`}
      >
        <span className="truncate mr-2 font-medium">{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown className="w-3.5 h-3.5 shrink-0 text-geist-text-secondary-light dark:text-geist-text-secondary-dark" />
      </button>

      {isOpen && !disabled && (
        <div className="absolute left-0 mt-1 w-full min-w-max origin-top-left rounded-md bg-geist-bg-light dark:bg-geist-bg-dark shadow-sm border border-geist-border-light dark:border-geist-border-dark focus:outline-none z-50 max-h-60 overflow-y-auto">
          <div className="p-1">
            {options.map((option) => {
              const isSelected = value === option.value;
              return (
                <button
                  key={option.value}
                  onClick={(e) => {
                    e.preventDefault();
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-2 py-1.5 text-xs rounded transition-colors ${
                    isSelected
                      ? 'bg-geist-surface-light dark:bg-geist-surface-dark text-geist-text-primary-light dark:text-geist-text-primary-dark font-medium'
                      : 'text-geist-text-secondary-light dark:text-geist-text-secondary-dark hover:bg-geist-surface-light dark:hover:bg-geist-surface-dark hover:text-geist-text-primary-light dark:hover:text-geist-text-primary-dark'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
