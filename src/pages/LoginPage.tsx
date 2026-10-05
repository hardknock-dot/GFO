import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { TextInput } from '../components/forms/TextInput';
import { Button } from '../components/forms/Button';
import { Lock, User, ShieldCheck, ArrowRight, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [userId, setUserId] = useState('m.vance@orbit-ormp.com');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const loggedInUser = await login(userId, password);
      setLoading(false);
      if (loggedInUser?.role === 'Client' || loggedInUser?.role === 'CLIENT') {
        navigate('/client');
      } else {
        navigate('/company-selection');
      }
    } catch (err: any) {
      setLoading(false);
      setError(err.message || 'Authentication failed. Please check your credentials.');
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-white text-blue-950 font-sans overflow-hidden py-8">
      {/* Soft light blue ambient background accent */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-sky-200/50 rounded-full blur-[120px] pointer-events-none" />

      {/* Light Blue Centered Card */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md p-8 mx-4 bg-sky-100/90 backdrop-blur-xl border border-sky-300 rounded-3xl shadow-xl space-y-6"
      >
        <button
          type="button"
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-900/80 hover:text-blue-950 transition-colors mb-2 cursor-pointer group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Portal Selection</span>
        </button>

        <div className="flex flex-col items-center mb-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-950 border border-sky-300 p-3 flex items-center justify-center shadow-md text-white mb-3">
            <ShieldCheck className="w-8 h-8 text-sky-300" />
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-blue-950/10 text-blue-950 text-[11px] font-extrabold uppercase tracking-wider mb-1">
            Executive & Operations
          </span>
          <h2 className="text-2xl font-black tracking-tight text-blue-950">
            Management Sign In
          </h2>
          <p className="text-xs font-semibold text-blue-900/80 mt-1">
            Access executive dashboards, schedules & company metrics
          </p>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl shadow-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <TextInput
            label="User Email / ID"
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            icon={<User className="w-4 h-4 text-blue-900" />}
            required
            className="bg-white border-sky-300 text-blue-950 placeholder-blue-900/40 focus:border-blue-600 font-semibold"
          />

          <TextInput
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            icon={<Lock className="w-4 h-4 text-blue-900" />}
            required
            className="bg-white border-sky-300 text-blue-950 placeholder-blue-900/40 focus:border-blue-600 font-semibold"
          />

          <Button
            type="submit"
            size="lg"
            loading={loading}
            className="w-full bg-blue-950 hover:bg-blue-900 text-white font-extrabold py-3 rounded-xl shadow-md transition-all transform hover:-translate-y-0.5"
            icon={<ArrowRight className="w-4 h-4 text-white" />}
          >
            Sign In to Portal
          </Button>
        </form>
      </motion.div>
    </div>
  );
};
