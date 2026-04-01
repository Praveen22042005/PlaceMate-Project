import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GraduationCap, ArrowRight, Sparkles, Building2, Users, Briefcase } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen w-full bg-slate-50 flex flex-col overflow-hidden relative selection:bg-indigo-100 selection:text-indigo-900">
      {/* Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      
      {/* Glowing Orbs */}
      <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-indigo-500 opacity-20 blur-[100px]"></div>
      <div className="absolute right-1/4 top-1/4 -z-10 h-[250px] w-[250px] rounded-full bg-purple-500 opacity-20 blur-[100px]"></div>
      <div className="absolute left-1/4 bottom-1/4 -z-10 h-[300px] w-[300px] rounded-full bg-emerald-500 opacity-10 blur-[100px]"></div>

      <header className="fixed top-6 left-1/2 -translate-x-1/2 w-[90%] max-w-5xl px-6 py-3 flex items-center justify-between bg-white/70 backdrop-blur-xl border border-slate-200/60 rounded-2xl shadow-lg shadow-slate-200/50 z-50">
        <div className="flex items-center gap-2.5">
          <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-2 rounded-xl shadow-md shadow-indigo-200">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-slate-900 tracking-tight">PlaceMate</span>
        </div>
        <div className="flex items-center gap-4">
          <a href="https://github.com/Praveen22042005/placemate" target="_blank" rel="noreferrer" className="hidden sm:block text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
            Docs
          </a>
          <Link 
            to="/login" 
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-xl transition-all shadow-md hover:shadow-lg flex items-center gap-2"
          >
            Sign In
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </header>
      
      <main className="flex-1 flex flex-col items-center justify-center relative z-10 px-6 pt-32 pb-32">
        <div className="max-w-5xl mx-auto text-center">
          

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl md:text-7xl lg:text-8xl font-extrabold text-slate-900 tracking-tight leading-[1.1] mb-8"
          >
            Automate Campus <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-300% animate-gradient">
              Placements
            </span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg md:text-xl text-slate-600 mb-12 max-w-2xl mx-auto leading-relaxed"
          >
            A role-based digital framework for intelligent eligibility matching, real-time tracking, and powerful analytics dashboards.
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link 
              to="/login" 
              className="w-full sm:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-indigo-200 hover:shadow-xl hover:-translate-y-0.5 flex items-center justify-center gap-2"
            >
              Get Started Now
              <ArrowRight className="w-5 h-5" />
            </Link>
            <a 
              href="https://github.com/Praveen22042005/placemate" 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-xl transition-all shadow-sm border border-slate-200 hover:shadow-md flex items-center justify-center"
            >
              View Repository
            </a>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
