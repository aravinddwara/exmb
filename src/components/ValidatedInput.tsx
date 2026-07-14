import React, { forwardRef, useId } from 'react';

interface ValidatedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  /** Label text displayed above the input */
  label?: string;
  /** Error message — when truthy, input shows error styling */
  error?: string;
  /** Maximum character length (enforced at the DOM level and prevents overflow) */
  maxLength?: number;
  /** Regex pattern for validation — input value is tested on every change */
  pattern?: string;
  /** Called with the sanitized value on every valid change */
  onChange?: (value: string) => void;
  /** Visual variant */
  variant?: 'default' | 'compact';
}

/**
 * Centralized input component with built-in validation, max-length enforcement,
 * and consistent styling. Use this instead of raw <input> elements to ensure
 * uniform UX and security (max-length, pattern) across the application.
 */
export const ValidatedInput = forwardRef<HTMLInputElement, ValidatedInputProps>(
  ({ label, error, maxLength, pattern, onChange, variant = 'default', className = '', id: externalId, ...rest }, ref) => {
    const autoId = useId();
    const inputId = externalId || autoId;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let value = e.target.value;

      // Enforce maxLength at the logic level (belt-and-suspenders with HTML attr)
      if (maxLength && value.length > maxLength) {
        value = value.slice(0, maxLength);
      }

      // If a regex pattern is provided, only propagate if value matches
      if (pattern) {
        const regex = new RegExp(pattern);
        if (!regex.test(value) && value.length > 0) {
          return; // Reject non-matching input silently
        }
      }

      onChange?.(value);
    };

    const isCompact = variant === 'compact';

    const baseStyles = [
      'w-full bg-geist-bg-light dark:bg-geist-bg-dark',
      'border rounded-lg outline-none transition-colors duration-150',
      'text-geist-text-primary-light dark:text-geist-text-primary-dark',
      'placeholder:text-geist-text-secondary-light/50 dark:placeholder:text-geist-text-secondary-dark/50',
      'focus:ring-1',
      isCompact ? 'px-2 py-1 text-xs' : 'px-3 py-2 text-sm',
      error
        ? 'border-geist-error-light dark:border-geist-error-dark focus:ring-geist-error-light/30'
        : 'border-geist-border-light dark:border-geist-border-dark focus:border-geist-text-secondary-light focus:ring-geist-text-secondary-light/20',
      className,
    ].join(' ');

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label
            htmlFor={inputId}
            className="text-[11px] font-medium text-geist-text-secondary-light dark:text-geist-text-secondary-dark uppercase tracking-wider"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          maxLength={maxLength}
          onChange={handleChange}
          className={baseStyles}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
          {...rest}
        />
        {error && (
          <p id={`${inputId}-error`} className="text-[10px] text-geist-error-light dark:text-geist-error-dark font-medium">
            {error}
          </p>
        )}
      </div>
    );
  }
);

ValidatedInput.displayName = 'ValidatedInput';
