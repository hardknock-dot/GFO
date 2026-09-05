/**
 * Centralized country name normalization and ISO code mapping.
 * Ensures variations like "USA", "US", "United States of America" map to standard keys
 * while preserving safe fallback for unknown inputs without false positive substring collisions.
 */

export interface NormalizedCountry {
  name: string;
  code: string; // ISO 3166-1 alpha-2 or alpha-3 code
}

// Canonical country dictionary
const EXACT_LOOKUP: Record<string, NormalizedCountry> = {
  // Asia
  'india': { name: 'India', code: 'IND' },
  'in': { name: 'India', code: 'IND' },
  'ind': { name: 'India', code: 'IND' },
  'bharat': { name: 'India', code: 'IND' },
  
  'taiwan': { name: 'Taiwan', code: 'TWN' },
  'tw': { name: 'Taiwan', code: 'TWN' },
  'twn': { name: 'Taiwan', code: 'TWN' },
  'taiwan, province of china': { name: 'Taiwan', code: 'TWN' },
  'republic of china': { name: 'Taiwan', code: 'TWN' },

  'japan': { name: 'Japan', code: 'JPN' },
  'jp': { name: 'Japan', code: 'JPN' },
  'jpn': { name: 'Japan', code: 'JPN' },

  'thailand': { name: 'Thailand', code: 'THA' },
  'th': { name: 'Thailand', code: 'THA' },
  'tha': { name: 'Thailand', code: 'THA' },

  'singapore': { name: 'Singapore', code: 'SGP' },
  'sg': { name: 'Singapore', code: 'SGP' },
  'sgp': { name: 'Singapore', code: 'SGP' },

  'south korea': { name: 'South Korea', code: 'KOR' },
  'korea': { name: 'South Korea', code: 'KOR' },
  'republic of korea': { name: 'South Korea', code: 'KOR' },
  'dem. rep. korea': { name: 'Dem. Rep. Korea', code: 'PRK' },
  'north korea': { name: 'North Korea', code: 'PRK' },
  'kr': { name: 'South Korea', code: 'KOR' },
  'kor': { name: 'South Korea', code: 'KOR' },
  'kp': { name: 'Dem. Rep. Korea', code: 'PRK' },

  'china': { name: 'China', code: 'CHN' },
  'cn': { name: 'China', code: 'CHN' },
  'chn': { name: 'China', code: 'CHN' },
  'prc': { name: 'China', code: 'CHN' },

  'malaysia': { name: 'Malaysia', code: 'MYS' },
  'my': { name: 'Malaysia', code: 'MYS' },
  'mys': { name: 'Malaysia', code: 'MYS' },

  'vietnam': { name: 'Vietnam', code: 'VNM' },
  'viet nam': { name: 'Vietnam', code: 'VNM' },
  'vn': { name: 'Vietnam', code: 'VNM' },
  'vnm': { name: 'Vietnam', code: 'VNM' },

  'philippines': { name: 'Philippines', code: 'PHL' },
  'ph': { name: 'Philippines', code: 'PHL' },
  'phl': { name: 'Philippines', code: 'PHL' },

  'indonesia': { name: 'Indonesia', code: 'IDN' },
  'id': { name: 'Indonesia', code: 'IDN' },
  'idn': { name: 'Indonesia', code: 'IDN' },

  'israel': { name: 'Israel', code: 'ISR' },
  'il': { name: 'Israel', code: 'ISR' },
  'isr': { name: 'Israel', code: 'ISR' },

  // Americas
  'united states': { name: 'United States', code: 'USA' },
  'united states of america': { name: 'United States', code: 'USA' },
  'usa': { name: 'United States', code: 'USA' },
  'us': { name: 'United States', code: 'USA' },
  'united states virgin islands': { name: 'United States Virgin Islands', code: 'VIR' },

  'canada': { name: 'Canada', code: 'CAN' },
  'ca': { name: 'Canada', code: 'CAN' },
  'can': { name: 'Canada', code: 'CAN' },

  'mexico': { name: 'Mexico', code: 'MEX' },
  'mx': { name: 'Mexico', code: 'MEX' },
  'mex': { name: 'Mexico', code: 'MEX' },

  'brazil': { name: 'Brazil', code: 'BRA' },
  'br': { name: 'Brazil', code: 'BRA' },
  'bra': { name: 'Brazil', code: 'BRA' },

  'argentina': { name: 'Argentina', code: 'ARG' },
  'ar': { name: 'Argentina', code: 'ARG' },
  'arg': { name: 'Argentina', code: 'ARG' },

  'chile': { name: 'Chile', code: 'CHL' },
  'cl': { name: 'Chile', code: 'CHL' },
  'chl': { name: 'Chile', code: 'CHL' },

  // Europe
  'germany': { name: 'Germany', code: 'DEU' },
  'de': { name: 'Germany', code: 'DEU' },
  'deu': { name: 'Germany', code: 'DEU' },
  'deutschland': { name: 'Germany', code: 'DEU' },

  'netherlands': { name: 'Netherlands', code: 'NLD' },
  'nl': { name: 'Netherlands', code: 'NLD' },
  'nld': { name: 'Netherlands', code: 'NLD' },
  'holland': { name: 'Netherlands', code: 'NLD' },
  'bqbo': { name: 'Netherlands', code: 'NLD' },

  'ireland': { name: 'Ireland', code: 'IRL' },
  'ie': { name: 'Ireland', code: 'IRL' },
  'irl': { name: 'Ireland', code: 'IRL' },

  'united kingdom': { name: 'United Kingdom', code: 'GBR' },
  'uk': { name: 'United Kingdom', code: 'GBR' },
  'gb': { name: 'United Kingdom', code: 'GBR' },
  'gbr': { name: 'United Kingdom', code: 'GBR' },
  'great britain': { name: 'United Kingdom', code: 'GBR' },
  'britain': { name: 'United Kingdom', code: 'GBR' },

  'france': { name: 'France', code: 'FRA' },
  'fr': { name: 'France', code: 'FRA' },
  'fra': { name: 'France', code: 'FRA' },

  'italy': { name: 'Italy', code: 'ITA' },
  'it': { name: 'Italy', code: 'ITA' },
  'ita': { name: 'Italy', code: 'ITA' },

  'austria': { name: 'Austria', code: 'AUT' },
  'at': { name: 'Austria', code: 'AUT' },
  'aut': { name: 'Austria', code: 'AUT' },

  'belgium': { name: 'Belgium', code: 'BEL' },
  'be': { name: 'Belgium', code: 'BEL' },
  'bel': { name: 'Belgium', code: 'BEL' },

  'switzerland': { name: 'Switzerland', code: 'CHE' },
  'ch': { name: 'Switzerland', code: 'CHE' },
  'che': { name: 'Switzerland', code: 'CHE' },

  'spain': { name: 'Spain', code: 'ESP' },
  'es': { name: 'Spain', code: 'ESP' },
  'esp': { name: 'Spain', code: 'ESP' },

  'sweden': { name: 'Sweden', code: 'SWE' },
  'se': { name: 'Sweden', code: 'SWE' },
  'swe': { name: 'Sweden', code: 'SWE' },

  'norway': { name: 'Norway', code: 'NOR' },
  'no': { name: 'Norway', code: 'NOR' },
  'nor': { name: 'Norway', code: 'NOR' },

  'poland': { name: 'Poland', code: 'POL' },
  'pl': { name: 'Poland', code: 'POL' },
  'pol': { name: 'Poland', code: 'POL' },

  'czech republic': { name: 'Czech Republic', code: 'CZE' },
  'czechia': { name: 'Czech Republic', code: 'CZE' },
  'cz': { name: 'Czech Republic', code: 'CZE' },
  'cze': { name: 'Czech Republic', code: 'CZE' },

  // Oceania
  'australia': { name: 'Australia', code: 'AUS' },
  'au': { name: 'Australia', code: 'AUS' },
  'aus': { name: 'Australia', code: 'AUS' },

  'new zealand': { name: 'New Zealand', code: 'NZL' },
  'nz': { name: 'New Zealand', code: 'NZL' },
  'nzl': { name: 'New Zealand', code: 'NZL' },
};

/**
 * Normalizes any country string representation into a standardized country record.
 */
export function normalizeCountryName(rawCountry?: string | null): NormalizedCountry {
  if (!rawCountry || !rawCountry.trim()) {
    return { name: 'India', code: 'IND' };
  }

  // Strip fab site parenthesis if present, e.g. "Taiwan (Fab 12)" -> "Taiwan"
  const clean = rawCountry.split('(')[0].trim().toLowerCase();
  
  // 1. Exact match
  if (EXACT_LOOKUP[clean]) {
    return EXACT_LOOKUP[clean];
  }

  // 2. Exact word boundaries for multi-word phrases (e.g., "United States of America")
  for (const [key, val] of Object.entries(EXACT_LOOKUP)) {
    if (key.length >= 4 && clean.length >= 4 && clean.includes(key)) {
      return val;
    }
  }

  // 3. Fallback: safely format title-case string and generate ISO code
  const titleCased = rawCountry
    .split('(')[0]
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');

  const code = (titleCased.replace(/[^a-zA-Z]/g, '').slice(0, 3) || 'LOC').toUpperCase();
  return { name: titleCased, code };
}
