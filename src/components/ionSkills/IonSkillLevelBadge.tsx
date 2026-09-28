import React from 'react';
import { getIonSkillLevelConfig } from '../../config/ionSkillLevels';

interface IonSkillLevelBadgeProps {
  level: number;
  size?: 'sm' | 'md' | 'lg';
  showDescription?: boolean;
  showIcon?: boolean;
}

export const IonSkillLevelBadge: React.FC<IonSkillLevelBadgeProps> = ({
  level,
  size = 'md',
  showDescription = false,
  showIcon = true,
}) => {
  const config = getIonSkillLevelConfig(level);

  if (size === 'sm') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold tracking-tight ${config.badgeClass}`}
        title={`${config.label}: ${config.description}`}
      >
        {showIcon && <span className="text-[10px]">{config.iconSymbol}</span>}
        <span>{config.shortLabel}</span>
      </span>
    );
  }

  if (size === 'lg') {
    return (
      <div className={`p-3 rounded-xl border ${config.badgeClass} flex flex-col gap-1`}>
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-2 font-black text-sm uppercase tracking-wider">
            {showIcon && <span>{config.iconSymbol}</span>}
            {config.badgeText}
          </span>
          <span className="text-xs font-semibold opacity-80">{config.label.split('—')[1]?.trim() || ''}</span>
        </div>
        {showDescription && (
          <p className="text-xs opacity-90 leading-relaxed mt-0.5">{config.description}</p>
        )}
      </div>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${config.badgeClass}`}
      title={config.description}
    >
      {showIcon && <span>{config.iconSymbol}</span>}
      <span>{config.shortLabel}</span>
      {showDescription && (
        <span className="text-[11px] font-normal opacity-85 hidden sm:inline">
          — {config.description}
        </span>
      )}
    </span>
  );
};
