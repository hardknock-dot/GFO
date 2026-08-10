import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/forms/Button';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';

export const ForbiddenPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 space-y-4 font-sans">
      <div className="w-16 h-16 bg-amber-100 dark:bg-amber-950/40 rounded-2xl flex items-center justify-center text-amber-600 dark:text-amber-400">
        <ShieldAlert className="w-9 h-9" />
      </div>
      <div className="text-6xl font-black font-mono text-[var(--color-secondary)]">403</div>
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Access Forbidden</h2>
      <p className="text-sm text-slate-500 max-w-md leading-relaxed">
        Your current user role permissions do not authorize you to access this workspace module. Please contact your administrator.
      </p>
      <div className="flex items-center space-x-3 pt-4">
        <Button variant="outline" onClick={() => navigate(-1)} icon={<ArrowLeft className="w-4 h-4" />}>
          Go Back
        </Button>
        <Button onClick={() => navigate('/dashboard')} icon={<Home className="w-4 h-4" />}>
          Return to Dashboard
        </Button>
      </div>
    </div>
  );
};

export default ForbiddenPage;
