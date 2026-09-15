import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, X, CheckSquare } from 'lucide-react';

export interface SearchableMultiSelectProps {
  label: string;
  options: string[];
  selectedValues: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  className?: string;
}

export const SearchableMultiSelect: React.FC<SearchableMultiSelectProps> = ({
  label,
  options,
  selectedValues,
  onChange,
  placeholder = 'Search options...',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const sortedUniqueOptions = useMemo(() => {
    const set = new Set<string>();
    options.forEach((opt) => {
      if (opt && opt.trim() && opt.toLowerCase() !== 'all') {
        set.add(opt.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [options]);

  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return sortedUniqueOptions;
    const q = searchQuery.toLowerCase().trim();
    return sortedUniqueOptions.filter((opt) => opt.toLowerCase().includes(q));
  }, [sortedUniqueOptions, searchQuery]);

  const isAllSelected = useMemo(() => {
    if (sortedUniqueOptions.length === 0) return false;
    return sortedUniqueOptions.every((opt) => selectedValues.includes(opt));
  }, [sortedUniqueOptions, selectedValues]);

  const toggleOption = (option: string) => {
    if (selectedValues.includes(option)) {
      onChange(selectedValues.filter((v) => v !== option));
    } else {
      onChange([...selectedValues, option]);
    }
  };

  const handleSelectAll = () => {
    if (isAllSelected) {
      onChange([]);
    } else {
      onChange([...sortedUniqueOptions]);
    }
  };

  const handleClearAll = () => {
    onChange([]);
  };

  const count = selectedValues.length;

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <label className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)] mb-1">
        {label} {count > 0 && <span className="text-[var(--color-primary)] font-bold">({count})</span>}
      </label>

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 bg-[var(--color-card)] border border-[var(--color-border)] rounded-lg text-sm text-[var(--color-text)] hover:border-[var(--color-primary)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
      >
        <span className="truncate text-left font-medium">
          {count === 0 ? (
            <span className="text-[var(--color-text-secondary)]">All {label}s</span>
          ) : count === 1 ? (
            selectedValues[0]
          ) : (
            `${label} (${count})`
          )}
        </span>
        <ChevronDown className={`w-4 h-4 text-[var(--color-text-secondary)] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-[var(--color-card)] text-[var(--color-text)] border border-[var(--color-border)] rounded-xl shadow-xl p-2.5 min-w-[260px] animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Search Bar */}
          <div className="relative mb-2">
            <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-[var(--color-text-secondary)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={placeholder}
              className="w-full pl-8 pr-7 py-1.5 bg-white/70 dark:bg-black/20 text-xs border border-[var(--color-border)] rounded-md text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-2.5 text-[var(--color-text-secondary)] hover:text-[var(--color-text)]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Actions Header */}
          <div className="flex items-center justify-between px-1 py-1 mb-1 border-b border-[var(--color-border)] text-[11px]">
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-[var(--color-primary)] font-semibold hover:underline flex items-center space-x-1"
            >
              <CheckSquare className="w-3 h-3" />
              <span>{isAllSelected ? 'Deselect All' : 'Select All'}</span>
            </button>
            {count > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="text-[var(--color-text-secondary)] hover:text-rose-500 font-medium transition-colors"
              >
                Clear ({count})
              </button>
            )}
          </div>

          {/* Checkbox Options List */}
          <div className="max-h-56 overflow-y-auto space-y-0.5 pr-1">
            {filteredOptions.length === 0 ? (
              <div className="py-3 text-center text-xs text-[var(--color-text-secondary)]">No matching options</div>
            ) : (
              filteredOptions.map((option) => {
                const checked = selectedValues.includes(option);
                return (
                  <label
                    key={option}
                    onClick={() => toggleOption(option)}
                    className={`flex items-center space-x-2.5 px-2 py-1.5 rounded-lg text-xs cursor-pointer select-none transition-colors ${
                      checked
                        ? 'bg-[var(--color-primary)]/15 text-[var(--color-text)] font-semibold'
                        : 'hover:bg-black/5 dark:hover:bg-white/5 text-[var(--color-text)]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {}} // Handled by container label
                      className="rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)] accent-[var(--color-primary)] w-3.5 h-3.5"
                    />
                    <span className="truncate flex-1">{option}</span>
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
