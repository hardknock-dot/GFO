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

export const DEFAULT_THEME: CompanyTheme = {
  id: 'default',
  name: 'Default Theme',
  primaryColor: '#606C38',
  primaryHover: '#283618',
  secondaryColor: '#606C38',
  accentColor: '#DDA15E',
  accentSoft: '#FEFAE0',
  darkAccent: '#BC6C25',
  darkNeutral: '#283618',
  backgroundColor: '#F4F5F7',
  cardColor: '#FEFAE0',
  sidebarColor: '#283618',
  sidebarActiveColor: 'rgba(255, 255, 255, 0.15)',
  sidebarTextColor: '#FFFFFF',
  sidebarTextMuted: 'rgba(255, 255, 255, 0.75)',
  sidebarBorderColor: 'rgba(255, 255, 255, 0.12)',
  sidebarHoverColor: 'rgba(255, 255, 255, 0.08)',
  textColor: '#283618',
  textMutedColor: '#5C6352',
  textSecondaryAccent: '#606C38',
  borderColor: '#E6E2C8',
  statCard1Bg: '#FEFAE0',
  statCard1Text: '#283618',
  statCard2Bg: '#606C38',
  statCard2Text: '#FFFFFF',
  statCard3Bg: '#DDA15E',
  statCard3Text: '#283618',
  statCard4Bg: '#BC6C25',
  statCard4Text: '#FFFFFF',
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
  backgroundColor: '#F4F5F7',
  cardColor: '#FDEDEE',
  sidebarColor: '#FDEDEE',
  sidebarActiveColor: 'rgba(43, 61, 65, 0.12)',
  sidebarTextColor: '#2B3D41',
  sidebarTextMuted: 'rgba(43, 61, 65, 0.7)',
  sidebarBorderColor: 'rgba(43, 61, 65, 0.12)',
  sidebarHoverColor: 'rgba(43, 61, 65, 0.06)',
  textColor: '#2B3D41',
  textMutedColor: '#57534E',
  textSecondaryAccent: '#C1121F',
  borderColor: '#F0D6D8',
  statCard1Bg: '#8DA7BE',
  statCard1Text: '#FFFFFF',
  statCard2Bg: '#C1121F',
  statCard2Text: '#FFFFFF',
  statCard3Bg: '#741B21',
  statCard3Text: '#FFFFFF',
  statCard4Bg: '#2B3D41',
  statCard4Text: '#FFFFFF',
};

export const AXCELIS_THEME: CompanyTheme = {
  id: 'f81bd16c-2f63-4818-a653-7486fe3f45ec',
  name: 'Axcelis Technologies',
  primaryColor: '#A2D2FF',
  primaryHover: '#88C0FA',
  secondaryColor: '#CDB4DB',
  accentColor: '#FFAFCC',
  accentSoft: '#FFC8DD',
  darkAccent: '#2563EB',
  darkNeutral: '#1E293B',
  backgroundColor: '#F4F7FC',
  cardColor: '#FFFFFF',
  sidebarColor: '#BDE0FE',
  sidebarActiveColor: 'rgba(255, 255, 255, 0.75)',
  sidebarTextColor: '#1E293B',
  sidebarTextMuted: '#475569',
  sidebarBorderColor: 'rgba(162, 210, 255, 0.5)',
  sidebarHoverColor: 'rgba(255, 255, 255, 0.45)',
  textColor: '#1E293B',
  textMutedColor: '#64748B',
  textSecondaryAccent: '#2563EB',
  borderColor: '#E2E8F0',
  statCard1Bg: '#A2D2FF',
  statCard1Text: '#1E293B',
  statCard2Bg: '#FFAFCC',
  statCard2Text: '#1E293B',
  statCard3Bg: '#CDB4DB',
  statCard3Text: '#1E293B',
  statCard4Bg: '#FFC8DD',
  statCard4Text: '#1E293B',
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
  backgroundColor: '#F4F5F7',
  cardColor: '#E3D7FF',
  sidebarColor: '#2B3D41',
  sidebarActiveColor: '#3E5358',
  sidebarTextColor: '#FFFFFF',
  sidebarTextMuted: 'rgba(255, 255, 255, 0.75)',
  sidebarBorderColor: 'rgba(255, 255, 255, 0.12)',
  sidebarHoverColor: 'rgba(255, 255, 255, 0.08)',
  textColor: '#2B3D41',
  textMutedColor: '#57534E',
  textSecondaryAccent: '#495867',
  borderColor: '#D8CEEE',
  statCard1Bg: '#E3D7FF',
  statCard1Text: '#2B3D41',
  statCard2Bg: '#899D78',
  statCard2Text: '#FFFFFF',
  statCard3Bg: '#495867',
  statCard3Text: '#FFFFFF',
  statCard4Bg: '#741B21',
  statCard4Text: '#FFFFFF',
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
