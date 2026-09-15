import React, { useState, useEffect } from 'react';
import { Palette, RotateCcw, Save, CheckCircle2, AlertTriangle, Info, Eye } from 'lucide-react';
import { useCompanyTheme, useUpdateCompanyTheme } from '../../hooks/useCompanyTheme';
import { applyCustomThemeVars } from '../../context/CompanyContext';
import { Button } from '../forms/Button';

interface CompanyThemeSectionProps {
  companyId?: string;
  canModify: boolean;
}

const HEX_REGEX = /^#[0-9A-Fa-f]{6}$/;

const DEFAULT_THEME_FIELDS = {
  primary_color: '#C1121F',
  secondary_color: '#8DA7BE',
  accent_color: '#741B21',
  background_color: '#FDEDEE',
  surface_color: '#2B3D41',
  text_color: '#FFFFFF',
};

function getLuminance(hex: string): number {
  if (!HEX_REGEX.test(hex)) return 0;
  const r = parseInt(hex.substring(1, 3), 16) / 255;
  const g = parseInt(hex.substring(3, 5), 16) / 255;
  const b = parseInt(hex.substring(5, 7), 16) / 255;
  const a = [r, g, b].map((v) =>
    v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  );
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

function getContrastRatio(hex1: string, hex2: string): number {
  const l1 = getLuminance(hex1);
  const l2 = getLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export const CompanyThemeSection: React.FC<CompanyThemeSectionProps> = ({ companyId, canModify }) => {
  const { data: dbTheme, isLoading, isError, refetch } = useCompanyTheme(companyId);
  const updateMutation = useUpdateCompanyTheme();

  const [formState, setFormState] = useState(DEFAULT_THEME_FIELDS);
  const [hasChanges, setHasChanges] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (dbTheme) {
      setFormState({
        primary_color: dbTheme.primary_color || dbTheme.color_1 || DEFAULT_THEME_FIELDS.primary_color,
        secondary_color: dbTheme.secondary_color || dbTheme.color_2 || DEFAULT_THEME_FIELDS.secondary_color,
        accent_color: dbTheme.accent_color || dbTheme.color_3 || DEFAULT_THEME_FIELDS.accent_color,
        background_color: dbTheme.background_color || dbTheme.color_4 || DEFAULT_THEME_FIELDS.background_color,
        surface_color: dbTheme.surface_color || dbTheme.color_4 || DEFAULT_THEME_FIELDS.surface_color,
        text_color: dbTheme.text_color || dbTheme.color_5 || DEFAULT_THEME_FIELDS.text_color,
      });
      setHasChanges(false);
      setValidationError(null);
    }
  }, [dbTheme]);

  const handleColorChange = (key: keyof typeof DEFAULT_THEME_FIELDS, value: string) => {
    if (!canModify) return;
    const formatted = value.startsWith('#') ? value : `#${value}`;
    setFormState((prev) => ({ ...prev, [key]: formatted }));
    setHasChanges(true);
    setSuccessMessage(null);

    if (formatted.length === 7 && !HEX_REGEX.test(formatted)) {
      setValidationError(`Invalid hex code "${formatted}". Use format #RRGGBB (e.g. #C1121F).`);
    } else {
      setValidationError(null);
    }
  };

  const handleReset = () => {
    if (dbTheme) {
      setFormState({
        primary_color: dbTheme.primary_color || dbTheme.color_1 || DEFAULT_THEME_FIELDS.primary_color,
        secondary_color: dbTheme.secondary_color || dbTheme.color_2 || DEFAULT_THEME_FIELDS.secondary_color,
        accent_color: dbTheme.accent_color || dbTheme.color_3 || DEFAULT_THEME_FIELDS.accent_color,
        background_color: dbTheme.background_color || dbTheme.color_4 || DEFAULT_THEME_FIELDS.background_color,
        surface_color: dbTheme.surface_color || dbTheme.color_4 || DEFAULT_THEME_FIELDS.surface_color,
        text_color: dbTheme.text_color || dbTheme.color_5 || DEFAULT_THEME_FIELDS.text_color,
      });
    } else {
      setFormState(DEFAULT_THEME_FIELDS);
    }
    setHasChanges(false);
    setValidationError(null);
    setSuccessMessage(null);
  };

  const handleSave = () => {
    if (!canModify) return;
    setValidationError(null);
    setSuccessMessage(null);

    // Validate all fields
    const invalidKey = Object.entries(formState).find(([_, val]) => !HEX_REGEX.test(val));
    if (invalidKey) {
      setValidationError(`Invalid hex code for ${invalidKey[0].replace('_', ' ')}: "${invalidKey[1]}". Format must be 6-digit hex (e.g. #C1121F).`);
      return;
    }

    updateMutation.mutate(
      {
        companyId,
        data: formState,
      },
      {
        onSuccess: (updated) => {
          setHasChanges(false);
          setSuccessMessage('Company theme saved successfully and applied globally!');
          applyCustomThemeVars(updated || formState);
          setTimeout(() => setSuccessMessage(null), 4000);
        },
        onError: (err: any) => {
          const detail = err.response?.data?.detail || err.message || 'Failed to save company theme.';
          setValidationError(detail);
        },
      }
    );
  };

  const bgVsText = getContrastRatio(formState.background_color, formState.text_color);
  const surfaceVsText = getContrastRatio(formState.surface_color, formState.text_color);
  const primaryVsText = getContrastRatio(formState.primary_color, '#FFFFFF');
  const isLowContrast = (bgVsText < 4.5 && surfaceVsText < 4.5) || primaryVsText < 3.0;

  const colorFields: { key: keyof typeof DEFAULT_THEME_FIELDS; label: string }[] = [
    { key: 'primary_color', label: 'Primary Color' },
    { key: 'secondary_color', label: 'Secondary Color' },
    { key: 'accent_color', label: 'Accent Color' },
    { key: 'background_color', label: 'Background Color' },
    { key: 'surface_color', label: 'Surface Color' },
    { key: 'text_color', label: 'Text Color' },
  ];

  return (
    <div className="p-6 bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl shadow-md shadow-black/20 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
            <Palette className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-stone-900 dark:text-white">Company Theme</h3>
            <p className="text-[11px] text-stone-400">Customize the appearance for this company.</p>
          </div>
        </div>

        {canModify && (
          <div className="flex items-center space-x-2">
            {hasChanges && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                disabled={updateMutation.isPending}
                icon={<RotateCcw className="w-3.5 h-3.5 text-stone-500" />}
              >
                Reset
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleSave}
              loading={updateMutation.isPending}
              disabled={!hasChanges}
              icon={<Save className="w-3.5 h-3.5" />}
            >
              Save Theme
            </Button>
          </div>
        )}
      </div>

      {/* Banners */}
      {successMessage && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-200">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="font-semibold">{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-600 font-bold ml-2">×</button>
        </div>
      )}

      {validationError && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center justify-between text-xs text-rose-800 dark:text-rose-200">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span className="font-semibold">{validationError}</span>
          </div>
          <button onClick={() => setValidationError(null)} className="text-rose-600 font-bold ml-2">×</button>
        </div>
      )}

      {isLowContrast && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center space-x-2 text-xs text-amber-800 dark:text-amber-300">
          <Info className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span>These colors may have low text contrast. Consider increasing background vs text contrast for improved readability.</span>
        </div>
      )}

      {/* Grid of 6 Color Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {colorFields.map(({ key, label }) => {
          const hexValue = formState[key];
          const isValid = HEX_REGEX.test(hexValue);

          return (
            <div key={key} className="space-y-1.5 p-3 rounded-xl border border-stone-200/60 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/30">
              <label className="block text-xs font-bold text-stone-800 dark:text-stone-200">
                {label}
              </label>

              <div className="flex items-center space-x-2">
                {/* Native color picker */}
                <input
                  type="color"
                  disabled={!canModify}
                  value={isValid ? hexValue : '#000000'}
                  onChange={(e) => handleColorChange(key, e.target.value.toUpperCase())}
                  className="w-9 h-9 p-0.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white cursor-pointer disabled:cursor-not-allowed"
                />

                {/* Synchronized Hex input */}
                <input
                  type="text"
                  maxLength={7}
                  disabled={!canModify}
                  value={hexValue}
                  onChange={(e) => handleColorChange(key, e.target.value)}
                  placeholder="#C1121F"
                  className={`flex-1 px-3 py-1.5 text-xs font-mono font-bold rounded-lg border bg-white dark:bg-stone-800 text-stone-900 dark:text-white uppercase focus:outline-none focus:ring-2 disabled:opacity-60 ${
                    isValid
                      ? 'border-stone-300 dark:border-stone-700 focus:ring-[var(--color-primary)]'
                      : 'border-rose-500 focus:ring-rose-500'
                  }`}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Live Preview */}
      <div className="space-y-2 pt-2 border-t border-[var(--color-border)]">
        <div className="flex items-center space-x-1.5 text-xs font-bold text-stone-800 dark:text-stone-200">
          <Eye className="w-3.5 h-3.5 text-stone-400" />
          <span>Theme Preview</span>
        </div>

        <div
          className="p-4 rounded-xl border border-stone-300/50 dark:border-stone-800 space-y-3 transition-colors duration-200"
          style={{ backgroundColor: formState.background_color, color: formState.text_color }}
        >
          {/* Preview Header */}
          <div
            className="flex items-center justify-between px-3 py-2 rounded-lg shadow-2xs"
            style={{ backgroundColor: formState.primary_color, color: '#FFFFFF' }}
          >
            <span className="text-xs font-bold">Sample ORMP Header</span>
            <span className="text-[10px] opacity-80 font-mono">v2.4 Enterprise</span>
          </div>

          {/* Preview Card */}
          <div
            className="p-3.5 rounded-lg border shadow-2xs space-y-2.5"
            style={{ backgroundColor: formState.surface_color, borderColor: formState.secondary_color }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold" style={{ color: formState.text_color }}>Sample Card</span>
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                style={{ backgroundColor: formState.accent_color, color: '#FFFFFF' }}
              >
                Active
              </span>
            </div>
            <p className="text-[11px] opacity-80 leading-relaxed" style={{ color: formState.text_color }}>
              Engineer Deployment & Operations Overview Card
            </p>
            <div className="pt-1 flex items-center justify-end">
              <button
                type="button"
                className="px-3 py-1.5 text-xs font-bold rounded-lg shadow-2xs transition-transform active:scale-95"
                style={{ backgroundColor: formState.primary_color, color: '#FFFFFF' }}
              >
                Sample Primary Button
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
