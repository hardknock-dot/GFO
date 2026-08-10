import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/forms/Button';
import { ServerCrash, RefreshCw, Home } from 'lucide-react';

export const ServerErrorPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 space-y-4 font-sans">
      <div className="w-16 h-16 bg-rose-100 dark:bg-rose-950/40 rounded-2xl flex items-center justify-center text-rose-600 dark:text-rose-400">
        <ServerCrash className="w-9 h-9" />
      </div>
      <div className="text-6xl font-black font-mono text-[var(--color-secondary)]">500</div>
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Server Connection Error</h2>
      <p className="text-sm text-slate-500 max-w-md leading-relaxed">
        The ORBIT Enterprise Portal was unable to establish a connection with the backend FastAPI services.
      </p>
      <div className="flex items-center space-x-3 pt-4">
        <Button variant="outline" onClick={() => window.location.reload()} icon={<RefreshCw className="w-4 h-4" />}>
          Retry Connection
        </Button>
        <Button onClick={() => navigate('/dashboard')} icon={<Home className="w-4 h-4" />}>
          Return to Dashboard
        </Button>
      </div>
    </div>
  );
};

export default ServerErrorPage;
