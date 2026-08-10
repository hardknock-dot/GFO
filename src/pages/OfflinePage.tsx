import React, { useState } from 'react';
import { Button } from '../components/forms/Button';
import { WifiOff, RefreshCw } from 'lucide-react';

export const OfflinePage: React.FC = () => {
  const [checking, setChecking] = useState(false);

  const handleRetry = () => {
    setChecking(true);
    setTimeout(() => {
      setChecking(false);
      if (navigator.onLine) {
        window.location.href = '/dashboard';
      }
    }, 1000);
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center text-center p-6 bg-slate-50 dark:bg-slate-950 font-sans">
      <div className="max-w-md p-8 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xl space-y-6">
        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto text-slate-500 dark:text-slate-400">
          <WifiOff className="w-9 h-9" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Connection Lost</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            You are currently offline. Please verify your internet connection or local fab network status.
          </p>
        </div>
        <div className="pt-2 flex justify-center">
          <Button
            onClick={handleRetry}
            loading={checking}
            icon={<RefreshCw className="w-4 h-4" />}
          >
            Check Status
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OfflinePage;
