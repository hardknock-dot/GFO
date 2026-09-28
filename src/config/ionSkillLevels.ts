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
    badgeClass: 'bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-200 dark:border-emerald-700',
    chipClass: 'bg-emerald-600 text-white',
    dotColor: '#16a34a',
    iconSymbol: '🟩',
  },
  3: {
    level: 3,
    label: 'Level 3 — Supported Practitioner',
    shortLabel: 'Level 3',
    badgeText: 'LEVEL 3',
    description: 'Understand some of the tool, can solve some issues with support.',
    colorName: 'yellow',
    badgeClass: 'bg-yellow-50 text-yellow-800 border border-yellow-300 dark:bg-yellow-950/80 dark:text-yellow-200 dark:border-yellow-700',
    chipClass: 'bg-yellow-500 text-white',
    dotColor: '#eab308',
    iconSymbol: '🟨',
  },
  2: {
    level: 2,
    label: 'Level 2 — Basic Knowledge',
    shortLabel: 'Level 2',
    badgeText: 'LEVEL 2',
    description: 'Understand only the basic knowledge of the tool.',
    colorName: 'red',
    badgeClass: 'bg-rose-50 text-rose-500 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
    chipClass: 'bg-rose-300 text-rose-950 font-bold',
    dotColor: '#fda4af',
    iconSymbol: '🟥',
  },
  1: {
    level: 1,
    label: 'Level 1 — Novice / Observational',
    shortLabel: 'Level 1',
    badgeText: 'LEVEL 1',
    description: 'Understand very little or never work on the tool.',
    colorName: 'red',
    badgeClass: 'bg-red-100 text-red-900 border border-red-300 dark:bg-red-950/90 dark:text-red-100 dark:border-red-600',
    chipClass: 'bg-red-600 text-white',
    dotColor: '#dc2626',
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
