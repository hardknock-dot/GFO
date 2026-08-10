import React from 'react';
import { PageHeader } from '../components/layout/PageHeader';
import { useCompany } from '../context/CompanyContext';
import { TextInput } from '../components/forms/TextInput';
import { Button } from '../components/forms/Button';
import { Dropdown } from '../components/forms/Dropdown';
import { Shield, Building2, Bell, Lock, Save } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { currentCompany } = useCompany();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Enterprise Account & System Settings"
        subtitle="Configure company tenant tokens, FastAPI backend base URLs, notification thresholds, and security preferences."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Navigation Cards */}
        <div className="space-y-4">
          <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-sm space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Settings Categories</h4>
            <div className="space-y-1 text-xs font-medium">
              <button className="w-full text-left px-3 py-2 rounded-lg bg-[var(--color-secondary)] text-white flex items-center space-x-2">
                <Building2 className="w-4 h-4" />
                <span>Tenant & Theme Tokens</span>
              </button>
              <button className="w-full text-left px-3 py-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center space-x-2">
                <Lock className="w-4 h-4 text-slate-400" />
                <span>FastAPI Base URL & Security</span>
              </button>
              <button className="w-full text-left px-3 py-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center space-x-2">
                <Bell className="w-4 h-4 text-slate-400" />
                <span>Visa Expiry Notifications</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Settings Form */}
        <div className="md:col-span-2 space-y-6">
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm space-y-6">
            <h3 className="text-base font-bold text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-[var(--color-secondary)]" />
              <span>Current Tenant Configuration</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TextInput label="Active Company Name" value={currentCompany.name} readOnly />
              <TextInput label="Company Code" value={currentCompany.code} readOnly />
              <TextInput label="Primary Theme Color" value={currentCompany.primaryColor} readOnly />
              <TextInput label="Accent Theme Color" value={currentCompany.accentColor} readOnly />
            </div>
          </div>

          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm space-y-6">
            <h3 className="text-base font-bold text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-slate-800 flex items-center space-x-2">
              <Shield className="w-4 h-4 text-slate-400 dark:text-slate-300" />
              <span>FastAPI Integration Settings</span>
            </h3>

            <div className="space-y-4">
              <TextInput
                label="FastAPI REST Base Endpoint"
                defaultValue={import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'}
                helperText="Change this when deploying backend to staging or production PostgreSQL server."
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Dropdown label="Auth Header Token Type" options={['Bearer Token (JWT)', 'OAuth2 Password Flow', 'API Key Header']} />
                <Dropdown label="Visa Threshold Alert Days" options={['30 Days Before Expiry', '60 Days Before Expiry', '90 Days Before Expiry']} />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <Button icon={<Save className="w-4 h-4" />} onClick={() => alert('Settings configuration saved!')}>
                Save Settings
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
