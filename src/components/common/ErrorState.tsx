import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '../forms/Button';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'API Connection Exception',
  message = 'Failed to retrieve response from FastAPI endpoint. Please verify backend service status.',
  onRetry,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded-xl my-4">
      <div className="p-3 bg-rose-100 dark:bg-rose-900/40 text-rose-600 rounded-full mb-3">
        <AlertTriangle className="w-8 h-8" />
      </div>
      <h4 className="text-base font-semibold text-rose-900 dark:text-rose-200">{title}</h4>
      <p className="text-sm text-rose-600 dark:text-rose-400 max-w-md mt-1 mb-4">{message}</p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry} icon={<RefreshCw className="w-4 h-4" />}>
          Retry Endpoint Request
        </Button>
      )}
    </div>
  );
};
