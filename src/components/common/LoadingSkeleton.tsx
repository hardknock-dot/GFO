import React from 'react';

interface LoadingSkeletonProps {
  rows?: number;
  columns?: number;
}

export const TableSkeleton: React.FC<LoadingSkeletonProps> = ({ rows = 5, columns = 6 }) => {
  return (
    <div className="w-full animate-pulse space-y-3 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
      <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-lg w-full mb-4" />
      {Array.from({ length: rows }).map((_, rIdx) => (
        <div key={rIdx} className="flex items-center space-x-4 py-3 border-b border-slate-100 dark:border-slate-800/60">
          {Array.from({ length: columns }).map((_, cIdx) => (
            <div
              key={cIdx}
              className="h-4 bg-slate-200 dark:bg-slate-800 rounded"
              style={{ width: `${Math.floor(100 / columns)}%` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

export const CardSkeleton: React.FC = () => {
  return (
    <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl animate-pulse space-y-4">
      <div className="flex justify-between items-center">
        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
        <div className="h-8 w-8 bg-slate-200 dark:bg-slate-800 rounded-full" />
      </div>
      <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
      <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-2/3" />
    </div>
  );
};
