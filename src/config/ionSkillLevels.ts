export interface IonSkillLevelDef {
  level: number;
  label: string;
  shortLabel: string;
  badgeText: string;
  description: string;
  colorName: 'green' | 'yellow' | 'orange' | 'red';
  badgeClass: string;
  chipClass: string;
  dotColor: string;
  iconSymbol: string;
}

export const ION_COMPANY_ID = 'f81bd16c-2f63-4818-a653-7486fe3f45ec';

export const ION_SKILL_LEVELS: Record<number, IonSkillLevelDef> = {
  4: {
    level: 4,
    label: 'Level 4 — Independent Specialist',
    shortLabel: 'Level 4',
    badgeText: 'LEVEL 4',
    description: 'Understand the tool well, can work independently to solve most tool issues.',
    colorName: 'green',
    badgeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30',
    chipClass: 'bg-emerald-500 text-white',
    dotColor: '#10b981',
    iconSymbol: '🟩',
  },
  3: {
    level: 3,
    label: 'Level 3 — Supported Practitioner',
    shortLabel: 'Level 3',
    badgeText: 'LEVEL 3',
    description: 'Understand some of the tool, can solve some issues with support.',
    colorName: 'yellow',
    badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30',
    chipClass: 'bg-amber-500 text-white',
    dotColor: '#f59e0b',
    iconSymbol: '🟨',
  },
  2: {
    level: 2,
    label: 'Level 2 — Basic Knowledge',
    shortLabel: 'Level 2',
    badgeText: 'LEVEL 2',
    description: 'Understand only the basic knowledge of the tool.',
    colorName: 'orange',
    badgeClass: 'bg-orange-500/15 text-orange-700 dark:text-orange-400 border border-orange-500/30',
    chipClass: 'bg-orange-500 text-white',
    dotColor: '#f97316',
    iconSymbol: '🟧',
  },
  1: {
    level: 1,
    label: 'Level 1 — Novice / Observational',
    shortLabel: 'Level 1',
    badgeText: 'LEVEL 1',
    description: 'Understand very little or never work on the tool.',
    colorName: 'red',
    badgeClass: 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30',
    chipClass: 'bg-rose-500 text-white',
    dotColor: '#ef4444',
    iconSymbol: '🟥',
  },
};

export const getIonSkillLevelConfig = (level: number): IonSkillLevelDef => {
  return (
    ION_SKILL_LEVELS[level] || {
      level,
      label: `Level ${level}`,
      shortLabel: `L${level}`,
      badgeText: `LEVEL ${level}`,
      description: 'Skill assessment recorded.',
      colorName: 'orange',
      badgeClass: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border border-slate-500/30',
      chipClass: 'bg-slate-500 text-white',
      dotColor: '#64748b',
      iconSymbol: '⚪',
    }
  );
};
