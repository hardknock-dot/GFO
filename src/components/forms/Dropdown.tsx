import React, { forwardRef } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ChevronDown } from 'lucide-react';

export interface DropdownOption {
  value: string;
  label: string;
}

export interface DropdownProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: (DropdownOption | string)[];
  error?: string;
}

export const Dropdown = forwardRef<HTMLSelectElement, DropdownProps>(
  ({ label, options, error, className, id, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full flex flex-col space-y-1.5">
        {label && (
          <label htmlFor={selectId} className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          <select
            id={selectId}
            ref={ref}
            className={twMerge(
              clsx(
                'w-full appearance-none rounded-lg border bg-[var(--color-card)] text-sm text-[var(--color-text)] px-3.5 py-2 pr-10 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent cursor-pointer',
                error
                  ? 'border-rose-400 focus:ring-rose-400'
                  : 'border-[var(--color-border)] hover:border-[var(--color-primary)]',
                className
              )
            )}
            {...props}
          >
            {options.map((opt) => {
              const val = typeof opt === 'string' ? opt : opt.value;
              const lbl = typeof opt === 'string' ? opt : opt.label;
              return (
                <option key={val} value={val} className="bg-[var(--color-card)] text-[var(--color-text)]">
                  {lbl}
                </option>
              );
            })}
          </select>
          <ChevronDown className="absolute right-3 w-4 h-4 text-[var(--color-text-secondary)] pointer-events-none" />
        </div>
        {error && <span className="text-xs text-rose-500">{error}</span>}
      </div>
    );
  }
);

Dropdown.displayName = 'Dropdown';
