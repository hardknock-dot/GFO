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
      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
        {label} {count > 0 && <span className="text-[var(--color-accent)] font-bold">({count})</span>}
      </label>

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-100 hover:border-slate-300 dark:hover:border-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
      >
        <span className="truncate text-left">
          {count === 0 ? (
            <span className="text-slate-400">All {label}s</span>
          ) : count === 1 ? (
            selectedValues[0]
          ) : (
            `${label} (${count})`
          )}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl p-2.5 min-w-[260px] animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Search Bar */}
          <div className="relative mb-2">
            <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={placeholder}
              className="w-full pl-8 pr-7 py-1.5 bg-slate-50 dark:bg-slate-800 text-xs border border-slate-200 dark:border-slate-700 rounded-md text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Actions Header */}
          <div className="flex items-center justify-between px-1 py-1 mb-1 border-b border-slate-100 dark:border-slate-800 text-[11px]">
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-[var(--color-accent)] font-semibold hover:underline flex items-center space-x-1"
            >
              <CheckSquare className="w-3 h-3" />
              <span>{isAllSelected ? 'Deselect All' : 'Select All'}</span>
            </button>
            {count > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="text-slate-400 hover:text-rose-500 font-medium transition-colors"
              >
                Clear ({count})
              </button>
            )}
          </div>

          {/* Checkbox Options List */}
          <div className="max-h-56 overflow-y-auto space-y-0.5 pr-1">
            {filteredOptions.length === 0 ? (
              <div className="py-3 text-center text-xs text-slate-400">No matching options</div>
            ) : (
              filteredOptions.map((option) => {
                const checked = selectedValues.includes(option);
                return (
                  <label
                    key={option}
                    onClick={() => toggleOption(option)}
                    className={`flex items-center space-x-2.5 px-2 py-1.5 rounded-lg text-xs cursor-pointer select-none transition-colors ${
                      checked
                        ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-medium'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {}} // Handled by container label
                      className="rounded border-slate-300 dark:border-slate-700 text-[var(--color-accent)] focus:ring-[var(--color-accent)] w-3.5 h-3.5"
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
