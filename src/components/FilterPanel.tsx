import { useState, useRef, useEffect } from 'react';
import { Filter, X, ChevronDown } from 'lucide-react';

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

export interface FilterGroup {
  id: string;
  label: string;
  options: FilterOption[];
  type?: 'select' | 'multi'; // 'select' = single, 'multi' = multiple
}

export interface ActiveFilters {
  [groupId: string]: string[];
}

interface FilterPanelProps {
  groups: FilterGroup[];
  activeFilters: ActiveFilters;
  onFilterChange: (filters: ActiveFilters) => void;
  resultCount?: number;
  totalCount?: number;
}

export default function FilterPanel({ groups, activeFilters, onFilterChange, resultCount, totalCount }: FilterPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close panel when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  const totalActiveFilters = Object.values(activeFilters).reduce(
    (sum, arr) => sum + arr.length, 0
  );

  const toggleFilter = (groupId: string, value: string, type: 'select' | 'multi' = 'multi') => {
    const current = activeFilters[groupId] || [];
    let next: string[];

    if (type === 'select') {
      // Single select — toggle off if same, otherwise set
      next = current.includes(value) ? [] : [value];
    } else {
      // Multi select — toggle in/out
      next = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
    }

    onFilterChange({ ...activeFilters, [groupId]: next });
  };

  const clearAll = () => {
    const empty: ActiveFilters = {};
    groups.forEach(g => { empty[g.id] = []; });
    onFilterChange(empty);
  };

  const clearGroup = (groupId: string) => {
    onFilterChange({ ...activeFilters, [groupId]: [] });
  };

  return (
    <div ref={panelRef} className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all shadow-sm border ${
          totalActiveFilters > 0
            ? 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100'
            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
        }`}
      >
        <Filter className="w-4 h-4" />
        Filter
        {totalActiveFilters > 0 && (
          <span className="ml-1 bg-indigo-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
            {totalActiveFilters}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50">
            <span className="text-sm font-bold text-slate-800">Filters</span>
            <div className="flex items-center gap-2">
              {totalActiveFilters > 0 && (
                <button
                  onClick={clearAll}
                  className="text-xs font-semibold text-red-500 hover:text-red-700 transition-colors"
                >
                  Clear all
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filter Groups */}
          <div className="max-h-[400px] overflow-y-auto py-2">
            {groups.map((group) => {
              const groupActive = activeFilters[group.id] || [];
              const type = group.type || 'multi';

              return (
                <div key={group.id} className="px-4 py-3 border-b border-slate-50 last:border-b-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      {group.label}
                    </span>
                    {groupActive.length > 0 && (
                      <button
                        onClick={() => clearGroup(group.id)}
                        className="text-[10px] font-semibold text-slate-400 hover:text-red-500 transition-colors"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {group.options.map((option) => {
                      const isActive = groupActive.includes(option.value);
                      return (
                        <button
                          key={option.value}
                          onClick={() => toggleFilter(group.id, option.value, type)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                            isActive
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                          }`}
                        >
                          {option.label}
                          {option.count !== undefined && (
                            <span className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none ${
                              isActive ? 'bg-indigo-200 text-indigo-800' : 'bg-slate-100 text-slate-500'
                            }`}>
                              {option.count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          {resultCount !== undefined && totalCount !== undefined && (
            <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/50">
              <p className="text-xs text-slate-500 font-medium">
                Showing <span className="font-bold text-slate-700">{resultCount}</span> of{' '}
                <span className="font-bold text-slate-700">{totalCount}</span> results
              </p>
            </div>
          )}
        </div>
      )}

      {/* Active Filter Pills (shown below the button when filters are active) */}
      {totalActiveFilters > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2 absolute left-0 top-full z-40">
          {groups.map((group) =>
            (activeFilters[group.id] || []).map((value) => {
              const option = group.options.find(o => o.value === value);
              return (
                <span
                  key={`${group.id}-${value}`}
                  className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-[11px] font-semibold px-2 py-1 rounded-md border border-indigo-200"
                >
                  {option?.label || value}
                  <button
                    onClick={() => toggleFilter(group.id, value, group.type || 'multi')}
                    className="text-indigo-400 hover:text-indigo-700 ml-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
