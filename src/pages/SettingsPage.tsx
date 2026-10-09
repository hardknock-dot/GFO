import React, { useState, useEffect } from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import { useCompany } from '../context/CompanyContext';
import { useAuth } from '../context/AuthContext';
import { useCompanySettings, useUpdateCompanySettings } from '../hooks/useSettings';
import { Button } from '../components/forms/Button';
import { CardSkeleton } from '../components/common/LoadingSkeleton';
import { CompanyThemeSection } from '../components/settings/CompanyThemeSection';
import {
  Bell,
  Sliders,
  LayoutDashboard,
  Building2,
  Shield,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Plane,
  FileCheck,
  Clock,
  CalendarX,
  MessageSquare,
  TrendingUp,
  Info,
  Calendar,
} from 'lucide-react';


interface AlertToggleItem {
  key:
    | 'visa_alerts_enabled'
    | 'deployment_alerts_enabled'
    | 'travel_alerts_enabled'
    | 'leave_alerts_enabled'
    | 'missed_schedule_alerts_enabled'
    | 'operational_remark_alerts_enabled'
    | 'performance_alerts_enabled';
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const ALERT_ITEMS: AlertToggleItem[] = [
  {
    key: 'visa_alerts_enabled',
    title: 'Visa Expiration Alerts',
    description: 'Notify administrators and managers when engineer visas/work permits are approaching expiration.',
    icon: FileCheck,
  },
  {
    key: 'deployment_alerts_enabled',
    title: 'Deployment Alerts',
    description: 'Notify operations teams about upcoming, active, or overdue engineer site deployments.',
    icon: Calendar,
  },
  {
    key: 'travel_alerts_enabled',
    title: 'Travel Alerts',
    description: 'Notify about upcoming travel flights, in-transit movements, and travel-related exceptions.',
    icon: Plane,
  },
  {
    key: 'leave_alerts_enabled',
    title: 'Leave Alerts',
    description: 'Notify about PTO/leave-related operational conflicts and schedule overlaps.',
    icon: Clock,
  },
  {
    key: 'missed_schedule_alerts_enabled',
    title: 'Missed Schedule Alerts',
    description: 'Alert on incomplete, pending, or missed schedule assignments requiring intervention.',
    icon: CalendarX,
  },
  {
    key: 'operational_remark_alerts_enabled',
    title: 'Operational Remark Alerts',
    description: 'Show pending field engineer remarks requiring management review and adressal.',
    icon: MessageSquare,
  },
  {
    key: 'performance_alerts_enabled',
    title: 'Performance Alerts',
    description: 'Enable performance score metrics and critical low-rating operational notifications.',
    icon: TrendingUp,
  },
];

export const SettingsPage: React.FC = () => {
  const { currentCompany } = useCompany();
  const { user } = useAuth();

  const companyId = currentCompany.id === 'all-data' ? undefined : (currentCompany.company_id || currentCompany.id);

  // Fetch settings from PostgreSQL
  const { data: settings, isLoading, isError, refetch } = useCompanySettings(companyId);
  const updateMutation = useUpdateCompanySettings();

  // Local form state
  const [formState, setFormState] = useState({
    visa_expiration_days: 30,
    visa_alerts_enabled: true,
    deployment_alerts_enabled: true,
    travel_alerts_enabled: true,
    leave_alerts_enabled: true,
    missed_schedule_alerts_enabled: true,
    operational_remark_alerts_enabled: true,
    performance_alerts_enabled: true,
  });

  const [hasChanges, setHasChanges] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const canModify =
    user?.role === 'Main Admin' ||
    user?.role === 'Global Admin' ||
    user?.role === 'Company Admin' ||
    user?.role === 'Manager';

  // Sync server settings into local state
  useEffect(() => {
    if (settings) {
      setFormState({
        visa_expiration_days: settings.visa_expiration_days ?? 30,
        visa_alerts_enabled: settings.visa_alerts_enabled ?? true,
        deployment_alerts_enabled: settings.deployment_alerts_enabled ?? true,
        travel_alerts_enabled: settings.travel_alerts_enabled ?? true,
        leave_alerts_enabled: settings.leave_alerts_enabled ?? true,
        missed_schedule_alerts_enabled: settings.missed_schedule_alerts_enabled ?? true,
        operational_remark_alerts_enabled: settings.operational_remark_alerts_enabled ?? true,
        performance_alerts_enabled: settings.performance_alerts_enabled ?? true,
      });
      setHasChanges(false);
      setValidationError(null);
    }
  }, [settings]);

  const handleToggle = (key: keyof typeof formState) => {
    if (!canModify) return;
    setFormState((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      setHasChanges(true);
      return next;
    });
    setSuccessMessage(null);
  };

  const handleDaysChange = (val: string) => {
    if (!canModify) return;
    const num = parseInt(val, 10);
    setFormState((prev) => ({
      ...prev,
      visa_expiration_days: isNaN(num) ? 0 : num,
    }));
    setHasChanges(true);
    setSuccessMessage(null);
  };

  const handleReset = () => {
    if (settings) {
      setFormState({
        visa_expiration_days: settings.visa_expiration_days ?? 30,
        visa_alerts_enabled: settings.visa_alerts_enabled ?? true,
        deployment_alerts_enabled: settings.deployment_alerts_enabled ?? true,
        travel_alerts_enabled: settings.travel_alerts_enabled ?? true,
        leave_alerts_enabled: settings.leave_alerts_enabled ?? true,
        missed_schedule_alerts_enabled: settings.missed_schedule_alerts_enabled ?? true,
        operational_remark_alerts_enabled: settings.operational_remark_alerts_enabled ?? true,
        performance_alerts_enabled: settings.performance_alerts_enabled ?? true,
      });
      setHasChanges(false);
      setValidationError(null);
      setSuccessMessage(null);
    }
  };

  const handleSave = () => {
    if (!canModify) return;
    setValidationError(null);
    setSuccessMessage(null);

    // Validate visa_expiration_days
    const days = formState.visa_expiration_days;
    if (!Number.isInteger(days) || days <= 0) {
      setValidationError('Visa expiration threshold must be a positive integer greater than 0.');
      return;
    }
    if (days > 365) {
      setValidationError('Visa expiration threshold cannot exceed 365 days.');
      return;
    }

    updateMutation.mutate(
      {
        company_id: companyId,
        ...formState,
      },
      {
        onSuccess: () => {
          setHasChanges(false);
          setSuccessMessage('Settings saved successfully and synchronized across the enterprise.');
          setTimeout(() => setSuccessMessage(null), 4000);
        },
        onError: (err: any) => {
          const detail = err.response?.data?.detail || err.message || 'Failed to save settings.';
          setValidationError(detail);
        },
      }
    );
  };

  if (isLoading && !settings) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Enterprise Control Center & Settings"
          subtitle="Loading organization-level operational thresholds and notification rules..."
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Enterprise Control Center & Settings"
        subtitle={`Configure operational thresholds, alert rules, and dashboard behavior for ${currentCompany.name}.`}
        actions={
          canModify ? (
            <div className="flex items-center space-x-3">
              {hasChanges && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  disabled={updateMutation.isPending}
                  icon={<RotateCcw className="w-4 h-4 text-[var(--color-text-secondary)]" />}
                >
                  Reset
                </Button>
              )}
              <Button
                size="sm"
                onClick={handleSave}
                loading={updateMutation.isPending}
                disabled={!hasChanges}
                icon={<Save className="w-4 h-4" />}
              >
                Save Settings
              </Button>
            </div>
          ) : undefined
        }
      />

      {/* Feedback Banners */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-200 shadow-xs">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="font-semibold">{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-600 hover:text-emerald-800 font-bold ml-4">
            ×
          </button>
        </div>
      )}

      {validationError && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center justify-between text-xs text-rose-800 dark:text-rose-200 shadow-xs">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span className="font-semibold">{validationError}</span>
          </div>
          <button onClick={() => setValidationError(null)} className="text-rose-600 hover:text-rose-800 font-bold ml-4">
            ×
          </button>
        </div>
      )}

      {isError && (
        <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center justify-between text-xs text-amber-800 dark:text-amber-200 shadow-xs">
          <div className="flex items-center space-x-2">
            <Info className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>Using local configuration. Click to retry syncing with live database.</span>
          </div>
          <button
            onClick={() => refetch()}
            className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg text-[11px] transition-colors"
          >
            Retry Sync
          </button>
        </div>
      )}

      {!canModify && (
        <div className="p-3.5 bg-[var(--color-accent-soft)]/60 border border-[var(--color-border)] rounded-xl flex items-center space-x-2 text-xs text-[var(--color-text-primary)]">
          <Info className="w-4 h-4 text-[var(--color-primary)] flex-shrink-0" />
          <span>You are viewing company settings in read-only mode. Administrator permissions are required to modify configuration.</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT COLUMN: Company Theme + Alert & Notification Settings */}
        <div className="space-y-6">
          <CompanyThemeSection
            companyId={companyId}
            canModify={user?.role === 'Main Admin' || user?.role === 'Global Admin'}
          />

          {/* SECTION 1: ALERT & NOTIFICATION SETTINGS */}

          <div className="p-6 bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl shadow-md shadow-black/20 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--color-text-primary)]">1. Alert & Notification Rules</h3>
                  <p className="text-[11px] text-[var(--color-text-secondary)]">Controls backend alert generation and notification bell display</p>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[var(--color-bg)] text-[var(--color-text-secondary)] border border-[var(--color-border)]">
                7 Channels
              </span>
            </div>

            <div className="divide-y divide-[var(--color-border)] space-y-1">
              {ALERT_ITEMS.map((item) => {
                const Icon = item.icon;
                const isEnabled = formState[item.key];
                return (
                  <div key={item.key} className="pt-3 pb-3 first:pt-0 flex items-center justify-between gap-4">
                    <div className="flex items-start space-x-3">
                      <div className={`p-1.5 rounded-lg mt-0.5 ${isEnabled ? 'bg-[var(--color-primary)]/15 text-[var(--color-primary)]' : 'bg-[var(--color-bg)] text-[var(--color-text-secondary)] border border-[var(--color-border)]'}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-xs font-bold text-[var(--color-text-primary)]">{item.title}</p>
                        <p className="text-[11px] text-[var(--color-text-secondary)] leading-snug">{item.description}</p>
                      </div>
                    </div>

                    {/* Toggle switch */}
                    <button
                      type="button"
                      disabled={!canModify}
                      onClick={() => handleToggle(item.key)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isEnabled ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'} ${!canModify ? 'opacity-60 cursor-not-allowed' : ''}`}
                      role="switch"
                      aria-checked={isEnabled}
                    >
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${isEnabled ? 'translate-x-5' : 'translate-x-0'}`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Operational Thresholds + Dashboard Settings + System Info */}
        <div className="space-y-6">
          {/* SECTION 2: OPERATIONAL THRESHOLDS */}
          <div className="p-6 bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl shadow-md shadow-black/20 space-y-4">
            <div className="flex items-center space-x-2.5 pb-3 border-b border-[var(--color-border)]">
              <div className="p-2 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[var(--color-text-primary)]">2. Operational Thresholds</h3>
                <p className="text-[11px] text-[var(--color-text-secondary)]">Dynamically configure business rules and warning windows</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[var(--color-text-primary)] mb-1">
                  Visa Expiration Alert Warning Limit (Days)
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="number"
                    min="1"
                    max="365"
                    disabled={!canModify}
                    value={formState.visa_expiration_days || ''}
                    onChange={(e) => handleDaysChange(e.target.value)}
                    className="w-32 px-3 py-2 text-xs font-mono font-bold rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)] shadow-2xs focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:opacity-60"
                  />
                  <span className="text-xs text-[var(--color-text-secondary)] font-medium">days before expiration</span>
                </div>
                <p className="text-[11px] text-[var(--color-text-secondary)] mt-1">
                  Alert engineers and admins when a work visa/permit is expiring within this timeframe. Replaces hardcoded values in Dashboard & Visa tracking.
                </p>
              </div>

              {/* Preset buttons */}
              <div className="flex items-center space-x-2 pt-1">
                <span className="text-[10px] text-[var(--color-text-secondary)] uppercase font-semibold tracking-wider">Presets:</span>
                {[30, 60, 90, 120].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    disabled={!canModify}
                    onClick={() => {
                      setFormState((prev) => ({ ...prev, visa_expiration_days: preset }));
                      setHasChanges(true);
                      setSuccessMessage(null);
                    }}
                    className={`px-2.5 py-1 text-[11px] rounded-lg font-mono font-semibold transition-colors border ${formState.visa_expiration_days === preset ? 'bg-[var(--color-primary)] text-white border-[var(--color-primary)] shadow-xs' : 'bg-[var(--color-bg)] text-[var(--color-text-primary)] border border-[var(--color-border)] hover:bg-[var(--color-primary)]/10'}`}
                  >
                    {preset}d
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* SECTION 3: DASHBOARD SETTINGS */}
          <div className="p-6 bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl shadow-md shadow-black/20 space-y-4">
            <div className="flex items-center space-x-2.5 pb-3 border-b border-[var(--color-border)]">
              <div className="p-2 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                <LayoutDashboard className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[var(--color-text-primary)]">3. Dashboard Settings</h3>
                <p className="text-[11px] text-[var(--color-text-secondary)]">Control visual modules and operational review cards</p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 p-3.5 bg-[var(--color-bg)]/80 rounded-xl border border-[var(--color-border)]">
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-[var(--color-text-primary)]">Pending Operational Remarks Card</p>
                <p className="text-[11px] text-[var(--color-text-secondary)]">
                  Controls the "Pending Operational Remarks" card on the Dashboard based on <code className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-primary)]/10 text-[var(--color-primary)] font-bold">comment_adressal = FALSE</code>.
                </p>
              </div>

              <button
                type="button"
                disabled={!canModify}
                onClick={() => handleToggle('operational_remark_alerts_enabled')}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${formState.operational_remark_alerts_enabled ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'} ${!canModify ? 'opacity-60 cursor-not-allowed' : ''}`}
                role="switch"
                aria-checked={formState.operational_remark_alerts_enabled}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${formState.operational_remark_alerts_enabled ? 'translate-x-5' : 'translate-x-0'}`}
                />
              </button>
            </div>
          </div>

          {/* SECTION 4: ACCOUNT / SYSTEM INFORMATION */}
          <div className="p-6 bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl shadow-md shadow-black/20 space-y-4">
            <div className="flex items-center space-x-2.5 pb-3 border-b border-[var(--color-border)]">
              <div className="p-2 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[var(--color-text-primary)]">4. Account & System Information</h3>
                <p className="text-[11px] text-[var(--color-text-secondary)]">Enterprise tenant metadata and storage parameters</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 bg-[var(--color-bg)]/80 rounded-xl border border-[var(--color-border)]">
                <span className="text-[10px] text-[var(--color-text-secondary)] uppercase font-semibold tracking-wider">Active Tenant</span>
                <p className="font-bold text-[var(--color-text-primary)] mt-0.5">{currentCompany.name}</p>
                <span className="text-[10px] font-mono text-[var(--color-text-secondary)]">Code: {currentCompany.code || 'N/A'}</span>
              </div>

              <div className="p-3.5 bg-[var(--color-bg)]/80 rounded-xl border border-[var(--color-border)]">
                <span className="text-[10px] text-[var(--color-text-secondary)] uppercase font-semibold tracking-wider">Persistence Layer</span>
                <p className="font-bold text-[var(--color-primary)] mt-0.5">PostgreSQL Multi-Tenant</p>
                <span className="text-[10px] font-mono text-[var(--color-text-secondary)]">Table: company_settings</span>
              </div>

              <div className="p-3.5 bg-[var(--color-bg)]/80 rounded-xl border border-[var(--color-border)]">
                <span className="text-[10px] text-[var(--color-text-secondary)] uppercase font-semibold tracking-wider">Security Isolation</span>
                <p className="font-bold text-[var(--color-text-primary)] mt-0.5 flex items-center space-x-1">
                  <Shield className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                  <span>Company-Scoped FK</span>
                </p>
                <span className="text-[10px] font-mono text-[var(--color-text-secondary)]">ID: {currentCompany.company_id || currentCompany.id}</span>
              </div>

              <div className="p-3.5 bg-[var(--color-bg)]/80 rounded-xl border border-[var(--color-border)]">
                <span className="text-[10px] text-[var(--color-text-secondary)] uppercase font-semibold tracking-wider">Your Effective Role</span>
                <p className="font-bold text-[var(--color-text-primary)] mt-0.5">{user?.role || 'Viewer'}</p>
                <span className="text-[10px] font-semibold text-[var(--color-text-secondary)]">
                  {canModify ? 'Read & Write Permissions' : 'Read-Only Access'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
