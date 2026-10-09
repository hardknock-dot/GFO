import React, { useState, useEffect } from 'react';
import { Palette, Check, RotateCcw, Save, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { useCompanyTheme, useUpdateCompanyTheme } from '../../hooks/useCompanyTheme';
import { PREDEFINED_THEMES, type ThemePreset } from '../../config/companyThemes';


import { useCompany } from '../../context/CompanyContext';
import { Button } from '../forms/Button';

interface CompanyThemeSectionProps {
  companyId?: string;
  canModify: boolean;
}

export const CompanyThemeSection: React.FC<CompanyThemeSectionProps> = ({ companyId, canModify }) => {
  const { currentCompany, updateCompanyThemeState } = useCompany();
  const targetCid = companyId || currentCompany.company_id || currentCompany.id;
  const { data: themeData, isLoading } = useCompanyTheme(targetCid);
  const updateMutation = useUpdateCompanyTheme();

  const savedKey = themeData?.theme_key || currentCompany.theme_key || 'default';
  const [selectedKey, setSelectedKey] = useState<string>(savedKey);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (themeData?.theme_key) {
      setSelectedKey(themeData.theme_key);
    }
  }, [themeData]);

  const hasChanges = selectedKey !== savedKey;
  const currentPreview: ThemePreset = PREDEFINED_THEMES[selectedKey] || PREDEFINED_THEMES.default;

  const handleSelect = (key: string) => {
    if (!canModify) return;
    setSelectedKey(key);
    setSuccessMsg(null);
  };

  const handleReset = () => {
    setSelectedKey(savedKey);
    setSuccessMsg(null);
  };

  const handleSave = () => {
    if (!canModify) return;
    updateMutation.mutate(
      { data: { theme_key: selectedKey }, companyId: targetCid },
      {
        onSuccess: () => {
          updateCompanyThemeState(targetCid, selectedKey);
          setSuccessMsg('Company theme saved successfully!');
          setTimeout(() => setSuccessMsg(null), 4000);
        },
      }
    );
  };


  if (isLoading) {
    return (
      <div className="p-6 bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl animate-pulse space-y-4">
        <div className="h-6 bg-[var(--color-border)] rounded w-1/3" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-24 bg-[var(--color-border)] rounded-xl" />
          <div className="h-24 bg-[var(--color-border)] rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl shadow-md space-y-5">
      <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
            <Palette className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--color-text-primary)]">Company Theme</h3>
            <p className="text-[11px] text-[var(--color-text-secondary)]">Select a predefined theme palette for your organization</p>
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
                icon={<RotateCcw className="w-3.5 h-3.5 text-[var(--color-text-secondary)]" />}
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

      {successMsg && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center space-x-2 text-xs text-emerald-800 dark:text-emerald-200 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span className="font-semibold">{successMsg}</span>
        </div>
      )}

      {!canModify && (
        <div className="p-3.5 bg-[var(--color-accent-soft)]/60 border border-[var(--color-border)] rounded-xl flex items-center space-x-2 text-xs text-[var(--color-text-primary)]">
          <ShieldAlert className="w-4 h-4 text-[var(--color-primary)] flex-shrink-0" />
          <span>Only Main Admins can change the company theme. Normal users view in read-only mode.</span>
        </div>
      )}

      {/* THEME CARDS SELECTION GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Object.values(PREDEFINED_THEMES).map((preset) => {
          const isSelected = selectedKey === preset.key;
          return (
            <div
              key={preset.key}
              onClick={() => handleSelect(preset.key)}
              className={`relative p-3.5 rounded-xl border-2 transition-all cursor-pointer ${
                isSelected
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 shadow-sm'
                  : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/40 bg-[var(--color-bg)]/60'
              } ${!canModify ? 'cursor-not-allowed opacity-80' : ''}`}
            >
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-bold text-[var(--color-text-primary)] flex items-center gap-1.5">
                  {preset.name}
                  {preset.key === 'default' && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-accent-soft)] text-[var(--color-text-secondary)] border border-[var(--color-border)] font-mono font-normal">
                      Default
                    </span>
                  )}
                </span>
                {isSelected && (
                  <div className="w-5 h-5 rounded-full bg-[var(--color-primary)] text-white flex items-center justify-center shadow-xs">
                    <Check className="w-3 h-3" />
                  </div>
                )}
              </div>

              {/* Color Swatches */}
              <div className="flex items-center space-x-1.5">
                <div
                  className="w-5 h-5 rounded-full border border-black/15 shadow-2xs"
                  style={{ backgroundColor: preset.primary }}
                  title={`Primary: ${preset.primary}`}
                />
                <div
                  className="w-5 h-5 rounded-full border border-black/15 shadow-2xs"
                  style={{ backgroundColor: preset.secondary }}
                  title={`Secondary: ${preset.secondary}`}
                />
                <div
                  className="w-5 h-5 rounded-full border border-black/15 shadow-2xs"
                  style={{ backgroundColor: preset.accent }}
                  title={`Accent: ${preset.accent}`}
                />
                <div
                  className="w-5 h-5 rounded-full border border-black/15 shadow-2xs"
                  style={{ backgroundColor: preset.darkNeutral }}
                  title={`Dark Neutral: ${preset.darkNeutral}`}
                />
                <div
                  className="w-5 h-5 rounded-full border border-black/15 shadow-2xs"
                  style={{ backgroundColor: preset.surface }}
                  title={`Surface: ${preset.surface}`}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* LIVE PREVIEW BOX */}
      <div className="space-y-2 pt-2 border-t border-[var(--color-border)]">
        <span className="text-xs font-bold text-[var(--color-text-primary)]">Live Theme Preview</span>
        <div
          className="p-4 rounded-xl border shadow-inner transition-all overflow-hidden"
          style={{
            backgroundColor: currentPreview.background,
            borderColor: currentPreview.border,
            color: currentPreview.text,
          }}
        >
          <div className="flex gap-3">
            {/* Sidebar preview */}
            <div
              className="w-24 p-2 rounded-lg text-white text-[10px] space-y-1.5 flex flex-col justify-between"
              style={{ backgroundColor: currentPreview.darkNeutral }}
            >
              <div className="font-bold border-b border-white/20 pb-1">Sidebar</div>
              <div className="space-y-1 opacity-80">
                <div className="h-2 rounded bg-white/20" />
                <div className="h-2 rounded bg-white/40" />
                <div className="h-2 rounded bg-white/20" />
              </div>
            </div>

            {/* Content preview */}
            <div className="flex-1 space-y-2">
              <div
                className="p-2 rounded-lg border text-xs font-bold flex justify-between items-center"
                style={{
                  backgroundColor: currentPreview.surface,
                  borderColor: currentPreview.border,
                  color: currentPreview.text,
                }}
              >
                <span>Header / Card</span>
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                  style={{
                    backgroundColor: currentPreview.accentSoft,
                    color: currentPreview.accent,
                  }}
                >
                  Accent Badge
                </span>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  className="px-3 py-1 text-xs rounded-lg font-semibold text-white shadow-2xs"
                  style={{ backgroundColor: currentPreview.primary }}
                >
                  Primary Button
                </button>
                <button
                  type="button"
                  className="px-3 py-1 text-xs rounded-lg font-semibold text-white shadow-2xs"
                  style={{ backgroundColor: currentPreview.secondary }}
                >
                  Secondary Button
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

