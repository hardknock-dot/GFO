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
  changeType = 'positive',
  icon,
  variant = 'default',
  onClick,
}) => {
  const variantStyles = {
    default: 'bg-[#FEFADC] border border-[#E8DEC8] text-stone-900',
    cream: 'bg-[#FEFADC] border border-[#E8DEC8] text-stone-900',
    ice: 'bg-[#A8BC8B]/50 border border-[#A8BC8B] text-stone-900',
    sand: 'bg-[#F6D4BA]/80 border border-[#F6D4BA] text-stone-900',
    orange: 'bg-[#D2E5C7] text-white border border-[#436730]',
  };

  const isForest = variant === 'orange';
  const isColored = variant !== 'default' && variant !== 'cream';

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
          className={`text-xs font-semibold uppercase tracking-wider ${isForest ? 'text-white/90' : 'text-stone-700'
            }`}
        >
          {title}
        </span>
        <div
          className={`p-2.5 rounded-xl ${isForest
            ? 'bg-white/20 text-white'
            : isColored
              ? 'bg-black/10 text-stone-900'
              : 'bg-[#FEFADC] text-[#D2E5C7] border border-[#E8DEC8]'
            }`}
        >
          {icon}
        </div>
      </div>

      <div className="mt-4 flex items-baseline justify-between">
        <span
          className={`text-3xl font-extrabold tracking-tight ${isForest ? 'text-white' : 'text-stone-900'
            }`}
        >
          {value}
        </span>
        {change && (
          <span
            className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${isForest
              ? 'bg-white/20 text-white'
              : isColored
                ? 'bg-black/10 text-stone-900'
                : changeType === 'positive'
                  ? 'bg-[#A8BC8B]/40 text-[#D2E5C7]'
                  : changeType === 'negative'
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-[#F6D4BA] text-stone-800 font-bold'

              }`}
          >
            {change}
          </span>
        )}
      </div>

      {subtitle && (
        <p
          className={`text-xs mt-1.5 ${isForest ? 'text-white/80' : 'text-stone-600'
            }`}
        >
          {subtitle}
        </p>
      )}
    </motion.div>
  );
};
