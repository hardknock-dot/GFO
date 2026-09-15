import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';

export interface SearchableDropdownOption {
  value: string;
  label: string;
}

interface SearchableDropdownProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: SearchableDropdownOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  required?: boolean;
  error?: string;
}

export const SearchableDropdown: React.FC<SearchableDropdownProps> = ({
  label,
  value,
  onChange,
  options,
  placeholder = 'Select an option...',
  searchPlaceholder = 'Search...',
  required = false,
  error,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Find currently selected option
  const selectedOption = options.find((opt) => opt.value === value);

  // Handle clicking outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset search query when modal/dropdown closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
    } else {
      // Auto-focus search input when opening
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Filter options based on search query
  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="w-full flex flex-col space-y-1.5 relative">
      {label && (
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
          {label} {required && <span className="text-rose-500">*</span>}
        </span>
      )}

      {/* Select Display Box */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full flex items-center justify-between rounded-lg border bg-[var(--color-card)] text-sm text-[var(--color-text)] px-3.5 py-2 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] ${
            error
              ? 'border-rose-400 focus:ring-rose-400'
              : 'border-[var(--color-border)] hover:border-[var(--color-primary)]'
          }`}
        >
          <span className={selectedOption ? 'text-[var(--color-text)] font-medium' : 'text-[var(--color-text-secondary)]'}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown className={`w-4 h-4 text-[var(--color-text-secondary)] transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown Menu Container */}
        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--color-card)] text-[var(--color-text)] border border-[var(--color-border)] rounded-xl shadow-lg z-50 overflow-hidden flex flex-col max-h-64">
            {/* Search Input Box */}
            <div className="p-2 border-b border-[var(--color-border)] flex items-center relative bg-white/40 dark:bg-black/20">
              <Search className="w-3.5 h-3.5 text-[var(--color-text-secondary)] absolute left-4" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full bg-white/80 dark:bg-black/30 border border-[var(--color-border)] rounded-lg text-xs pl-8 pr-8 py-1.5 focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] focus:border-transparent text-[var(--color-text)] placeholder:text-[var(--color-text-secondary)]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 p-0.5 text-[var(--color-text-secondary)] hover:text-[var(--color-text)] rounded"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Options List */}
            <div className="overflow-y-auto max-h-48 divide-y divide-[var(--color-border)]/40">
              {filteredOptions.length === 0 ? (
                <div className="p-4 text-center text-xs text-[var(--color-text-secondary)]">
                  No matching records found
                </div>
              ) : (
                filteredOptions.map((opt) => {
                  const isSelected = opt.value === value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleSelect(opt.value)}
                      className={`w-full text-left px-3.5 py-2 text-xs transition-colors duration-100 ${
                        isSelected
                          ? 'bg-[var(--color-primary)]/15 text-[var(--color-text)] font-bold hover:bg-[var(--color-primary)]/20'
                          : 'hover:bg-black/5 dark:hover:bg-white/5 text-[var(--color-text)]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {error && <span className="text-xs text-rose-500">{error}</span>}
    </div>
  );
};
