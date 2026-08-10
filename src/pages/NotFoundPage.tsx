import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/forms/Button';
import { Home, ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
      <div className="text-6xl font-black font-mono text-[var(--color-secondary)]">404</div>
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Page Not Found</h2>
      <p className="text-sm text-slate-500 max-w-md">
        The requested Orbit Resource Management Portal module path could not be located or may have been restricted.
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
