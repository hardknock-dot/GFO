import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';
import { Button } from '../forms/Button';
import { AlertOctagon, RotateCcw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary caught an error]:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/dashboard';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 text-center font-sans">
          <div className="max-w-md p-8 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xl space-y-6">
            <div className="w-16 h-16 bg-rose-100 dark:bg-rose-950/40 rounded-2xl flex items-center justify-center mx-auto text-rose-600 dark:text-rose-400">
              <AlertOctagon className="w-9 h-9" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Application Exception Caught</h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                An unexpected system fault occurred in the React components runtime. Your data state is protected.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800/80 rounded-xl text-left">
                <p className="text-[11px] font-mono text-rose-600 dark:text-rose-400 font-semibold truncate">
                  Error: {this.state.error.message}
                </p>
              </div>
            )}

            <div className="pt-2 flex justify-center">
              <Button
                onClick={this.handleReset}
                icon={<RotateCcw className="w-4 h-4" />}
              >
                Reload ORBIT Portal
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
