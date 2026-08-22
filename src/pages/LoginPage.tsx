import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { TextInput } from '../components/forms/TextInput';
import { Button } from '../components/forms/Button';
import { Lock, User, Cpu, ArrowRight } from 'lucide-react';
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
      await login(userId, password);
      setLoading(false);
      navigate('/company-selection');
    } catch (err: any) {
      setLoading(false);
      setError(err.message || 'Authentication failed. Please check your credentials.');
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-white text-blue-950 font-sans overflow-hidden">
      {/* Soft light blue ambient background accent */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-sky-200/50 rounded-full blur-[120px] pointer-events-none" />

      {/* Light Blue Centered Card */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md p-8 mx-4 bg-sky-100/90 backdrop-blur-xl border border-sky-300 rounded-3xl shadow-xl space-y-6"
      >
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-white border border-sky-300 p-3 flex items-center justify-center shadow-xs text-blue-950 mb-3">
            <Cpu className="w-8 h-8 text-blue-950" />
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-blue-950">
            ORBIT PORTAL
          </h2>
          <p className="text-xs font-semibold text-blue-900/80 mt-1">
            Sign in to your enterprise account
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
