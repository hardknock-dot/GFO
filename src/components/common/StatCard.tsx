import React from 'react';
import { motion } from 'framer-motion';

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
  variant?: 'default' | 'ice' | 'sand' | 'orange';
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  change,
  changeType = 'positive',
  icon,
  variant = 'default',
  onClick,
}) => {
  const variantStyles = {
    default: 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white',
    ice: 'bg-slate-100 dark:bg-slate-800/80 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700',
    sand: 'bg-slate-200/80 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-700',
    orange: 'bg-slate-900 dark:bg-slate-950 text-white border border-slate-800',
  };

  const isOrange = variant === 'orange';
  const isColored = variant !== 'default';

  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      transition={{ duration: 0.15 }}
      onClick={onClick}
      className={`p-5 rounded-2xl transition-all duration-150 relative overflow-hidden group ${onClick ? 'cursor-pointer hover:shadow-lg' : ''
        } ${variantStyles[variant]}`}
    >
      <div className="flex items-center justify-between">
        <span
          className={`text-xs font-semibold uppercase tracking-wider ${isOrange ? 'text-white/80' : isColored ? 'text-slate-700' : 'text-slate-500 dark:text-slate-400'
            }`}
        >
          {title}
        </span>
        <div
          className={`p-2.5 rounded-xl ${isOrange
            ? 'bg-white/20 text-white'
            : isColored
              ? 'bg-black/5 text-slate-800'
              : 'bg-slate-100 dark:bg-slate-800/40 text-[var(--color-secondary)]'
            }`}
        >
          {icon}
        </div>
      </div>

      <div className="mt-4 flex items-baseline justify-between">
        <span
          className={`text-3xl font-extrabold tracking-tight ${isOrange ? 'text-white' : 'text-slate-900 dark:text-white'
            }`}
        >
          {value}
        </span>
        {change && (
          <span
            className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${isOrange
              ? 'bg-white/20 text-blue'
              : isColored
                ? 'bg-black/10 text-slate-900'
                : changeType === 'positive'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : changeType === 'negative'
                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                    : 'bg-slate-700 dark:bg-slate-800 !text-white font-bold'

              }`}
          >
            {change}
          </span>
        )}
      </div>

      {subtitle && (
        <p
          className={`text-xs mt-1.5 ${isOrange ? 'text-white/75' : isColored ? 'text-slate-600' : 'text-slate-400 dark:text-slate-500'
            }`}
        >
          {subtitle}
        </p>
      )}
    </motion.div>
  );
};
