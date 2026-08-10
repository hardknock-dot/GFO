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
  const [password, setPassword] = useState('••••••••••••');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await login(userId, password);
    setLoading(false);
    navigate('/company-selection');
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-slate-950 text-white font-sans overflow-hidden">
      {/* Sleek background radial gradient orbs */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[600px] h-[600px] bg-white/5 rounded-full blur-[120px]" />
        <div className="absolute inset-0 opacity-5 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px]" />
      </div>

      {/* Glassmorphic Centered Card */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md p-8 mx-4 bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 rounded-2xl shadow-2xl"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-white p-2.5 flex items-center justify-center shadow-lg shadow-white/10 mb-3">
            <Cpu className="w-7 h-7 text-slate-950" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
            ORBIT PORTAL
          </h2>
          <p className="text-xs text-slate-400 mt-1">Sign in to your enterprise account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <TextInput
            label="User ID"
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            icon={<User className="w-4 h-4 text-slate-400" />}
            required
            className="bg-slate-950/50 border-slate-800 focus:border-white transition-colors"
          />

          <TextInput
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            icon={<Lock className="w-4 h-4 text-slate-400" />}
            required
            className="bg-slate-950/50 border-slate-800 focus:border-white transition-colors"
          />

          <Button
            type="submit"
            size="lg"
            loading={loading}
            className="w-full bg-white hover:bg-slate-100 text-slate-950 font-semibold py-2.5 rounded-xl shadow-lg shadow-white/5 transition-all transform hover:-translate-y-0.5 active:translate-y-0 duration-150"
            icon={<ArrowRight className="w-4 h-4 text-slate-950" />}
          >
            Sign In
          </Button>
        </form>
      </motion.div>
    </div>
  );
};
