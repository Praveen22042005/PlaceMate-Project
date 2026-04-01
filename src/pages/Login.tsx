import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { GraduationCap, AlertCircle, Briefcase, ShieldCheck, User } from 'lucide-react';
import { useAuth, UserRole } from '../contexts/AuthContext';

export default function Login() {
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [selectedRole, setSelectedRole] = useState<UserRole>('student');
  
  const navigate = useNavigate();
  const location = useLocation();
  const { signInWithGoogle, profile, user } = useAuth();

  useEffect(() => {
    if (profile) {
      const from = (location.state as any)?.from?.pathname || `/${profile.role}`;
      navigate(from, { replace: true });
    }
  }, [profile, navigate, location]);

  const handleGoogleLogin = async () => {
    try {
      setError('');
      setIsLoggingIn(true);
      await signInWithGoogle(mode === 'signup' ? selectedRole : undefined);
    } catch (err) {
      setError('Failed to sign in with Google. Please try again.');
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden"
      >
        <div className="p-8">
          <div className="flex justify-center mb-8">
            <div className="bg-indigo-600 p-3 rounded-xl shadow-lg shadow-indigo-200">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-center text-slate-900 mb-2">
            {mode === 'login' ? 'Welcome back' : 'Create an account'}
          </h2>
          <p className="text-center text-slate-500 mb-8">
            {mode === 'login' ? 'Sign in to access your dashboard' : 'Choose your role to get started'}
          </p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-lg flex items-start gap-3 text-red-600 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {mode === 'signup' && (
            <div className="grid grid-cols-3 gap-3 mb-8">
              <button
                onClick={() => setSelectedRole('student')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                  selectedRole === 'student' 
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                    : 'border-slate-100 hover:border-slate-200 text-slate-500'
                }`}
              >
                <User className="w-6 h-6 mb-2" />
                <span className="text-xs font-medium">Student</span>
              </button>
              <button
                onClick={() => setSelectedRole('recruiter')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                  selectedRole === 'recruiter' 
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                    : 'border-slate-100 hover:border-slate-200 text-slate-500'
                }`}
              >
                <Briefcase className="w-6 h-6 mb-2" />
                <span className="text-xs font-medium">Recruiter</span>
              </button>
              <button
                onClick={() => setSelectedRole('admin')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                  selectedRole === 'admin' 
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                    : 'border-slate-100 hover:border-slate-200 text-slate-500'
                }`}
              >
                <ShieldCheck className="w-6 h-6 mb-2" />
                <span className="text-xs font-medium">Admin</span>
              </button>
            </div>
          )}

          <button
            onClick={handleGoogleLogin}
            disabled={isLoggingIn || (!!user && !profile)}
            className="w-full py-3 px-4 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium rounded-lg transition-colors shadow-sm flex items-center justify-center gap-3 focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            {isLoggingIn ? 'Please wait...' : (mode === 'login' ? 'Sign in with Google' : 'Sign up with Google')}
          </button>
        </div>
        
        <div className="bg-slate-50 p-6 border-t border-slate-100 text-center">
          <p className="text-sm text-slate-600">
            {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
            <button 
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
              className="text-indigo-600 font-medium hover:text-indigo-700"
            >
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
