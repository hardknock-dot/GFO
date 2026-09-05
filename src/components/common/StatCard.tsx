import React from 'react';
import { motion } from 'framer-motion';

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
  variant?: 'default' | 'ice' | 'sand' | 'orange' | 'cream';
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  change,
  icon,
  variant = 'default',
  onClick,
}) => {
  const variantConfig = {
    cream: {
      bg: 'bg-[var(--color-stat-1-bg)]',
      textColor: 'text-[var(--color-stat-1-text)]',
      border: 'border-transparent',
    },
    ice: {
      bg: 'bg-[var(--color-stat-2-bg)]',
      textColor: 'text-[var(--color-stat-2-text)]',
      border: 'border-transparent',
    },
    sand: {
      bg: 'bg-[var(--color-stat-3-bg)]',
      textColor: 'text-[var(--color-stat-3-text)]',
      border: 'border-transparent',
    },
    orange: {
      bg: 'bg-[var(--color-stat-4-bg)]',
      textColor: 'text-[var(--color-stat-4-text)]',
      border: 'border-transparent',
    },
    default: {
      bg: 'bg-[var(--color-card)]',
      textColor: 'text-[var(--color-text-primary)]',
      border: 'border-[var(--color-border)]',
    },
  };

  return (
    <motion.div
      whileHover={{ y: -3, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      transition={{ duration: 0.15 }}
      onClick={onClick}
      className={`p-5 rounded-2xl transition-all duration-150 relative overflow-hidden group shadow-md shadow-black/20 hover:shadow-lg hover:shadow-black/25 ${onClick ? 'cursor-pointer' : ''
        } ${variantConfig[variant]?.bg || 'bg-[var(--color-card)]'} ${variantConfig[variant]?.textColor || 'text-[var(--color-text-primary)]'
        } border ${variantConfig[variant]?.border || 'border-transparent'}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider opacity-90">
          {title}
        </span>
        <div className="p-2.5 rounded-xl bg-white/20 border border-white/15 backdrop-blur-xs flex items-center justify-center">
          {icon}
        </div>
      </div>

      <div className="mt-4 flex items-baseline justify-between">
        <span className="text-3xl font-extrabold tracking-tight">
          {value}
        </span>
        {change && (
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-xs">
            {change}
          </span>
        )}
      </div>

      {subtitle && (
        <p className="text-xs mt-1.5 opacity-80 font-medium">
          {subtitle}
        </p>
      )}
    </motion.div>
  );
};
