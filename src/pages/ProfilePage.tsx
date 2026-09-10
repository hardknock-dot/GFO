import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '../components/layout/PageHeader';
import { useAuth } from '../context/AuthContext';
import { useCompany } from '../context/CompanyContext';
import { getCurrentUserProfile, updateCurrentUserProfile, type UserProfileUpdate } from '../services/auth';
import { Button } from '../components/forms/Button';
import { CardSkeleton } from '../components/common/LoadingSkeleton';
import { ErrorState } from '../components/common/ErrorState';
import {
  User as UserIcon,
  Mail,
  Shield,
  Building2,
  CheckCircle2,
  Clock,
  Save,
  RotateCcw,
  Lock,
  Camera,
  Layers,
  AlertTriangle,
  Copy,
  Check,
} from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { currentCompany } = useCompany();
  const { user: authUser } = useAuth();
  const queryClient = useQueryClient();

  const [copiedId, setCopiedId] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch real profile from backend
  const {
    data: profileUser,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['user-profile'],
    queryFn: getCurrentUserProfile,
    staleTime: 30 * 1000,
  });

  const effectiveUser = profileUser || authUser;

  // Editable Form State
  const [formData, setFormData] = useState({
    fullName: '',
    goesBy: '',
    avatarUrl: '',
  });
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (effectiveUser) {
      setFormData({
        fullName: effectiveUser.name || '',
        goesBy: effectiveUser.goes_by || '',
        avatarUrl: effectiveUser.avatar_url || (effectiveUser.avatar && !effectiveUser.avatar.includes('unsplash') ? effectiveUser.avatar : ''),
      });
      setHasChanges(false);
      setErrorMessage(null);
    }
  }, [effectiveUser]);

  // Update Mutation
  const updateMutation = useMutation({
    mutationFn: (data: UserProfileUpdate) => updateCurrentUserProfile(data),
    onSuccess: (updated) => {
      queryClient.setQueryData(['user-profile'], updated);
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      setHasChanges(false);
      setSuccessMessage('Your profile details have been updated successfully.');
      setTimeout(() => setSuccessMessage(null), 4000);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.detail || err.message || 'Failed to update profile.';
      setErrorMessage(msg);
    },
  });

  const handleFieldChange = (field: 'fullName' | 'goesBy' | 'avatarUrl', value: string) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      setHasChanges(true);
      return next;
    });
    setSuccessMessage(null);
    setErrorMessage(null);
  };

  const handleReset = () => {
    if (effectiveUser) {
      setFormData({
        fullName: effectiveUser.name || '',
        goesBy: effectiveUser.goes_by || '',
        avatarUrl: effectiveUser.avatar_url || (effectiveUser.avatar && !effectiveUser.avatar.includes('unsplash') ? effectiveUser.avatar : ''),
      });
      setHasChanges(false);
      setErrorMessage(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim()) {
      setErrorMessage('Full name is required.');
      return;
    }

    updateMutation.mutate({
      full_name: formData.fullName.trim(),
      goes_by: formData.goesBy.trim() || undefined,
      avatar_url: formData.avatarUrl.trim() || undefined,
    });
  };

  const handleCopyUserId = () => {
    if (effectiveUser?.id) {
      navigator.clipboard.writeText(effectiveUser.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  if (isLoading && !authUser) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="User Account & Identity Profile"
          subtitle="Loading authenticated credentials and workspace parameters from server..."
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <CardSkeleton />
          <div className="md:col-span-2">
            <CardSkeleton />
          </div>
        </div>
      </div>
    );
  }

  if (isError && !authUser) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="User Account & Identity Profile"
          subtitle="View and manage your personal account details, display identity, and organization context."
        />
        <ErrorState
          title="Profile Synchronization Error"
          message="Failed to retrieve user profile data from the PostgreSQL database. Please verify your connection."
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const effectiveAvatar = formData.avatarUrl || effectiveUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
  const roleDisplay = effectiveUser?.role === 'Global Admin' ? 'Main Admin' : effectiveUser?.role || 'User';

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Account & Identity Profile"
        subtitle="Manage your personal display identity, contact preferences, and company workspace assignments."
      />

      {/* Feedback Messages */}
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

      {errorMessage && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center justify-between text-xs text-rose-800 dark:text-rose-200 shadow-xs">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-600 hover:text-rose-800 font-bold ml-4">
            ×
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Profile Card */}
        <div className="space-y-6">
          <div className="p-6 bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl shadow-md shadow-black/20 text-center space-y-4">
            {/* Avatar with Ring */}
            <div className="relative inline-block mx-auto">
              <img
                src={effectiveAvatar}
                alt={effectiveUser?.name || 'User'}
                className="w-24 h-24 rounded-2xl object-cover border-4 border-white dark:border-stone-800 shadow-lg ring-2 ring-[var(--color-primary)] mx-auto"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80';
                }}
              />
              <div className="absolute -bottom-1.5 -right-1.5 p-1.5 bg-[var(--color-primary)] text-white rounded-xl shadow-xs">
                <Camera className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Name & Role */}
            <div className="space-y-1">
              <h2 className="text-base font-bold text-stone-900 dark:text-white">
                {formData.fullName || effectiveUser?.name || 'Authenticated User'}
              </h2>
              {formData.goesBy && (
                <p className="text-xs text-[var(--color-primary)] font-medium">
                  Goes by: "{formData.goesBy}"
                </p>
              )}
              <div className="flex items-center justify-center space-x-1.5 pt-1">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[var(--color-primary)]/15 text-[var(--color-primary)] border border-[var(--color-primary)]/20">
                  <Shield className="w-3 h-3 mr-1" />
                  {roleDisplay}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  Active
                </span>
              </div>
            </div>

            {/* Quick Metadata List */}
            <div className="pt-4 border-t border-[var(--color-border)] text-left space-y-2.5 text-xs text-stone-600 dark:text-stone-300">
              <div className="flex items-center space-x-2.5">
                <Mail className="w-4 h-4 text-stone-400 shrink-0" />
                <span className="truncate">{effectiveUser?.email || 'N/A'}</span>
              </div>
              <div className="flex items-center space-x-2.5">
                <Building2 className="w-4 h-4 text-stone-400 shrink-0" />
                <span className="font-semibold text-stone-800 dark:text-stone-200 truncate">
                  {effectiveUser?.company_name || currentCompany.name}
                </span>
              </div>
              {effectiveUser?.last_login && (
                <div className="flex items-center space-x-2.5">
                  <Clock className="w-4 h-4 text-stone-400 shrink-0" />
                  <span className="text-[11px] text-stone-500 truncate">
                    Last login: {new Date(effectiveUser.last_login).toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            {/* User ID Copy Chip */}
            <div className="pt-3 border-t border-[var(--color-border)]">
              <div className="p-2 bg-stone-50 dark:bg-stone-800/60 rounded-xl border border-[var(--color-border)] flex items-center justify-between">
                <span className="font-mono text-[10px] text-stone-500 truncate max-w-[170px]">
                  ID: {effectiveUser?.id}
                </span>
                <button
                  type="button"
                  onClick={handleCopyUserId}
                  className="text-stone-400 hover:text-[var(--color-primary)] p-1 rounded-md transition-colors"
                  title="Copy User ID"
                >
                  {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right 2-Columns: Personalization & Account Preferences */}
        <div className="md:col-span-2 space-y-6">
          <form onSubmit={handleSubmit} className="p-6 bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl shadow-md shadow-black/20 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--color-border)]">
              <div className="flex items-center space-x-2">
                <UserIcon className="w-4 h-4 text-[var(--color-primary)]" />
                <h3 className="text-sm font-bold text-stone-900 dark:text-white">Profile Details & Editable Attributes</h3>
              </div>
              <span className="text-[11px] text-stone-400 font-mono">Self-Service Profile</span>
            </div>

            {/* Editable Attributes */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Full Legal Name / Display Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => handleFieldChange('fullName', e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-[var(--color-border)] bg-white dark:bg-stone-800 text-[var(--color-text-primary)] shadow-2xs focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                  <p className="text-[10px] text-stone-400 mt-1">Displayed in audit logs, dashboard, and schedule reports.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    Goes By / Preferred Name
                  </label>
                  <input
                    type="text"
                    value={formData.goesBy}
                    onChange={(e) => handleFieldChange('goesBy', e.target.value)}
                    placeholder="e.g. Marc, Alex, Vic"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-[var(--color-border)] bg-white dark:bg-stone-800 text-[var(--color-text-primary)] shadow-2xs focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                  <p className="text-[10px] text-stone-400 mt-1">Informal preferred moniker used in collaborative notifications.</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Profile Photo URL
                </label>
                <input
                  type="url"
                  value={formData.avatarUrl}
                  onChange={(e) => handleFieldChange('avatarUrl', e.target.value)}
                  placeholder="https://images.example.com/avatar.jpg"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-[var(--color-border)] bg-white dark:bg-stone-800 text-[var(--color-text-primary)] shadow-2xs focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] font-mono text-[11px]"
                />
                <p className="text-[10px] text-stone-400 mt-1">Direct web image URL for your authenticated avatar portrait.</p>
              </div>
            </div>

            {/* Read-Only Security & Organizational Scopes */}
            <div className="pt-4 border-t border-[var(--color-border)] space-y-4">
              <h4 className="text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider flex items-center space-x-1.5">
                <Lock className="w-3.5 h-3.5 text-stone-400" />
                <span>Security & Enterprise Scopes (Read-Only)</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">Email Address</label>
                  <input
                    type="text"
                    readOnly
                    value={effectiveUser?.email || ''}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-[var(--color-border)] bg-stone-100 dark:bg-stone-800/50 text-stone-600 dark:text-stone-400 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">Assigned Role</label>
                  <input
                    type="text"
                    readOnly
                    value={roleDisplay}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-[var(--color-border)] bg-stone-100 dark:bg-stone-800/50 text-stone-600 dark:text-stone-400 cursor-not-allowed font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">Current Company</label>
                  <input
                    type="text"
                    readOnly
                    value={effectiveUser?.company_name || currentCompany.name}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-[var(--color-border)] bg-stone-100 dark:bg-stone-800/50 text-stone-600 dark:text-stone-400 cursor-not-allowed font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">Account State</label>
                  <input
                    type="text"
                    readOnly
                    value={effectiveUser?.is_active !== false ? 'Active & In Good Standing' : 'Deactivated'}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-[var(--color-border)] bg-stone-100 dark:bg-stone-800/50 text-emerald-700 dark:text-emerald-400 cursor-not-allowed font-semibold"
                  />
                </div>
              </div>

              {/* Accessible Companies List */}
              {effectiveUser?.companies && effectiveUser.companies.length > 0 && (
                <div className="space-y-1.5 pt-2">
                  <span className="text-[11px] font-medium text-stone-400 flex items-center space-x-1">
                    <Layers className="w-3 h-3" />
                    <span>Authorized Workspaces:</span>
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {effectiveUser.companies.map((c) => (
                      <span
                        key={c.company_id}
                        className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-[var(--color-border)]"
                      >
                        <Building2 className="w-3 h-3 mr-1 text-[var(--color-primary)]" />
                        {c.company_name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Action Bar */}
            <div className="pt-4 border-t border-[var(--color-border)] flex items-center justify-end space-x-3">
              {hasChanges && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  disabled={updateMutation.isPending}
                  icon={<RotateCcw className="w-4 h-4 text-stone-500" />}
                >
                  Reset
                </Button>
              )}
              <Button
                type="submit"
                size="sm"
                loading={updateMutation.isPending}
                disabled={!hasChanges}
                icon={<Save className="w-4 h-4" />}
              >
                Save Changes
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
