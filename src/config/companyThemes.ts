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
  textColor: string;
  textMutedColor: string;
  textSecondaryAccent: string;
  borderColor: string;
}

export const DEFAULT_THEME: CompanyTheme = {
  id: 'default',
  name: 'Default Theme',
  primaryColor: '#78B654',
  primaryHover: '#43682F',
  secondaryColor: '#78B654',
  accentColor: '#F1A67E',
  accentSoft: '#F6D4BA',
  darkAccent: '#43682F',
  darkNeutral: '#1C1917',
  backgroundColor: '#FFFFFF',
  cardColor: '#FEFADC',
  sidebarColor: '#F1A67E',
  sidebarActiveColor: '#E5956D',
  textColor: '#1C1917',
  textMutedColor: '#57534E',
  textSecondaryAccent: '#78B654',
  borderColor: '#E8DEC8',
};

export const LAM_THEME: CompanyTheme = {
  id: '11b9d863-b83c-4af3-8db5-b6e773f78235',
  name: 'LAM Research',
  primaryColor: '#C1121F',
  primaryHover: '#741B21',
  secondaryColor: '#8DA7BE',
  accentColor: '#C1121F',
  accentSoft: '#FDEDEE',
  darkAccent: '#741B21',
  darkNeutral: '#2B3D41',
  backgroundColor: '#FFFFFF',
  cardColor: '#FDEDEE',
  sidebarColor: '#8DA7BE',
  sidebarActiveColor: '#7794AC',
  textColor: '#2B3D41',
  textMutedColor: '#57534E',
  textSecondaryAccent: '#C1121F',
  borderColor: '#D4DFE8',
};

export const AXCELIS_THEME: CompanyTheme = {
  id: 'f81bd16c-2f63-4818-a653-7486fe3f45ec',
  name: 'Axcelis Technologies',
  primaryColor: '#788AA3',
  primaryHover: '#741B21',
  secondaryColor: '#949D6A',
  accentColor: '#788AA3',
  accentSoft: '#FDEDEE',
  darkAccent: '#741B21',
  darkNeutral: '#2B3D41',
  backgroundColor: '#FFFFFF',
  cardColor: '#FDEDEE',
  sidebarColor: '#949D6A',
  sidebarActiveColor: '#818A57',
  textColor: '#2B3D41',
  textMutedColor: '#57534E',
  textSecondaryAccent: '#788AA3',
  borderColor: '#DDE2D3',
};

export const VISHAY_THEME: CompanyTheme = {
  id: '34d51cd0-fb63-4684-96a3-662477298678',
  name: 'Vishay Semiconductor',
  primaryColor: '#495867',
  primaryHover: '#741B21',
  secondaryColor: '#899D78',
  accentColor: '#495867',
  accentSoft: '#E3D7FF',
  darkAccent: '#741B21',
  darkNeutral: '#2B3D41',
  backgroundColor: '#FFFFFF',
  cardColor: '#E3D7FF',
  sidebarColor: '#899D78',
  sidebarActiveColor: '#778B66',
  textColor: '#2B3D41',
  textMutedColor: '#57534E',
  textSecondaryAccent: '#495867',
  borderColor: '#D2DCD0',
};

export const COMPANY_THEMES: Record<string, CompanyTheme> = {
  '11b9d863-b83c-4af3-8db5-b6e773f78235': LAM_THEME,
  'f81bd16c-2f63-4818-a653-7486fe3f45ec': AXCELIS_THEME,
  '34d51cd0-fb63-4684-96a3-662477298678': VISHAY_THEME,
};

/**
 * Helper to retrieve the theme by company ID, code, or name.
 * Falls back to DEFAULT_THEME for all other companies or unknown inputs.
 */
export function getCompanyTheme(identifier?: string | null): CompanyTheme {
  if (!identifier) return DEFAULT_THEME;

  const trimmed = identifier.trim().toLowerCase();

  // Match by stable Company ID
  if (COMPANY_THEMES[identifier]) {
    return COMPANY_THEMES[identifier];
  }

  // Match by name or code
  if (trimmed === 'lam research' || trimmed === 'lam' || trimmed.includes('lam')) {
    return LAM_THEME;
  }
  if (trimmed === 'axcelis technologies' || trimmed === 'axcelis' || trimmed.includes('axcelis')) {
    return AXCELIS_THEME;
  }
  if (trimmed === 'vishay semiconductor' || trimmed === 'vishay' || trimmed.includes('vishay')) {
    return VISHAY_THEME;
  }

  return DEFAULT_THEME;
}
