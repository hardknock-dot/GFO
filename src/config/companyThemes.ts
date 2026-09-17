export interface ThemePreset {
  key: string;
  name: string;
  primary: string;
  primaryHover: string;
  secondary: string;
  accent: string;
  accentSoft: string;
  background: string;
  surface: string;
  darkNeutral: string;
  text: string;
  border: string;
  sidebarColor: string;
  sidebarTextColor: string;
  sidebarTextMuted: string;
  sidebarActiveColor: string;
  sidebarHoverColor: string;
  sidebarBorderColor: string;
  statCard1Bg: string;
  statCard1Text: string;
  statCard2Bg: string;
  statCard2Text: string;
  statCard3Bg: string;
  statCard3Text: string;
  statCard4Bg: string;
  statCard4Text: string;
}

export const PREDEFINED_THEMES: Record<string, ThemePreset> = {
  lam: {
    key: 'lam',
    name: 'LAM Crimson',
    primary: '#C1121F',
    primaryHover: '#741B21',
    secondary: '#2563EB',
    accent: '#D97706',
    accentSoft: '#FDEDEE',
    background: '#F4F5F7',
    surface: '#FFFFFF',
    darkNeutral: '#1E293B',
    text: '#1E293B',
    border: '#E2E8F0',
    sidebarColor: '#FDEDEE',
    sidebarTextColor: '#2B3D41',
    sidebarTextMuted: 'rgba(43, 61, 65, 0.7)',
    sidebarActiveColor: 'rgba(43, 61, 65, 0.12)',
    sidebarHoverColor: 'rgba(43, 61, 65, 0.06)',
    sidebarBorderColor: 'rgba(43, 61, 65, 0.12)',
    statCard1Bg: '#2563EB',
    statCard1Text: '#FFFFFF',
    statCard2Bg: '#C1121F',
    statCard2Text: '#FFFFFF',
    statCard3Bg: '#D97706',
    statCard3Text: '#FFFFFF',
    statCard4Bg: '#1E293B',
    statCard4Text: '#FFFFFF',
  },
  axcelis: {
    key: 'axcelis',
    name: 'Axcelis Sky',
    primary: '#0284C7',
    primaryHover: '#0369A1',
    secondary: '#10B981',
    accent: '#F59E0B',
    accentSoft: '#E0F2FE',
    background: '#F4F7FC',
    surface: '#FFFFFF',
    darkNeutral: '#7C3AED',
    text: '#1E293B',
    border: '#E2E8F0',
    sidebarColor: '#BDE0FE',
    sidebarTextColor: '#1E293B',
    sidebarTextMuted: '#475569',
    sidebarActiveColor: 'rgba(255, 255, 255, 0.75)',
    sidebarHoverColor: 'rgba(255, 255, 255, 0.45)',
    sidebarBorderColor: 'rgba(162, 210, 255, 0.5)',
    statCard1Bg: '#10B981',
    statCard1Text: '#FFFFFF',
    statCard2Bg: '#0284C7',
    statCard2Text: '#FFFFFF',
    statCard3Bg: '#F59E0B',
    statCard3Text: '#FFFFFF',
    statCard4Bg: '#7C3AED',
    statCard4Text: '#FFFFFF',
  },
  vishay: {
    key: 'vishay',
    name: 'Vishay Slate',
    primary: '#495867',
    primaryHover: '#374351',
    secondary: '#059669',
    accent: '#D97706',
    accentSoft: '#F1F5F9',
    background: '#F4F5F7',
    surface: '#FFFFFF',
    darkNeutral: '#DC2626',
    text: '#1E293B',
    border: '#E2E8F0',
    sidebarColor: '#2B3D41',
    sidebarTextColor: '#FFFFFF',
    sidebarTextMuted: 'rgba(255, 255, 255, 0.75)',
    sidebarActiveColor: '#3E5358',
    sidebarHoverColor: 'rgba(255, 255, 255, 0.08)',
    sidebarBorderColor: 'rgba(255, 255, 255, 0.12)',
    statCard1Bg: '#059669',
    statCard1Text: '#FFFFFF',
    statCard2Bg: '#495867',
    statCard2Text: '#FFFFFF',
    statCard3Bg: '#D97706',
    statCard3Text: '#FFFFFF',
    statCard4Bg: '#DC2626',
    statCard4Text: '#FFFFFF',
  },
  default: {
    key: 'default',
    name: 'Forest Olive',
    primary: '#606C38',
    primaryHover: '#283618',
    secondary: '#2A9D8F',
    accent: '#DDA15E',
    accentSoft: '#F4F5F0',
    background: '#F4F5F7',
    surface: '#FFFFFF',
    darkNeutral: '#E63946',
    text: '#1E293B',
    border: '#E2E8F0',
    sidebarColor: '#283618',
    sidebarTextColor: '#FFFFFF',
    sidebarTextMuted: 'rgba(255, 255, 255, 0.75)',
    sidebarActiveColor: 'rgba(255, 255, 255, 0.15)',
    sidebarHoverColor: 'rgba(255, 255, 255, 0.08)',
    sidebarBorderColor: 'rgba(255, 255, 255, 0.12)',
    statCard1Bg: '#2A9D8F',
    statCard1Text: '#FFFFFF',
    statCard2Bg: '#606C38',
    statCard2Text: '#FFFFFF',
    statCard3Bg: '#DDA15E',
    statCard3Text: '#FFFFFF',
    statCard4Bg: '#E63946',
    statCard4Text: '#FFFFFF',
  },
  cobalt: {
    key: 'cobalt',
    name: 'Midnight Cobalt',
    primary: '#1D4ED8',
    primaryHover: '#1E40AF',
    secondary: '#06B6D4',
    accent: '#F59E0B',
    accentSoft: '#EFF6FF',
    background: '#F8FAFC',
    surface: '#FFFFFF',
    darkNeutral: '#7C3AED',
    text: '#0F172A',
    border: '#E2E8F0',
    sidebarColor: '#0F172A',
    sidebarTextColor: '#FFFFFF',
    sidebarTextMuted: 'rgba(255, 255, 255, 0.75)',
    sidebarActiveColor: 'rgba(59, 130, 246, 0.25)',
    sidebarHoverColor: 'rgba(255, 255, 255, 0.08)',
    sidebarBorderColor: 'rgba(255, 255, 255, 0.12)',
    statCard1Bg: '#06B6D4',
    statCard1Text: '#FFFFFF',
    statCard2Bg: '#1D4ED8',
    statCard2Text: '#FFFFFF',
    statCard3Bg: '#F59E0B',
    statCard3Text: '#FFFFFF',
    statCard4Bg: '#7C3AED',
    statCard4Text: '#FFFFFF',
  },
  emerald: {
    key: 'emerald',
    name: 'Royal Emerald',
    primary: '#047857',
    primaryHover: '#065F46',
    secondary: '#0284C7',
    accent: '#D97706',
    accentSoft: '#ECFDF5',
    background: '#F4FBF7',
    surface: '#FFFFFF',
    darkNeutral: '#7C3AED',
    text: '#064E3B',
    border: '#E2E8F0',
    sidebarColor: '#064E3B',
    sidebarTextColor: '#FFFFFF',
    sidebarTextMuted: 'rgba(255, 255, 255, 0.75)',
    sidebarActiveColor: 'rgba(255, 255, 255, 0.15)',
    sidebarHoverColor: 'rgba(255, 255, 255, 0.08)',
    sidebarBorderColor: 'rgba(255, 255, 255, 0.12)',
    statCard1Bg: '#0284C7',
    statCard1Text: '#FFFFFF',
    statCard2Bg: '#047857',
    statCard2Text: '#FFFFFF',
    statCard3Bg: '#D97706',
    statCard3Text: '#FFFFFF',
    statCard4Bg: '#7C3AED',
    statCard4Text: '#FFFFFF',
  },
  copper: {
    key: 'copper',
    name: 'Sunset Copper',
    primary: '#C2410C',
    primaryHover: '#9A3412',
    secondary: '#2563EB',
    accent: '#F59E0B',
    accentSoft: '#FFF7ED',
    background: '#FAFAF9',
    surface: '#FFFFFF',
    darkNeutral: '#059669',
    text: '#1C1917',
    border: '#E2E8F0',
    sidebarColor: '#1C1917',
    sidebarTextColor: '#FFFFFF',
    sidebarTextMuted: 'rgba(255, 255, 255, 0.75)',
    sidebarActiveColor: 'rgba(234, 88, 12, 0.25)',
    sidebarHoverColor: 'rgba(255, 255, 255, 0.08)',
    sidebarBorderColor: 'rgba(255, 255, 255, 0.12)',
    statCard1Bg: '#2563EB',
    statCard1Text: '#FFFFFF',
    statCard2Bg: '#C2410C',
    statCard2Text: '#FFFFFF',
    statCard3Bg: '#F59E0B',
    statCard3Text: '#FFFFFF',
    statCard4Bg: '#059669',
    statCard4Text: '#FFFFFF',
  },
  amethyst: {
    key: 'amethyst',
    name: 'Amethyst Violet',
    primary: '#7C3AED',
    primaryHover: '#6D28D9',
    secondary: '#EC4899',
    accent: '#F59E0B',
    accentSoft: '#F5F3FF',
    background: '#FAF5FF',
    surface: '#FFFFFF',
    darkNeutral: '#0284C7',
    text: '#3B0764',
    border: '#E2E8F0',
    sidebarColor: '#3B0764',
    sidebarTextColor: '#FFFFFF',
    sidebarTextMuted: 'rgba(255, 255, 255, 0.75)',
    sidebarActiveColor: 'rgba(255, 255, 255, 0.18)',
    sidebarHoverColor: 'rgba(255, 255, 255, 0.08)',
    sidebarBorderColor: 'rgba(255, 255, 255, 0.12)',
    statCard1Bg: '#EC4899',
    statCard1Text: '#FFFFFF',
    statCard2Bg: '#7C3AED',
    statCard2Text: '#FFFFFF',
    statCard3Bg: '#F59E0B',
    statCard3Text: '#FFFFFF',
    statCard4Bg: '#0284C7',
    statCard4Text: '#FFFFFF',
  },
};

export const FIELD_ENGINEER_THEME = {
  primary: '#6B9080',
  primaryHover: '#527364',
  secondary: '#A4C3B2',
  accentLight: '#CCE3DE',
  accentSoft: '#EAF4F4',
  background: '#F6FFF8',
  surface: '#EAF4F4',
  darkNeutral: '#253830',
  text: '#253830',
  border: '#CCE3DE',
  statCard1Bg: '#CCE3DE',
  statCard1Text: '#253830',
  statCard2Bg: '#6B9080',
  statCard2Text: '#FFFFFF',
  statCard3Bg: '#A4C3B2',
  statCard3Text: '#253830',
  statCard4Bg: '#527364',
  statCard4Text: '#FFFFFF',
};

export function applyThemePreset(themeKey?: string | null) {
  let isEngineer = false;
  try {
    const savedUser = localStorage.getItem('ormp_user');
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      if (parsed.role === 'Field Engineer' || parsed.role === 'Engineer') {
        isEngineer = true;
      }
    }
  } catch (_e) {}

  if (isEngineer) {
    applyEngineerTheme();
    return;
  }

  const key = themeKey && PREDEFINED_THEMES[themeKey] ? themeKey : 'default';
  const theme = PREDEFINED_THEMES[key];
  const root = document.documentElement;

  // Requirement 10 recommended CSS variables
  root.style.setProperty('--primary-color', theme.primary);
  root.style.setProperty('--primary-hover', theme.primaryHover);
  root.style.setProperty('--secondary-color', theme.secondary);
  root.style.setProperty('--accent-color', theme.accent);
  root.style.setProperty('--accent-soft', theme.accentSoft);
  root.style.setProperty('--background-color', theme.background);
  root.style.setProperty('--surface-color', theme.surface);
  root.style.setProperty('--dark-neutral', theme.darkNeutral);
  root.style.setProperty('--text-color', theme.text);
  root.style.setProperty('--border-color', theme.border);

  // Existing alias variables
  root.style.setProperty('--color-primary', theme.primary);
  root.style.setProperty('--color-primary-hover', theme.primaryHover);
  root.style.setProperty('--color-secondary', theme.secondary);
  root.style.setProperty('--color-accent', theme.accent);
  root.style.setProperty('--color-accent-soft', theme.accentSoft);
  root.style.setProperty('--color-bg', theme.background);
  root.style.setProperty('--color-card', theme.surface);
  root.style.setProperty('--color-dark-neutral', theme.darkNeutral);
  root.style.setProperty('--color-text', theme.text);
  root.style.setProperty('--color-text-primary', theme.text);
  root.style.setProperty('--color-border', theme.border);

  // Sidebar CSS variables matching previous template colors
  root.style.setProperty('--color-sidebar', theme.sidebarColor);
  root.style.setProperty('--color-sidebar-text', theme.sidebarTextColor);
  root.style.setProperty('--color-sidebar-text-muted', theme.sidebarTextMuted);
  root.style.setProperty('--color-sidebar-active', theme.sidebarActiveColor);
  root.style.setProperty('--color-sidebar-hover', theme.sidebarHoverColor);
  root.style.setProperty('--color-sidebar-border', theme.sidebarBorderColor);

  // Stat Card CSS variables matching previous template colors
  root.style.setProperty('--color-stat-1-bg', theme.statCard1Bg);
  root.style.setProperty('--color-stat-1-text', theme.statCard1Text);
  root.style.setProperty('--color-stat-2-bg', theme.statCard2Bg);
  root.style.setProperty('--color-stat-2-text', theme.statCard2Text);
  root.style.setProperty('--color-stat-3-bg', theme.statCard3Bg);
  root.style.setProperty('--color-stat-3-text', theme.statCard3Text);
  root.style.setProperty('--color-stat-4-bg', theme.statCard4Bg);
  root.style.setProperty('--color-stat-4-text', theme.statCard4Text);
}

export function applyEngineerTheme() {
  const root = document.documentElement;
  const theme = FIELD_ENGINEER_THEME;

  root.style.setProperty('--primary-color', theme.primary);
  root.style.setProperty('--primary-hover', theme.primaryHover);
  root.style.setProperty('--secondary-color', theme.secondary);
  root.style.setProperty('--accent-color', theme.primary);
  root.style.setProperty('--accent-soft', theme.accentSoft);
  root.style.setProperty('--background-color', theme.background);
  root.style.setProperty('--surface-color', theme.surface);
  root.style.setProperty('--dark-neutral', theme.darkNeutral);
  root.style.setProperty('--text-color', theme.text);
  root.style.setProperty('--border-color', theme.border);

  root.style.setProperty('--color-primary', theme.primary);
  root.style.setProperty('--color-primary-hover', theme.primaryHover);
  root.style.setProperty('--color-secondary', theme.secondary);
  root.style.setProperty('--color-accent', theme.primary);
  root.style.setProperty('--color-accent-soft', theme.accentSoft);
  root.style.setProperty('--color-bg', theme.background);
  root.style.setProperty('--color-card', theme.surface);
  root.style.setProperty('--color-sidebar', theme.primary);
  root.style.setProperty('--color-dark-neutral', theme.darkNeutral);
  root.style.setProperty('--color-text', theme.text);
  root.style.setProperty('--color-text-primary', theme.text);
  root.style.setProperty('--color-border', theme.border);

  root.style.setProperty('--color-stat-1-bg', theme.statCard1Bg);
  root.style.setProperty('--color-stat-1-text', theme.statCard1Text);
  root.style.setProperty('--color-stat-2-bg', theme.statCard2Bg);
  root.style.setProperty('--color-stat-2-text', theme.statCard2Text);
  root.style.setProperty('--color-stat-3-bg', theme.statCard3Bg);
  root.style.setProperty('--color-stat-3-text', theme.statCard3Text);
  root.style.setProperty('--color-stat-4-bg', theme.statCard4Bg);
  root.style.setProperty('--color-stat-4-text', theme.statCard4Text);
}


// Backwards compatibility interface & constants
export interface CompanyTheme {
  id: string;
  name: string;
  primaryColor: string;
  primaryHover: string;
  secondaryColor: string;
  accentColor: string;
  accentSoft: string;
  darkAccent: string;
  darkNeutral: string;
  backgroundColor: string;
  cardColor: string;
  sidebarColor: string;
  sidebarActiveColor: string;
  sidebarTextColor: string;
  sidebarTextMuted: string;
  sidebarBorderColor: string;
  sidebarHoverColor: string;
  textColor: string;
  textMutedColor: string;
  textSecondaryAccent: string;
  borderColor: string;
  statCard1Bg: string;
  statCard1Text: string;
  statCard2Bg: string;
  statCard2Text: string;
  statCard3Bg: string;
  statCard3Text: string;
  statCard4Bg: string;
  statCard4Text: string;
}

function presetToCompanyTheme(preset: ThemePreset, id: string): CompanyTheme {
  return {
    id,
    name: preset.name,
    primaryColor: preset.primary,
    primaryHover: preset.primaryHover,
    secondaryColor: preset.secondary,
    accentColor: preset.accent,
    accentSoft: preset.accentSoft,
    darkAccent: preset.primaryHover,
    darkNeutral: preset.darkNeutral,
    backgroundColor: preset.background,
    cardColor: preset.surface,
    sidebarColor: preset.sidebarColor,
    sidebarActiveColor: preset.sidebarActiveColor,
    sidebarTextColor: preset.sidebarTextColor,
    sidebarTextMuted: preset.sidebarTextMuted,
    sidebarBorderColor: preset.sidebarBorderColor,
    sidebarHoverColor: preset.sidebarHoverColor,
    textColor: preset.text,
    textMutedColor: preset.text,
    textSecondaryAccent: preset.secondary,
    borderColor: preset.border,
    statCard1Bg: preset.surface,
    statCard1Text: preset.text,
    statCard2Bg: preset.primary,
    statCard2Text: '#FFFFFF',
    statCard3Bg: preset.accent,
    statCard3Text: preset.text,
    statCard4Bg: preset.secondary,
    statCard4Text: '#FFFFFF',
  };
}

export const DEFAULT_THEME = presetToCompanyTheme(PREDEFINED_THEMES.default, 'default');
export const LAM_THEME = presetToCompanyTheme(PREDEFINED_THEMES.lam, '11b9d863-b83c-4af3-8db5-b6e773f78235');
export const AXCELIS_THEME = presetToCompanyTheme(PREDEFINED_THEMES.axcelis, 'f81bd16c-2f63-4818-a653-7486fe3f45ec');
export const VISHAY_THEME = presetToCompanyTheme(PREDEFINED_THEMES.vishay, '34d51cd0-fb63-4684-96a3-662477298678');

export const COMPANY_THEMES: Record<string, CompanyTheme> = {
  '11b9d863-b83c-4af3-8db5-b6e773f78235': LAM_THEME,
  'f81bd16c-2f63-4818-a653-7486fe3f45ec': AXCELIS_THEME,
  '34d51cd0-fb63-4684-96a3-662477298678': VISHAY_THEME,
};

export function getCompanyTheme(identifier?: string | null): CompanyTheme {
  if (!identifier) return DEFAULT_THEME;
  const trimmed = identifier.trim().toLowerCase();
  if (trimmed === 'lam' || identifier === '11b9d863-b83c-4af3-8db5-b6e773f78235') return LAM_THEME;
  if (trimmed === 'axcelis' || identifier === 'f81bd16c-2f63-4818-a653-7486fe3f45ec') return AXCELIS_THEME;
  if (trimmed === 'vishay' || identifier === '34d51cd0-fb63-4684-96a3-662477298678') return VISHAY_THEME;
  if (PREDEFINED_THEMES[trimmed]) return presetToCompanyTheme(PREDEFINED_THEMES[trimmed], trimmed);
  if (COMPANY_THEMES[identifier]) return COMPANY_THEMES[identifier];
  return DEFAULT_THEME;
}




