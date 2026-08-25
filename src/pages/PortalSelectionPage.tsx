import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Cpu, ShieldCheck, Wrench, ArrowRight, Sparkles } from 'lucide-react';

export const PortalSelectionPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-white text-blue-950 font-sans overflow-hidden py-12 px-4">
      {/* Soft ambient background accent */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-sky-200/50 rounded-full blur-[130px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center text-center space-y-3"
        >
          <div className="w-16 h-16 rounded-2xl bg-white border border-sky-300 p-3 flex items-center justify-center shadow-sm text-blue-950 mb-1">
            <Cpu className="w-9 h-9 text-blue-950" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-200/70 border border-sky-300 text-blue-900 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-blue-700" /> Enterprise Gateway
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-blue-950">
            ORBIT RESOURCE MANAGEMENT PORTAL
          </h1>
          <p className="text-sm md:text-base font-semibold text-blue-900/80 max-w-xl">
            Please select your designated portal type to continue to sign in.
          </p>
        </motion.div>

        {/* Portal Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
          {/* Executive & Operations Card */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            whileHover={{ y: -6, transition: { duration: 0.2 } }}
            onClick={() => navigate('/login/executive')}
            className="group cursor-pointer bg-sky-100/90 hover:bg-sky-100 backdrop-blur-xl border border-sky-300 hover:border-blue-500 rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all flex flex-col justify-between space-y-6 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />

            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-950 text-white flex items-center justify-center shadow-md group-hover:bg-blue-900 transition-colors">
                <ShieldCheck className="w-7 h-7 text-sky-300" />
              </div>

              <div>
                <span className="inline-block px-2.5 py-0.5 rounded-md bg-blue-950/10 text-blue-950 text-xs font-bold mb-2">
                  Management & Operations
                </span>
                <h2 className="text-2xl font-black text-blue-950 tracking-tight group-hover:text-blue-900 transition-colors">
                  Executive Portal
                </h2>
                <p className="text-xs md:text-sm font-semibold text-blue-900/80 mt-2 leading-relaxed">
                  For Main Admins, Managers, Ops Executives, Company Admins & Resource Managers to oversee company-wide tool deployments, schedules & operational reports.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-sky-200/80 flex items-center justify-between text-blue-950 font-extrabold text-sm group-hover:text-blue-700">
              <span>Continue to Executive Login</span>
              <div className="w-9 h-9 rounded-xl bg-white border border-sky-300 flex items-center justify-center group-hover:translate-x-1 transition-transform shadow-xs">
                <ArrowRight className="w-4 h-4 text-blue-950" />
              </div>
            </div>
          </motion.div>

          {/* Field Engineer Card */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            whileHover={{ y: -6, transition: { duration: 0.2 } }}
            onClick={() => navigate('/login/engineer')}
            className="group cursor-pointer bg-sky-100/90 hover:bg-sky-100 backdrop-blur-xl border border-sky-300 hover:border-indigo-500 rounded-3xl p-8 shadow-xl hover:shadow-2xl transition-all flex flex-col justify-between space-y-6 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform" />

            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-950 text-white flex items-center justify-center shadow-md group-hover:bg-indigo-900 transition-colors">
                <Wrench className="w-7 h-7 text-indigo-300" />
              </div>

              <div>
                <span className="inline-block px-2.5 py-0.5 rounded-md bg-indigo-950/10 text-indigo-950 text-xs font-bold mb-2">
                  Engineer Self-Service
                </span>
                <h2 className="text-2xl font-black text-blue-950 tracking-tight group-hover:text-indigo-900 transition-colors">
                  Field Engineer Portal
                </h2>
                <p className="text-xs md:text-sm font-semibold text-blue-900/80 mt-2 leading-relaxed">
                  Dedicated self-service portal for Field Engineers & Specialists to view assigned schedule deployments, update profile details, and submit PTO requests.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-sky-200/80 flex items-center justify-between text-blue-950 font-extrabold text-sm group-hover:text-indigo-700">
              <span>Continue to Engineer Login</span>
              <div className="w-9 h-9 rounded-xl bg-white border border-sky-300 flex items-center justify-center group-hover:translate-x-1 transition-transform shadow-xs">
                <ArrowRight className="w-4 h-4 text-blue-950" />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};
