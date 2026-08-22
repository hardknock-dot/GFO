import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Command, MapPin, Wrench, ArrowRight } from 'lucide-react';
import { useEngineers } from '../../hooks/useEngineers';

interface GlobalSearchProps {
  onSearch?: (query: string) => void;
  placeholder?: string;
  className?: string;
  initialValue?: string;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({
  onSearch,
  placeholder = 'Search engineers, tools, visas, customer sites... (Ctrl+K)',
  className = '',
  initialValue = '',
}) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState(initialValue);
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const { data: res } = useEngineers();
  const allEngineers = res?.data || [];

  const filteredEngineers = query.trim()
    ? allEngineers.filter((eng) => {
        const q = query.toLowerCase().trim();
        return (
          eng.name?.toLowerCase().includes(q) ||
          eng.orbitId?.toLowerCase().includes(q) ||
          eng.primaryTool?.toLowerCase().includes(q) ||
          eng.country?.toLowerCase().includes(q) ||
          eng.level?.toLowerCase().includes(q)
        );
      }).slice(0, 6)
    : [];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('global-search-input')?.focus();
        setIsOpen(true);
      }
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setIsOpen(true);
    if (onSearch) onSearch(val);
  };

  const handleClear = () => {
    setQuery('');
    setIsOpen(false);
    if (onSearch) onSearch('');
  };

  const handleSelectEngineer = (id: string) => {
    setIsOpen(false);
    setQuery('');
    navigate(`/engineers/${id}`);
  };

  const handleKeyDownInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && query.trim()) {
      setIsOpen(false);
      navigate('/engineers');
    }
  };

  return (
    <div ref={searchRef} className={`relative flex items-center w-full max-w-lg ${className}`}>
      <Search className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none z-10" />
      <input
        id="global-search-input"
        type="text"
        value={query}
        onChange={handleChange}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDownInput}
        placeholder={placeholder}
        className="w-full bg-slate-100 dark:bg-slate-800/80 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:bg-white dark:focus:bg-slate-900 text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 pl-10 pr-16 py-2 rounded-xl transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
      />
      {query ? (
        <button
          onClick={handleClear}
          className="absolute right-3 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md z-10"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      ) : (
        <div className="absolute right-3 hidden sm:flex items-center space-x-0.5 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-200/60 dark:bg-slate-700/60 rounded border border-slate-300/40 dark:border-slate-600/40 pointer-events-none z-10">
          <Command className="w-2.5 h-2.5" />
          <span>K</span>
        </div>
      )}

      {/* Global Search Live Results Overlay */}
      {isOpen && query.trim().length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden text-xs">
          <div className="p-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50 text-[11px] font-semibold text-slate-500">
            <span>Matching Engineers ({filteredEngineers.length})</span>
            <span className="font-mono text-[10px]">Press Enter to view all</span>
          </div>

          <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {filteredEngineers.length === 0 ? (
              <div className="p-6 text-center text-slate-400">
                No matching field engineers found for "{query}"
              </div>
            ) : (
              filteredEngineers.map((eng) => (
                <button
                  key={eng.id}
                  onClick={() => handleSelectEngineer(eng.id)}
                  className="w-full text-left p-3 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors flex items-center justify-between group"
                >
                  <div className="flex items-center space-x-3">
                    <img
                      src={eng.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                      alt=""
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white group-hover:text-[var(--color-secondary)] transition-colors">
                        {eng.name}
                      </p>
                      <div className="flex items-center space-x-2 text-[10px] text-slate-400">
                        <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">{eng.orbitId}</span>
                        <span>•</span>
                        <span className="flex items-center space-x-0.5">
                          <Wrench className="w-2.5 h-2.5" />
                          <span>{eng.primaryTool}</span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center space-x-0.5">
                          <MapPin className="w-2.5 h-2.5" />
                          <span>{eng.country}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-1 transition-transform" />
                </button>
              ))
            )}
          </div>

          <div className="p-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 text-center">
            <button
              onClick={() => {
                setIsOpen(false);
                navigate('/engineers');
              }}
              className="text-xs font-semibold text-[var(--color-secondary)] hover:underline inline-flex items-center space-x-1"
            >
              <span>View all directory engineers</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
