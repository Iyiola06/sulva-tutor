
import React, { useEffect } from 'react';
import { AppView } from '../types';
import { useAuth } from '../contexts/AuthProvider';
import { useNavigate, useLocation } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
  onNavigate: (view: AppView) => void;
}

const SulvaLogo = ({ className = "w-8 h-8" }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M50 50 L85 50 A35 35 0 0 0 50 15 Z" fill="white" />
    <path d="M50 50 L15 50 A35 35 0 0 0 50 85 Z" fill="white" />
  </svg>
);

const Layout: React.FC<LayoutProps> = ({ children, onNavigate }) => {
  const { user, isPro, usageCount, refreshUsage } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    refreshUsage();
  }, [location.pathname]);

  const currentYear = new Date().getFullYear();
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  return (
    <div className="min-h-screen flex flex-col font-sans selection:bg-brand-100 selection:text-brand-900 overflow-x-hidden">
      <header className="bg-white/90 backdrop-blur-md border-b border-slate-100 py-3 md:py-4 sticky top-0 z-[60] transition-all">
        <div className="container mx-auto px-4 md:px-6 flex justify-between items-center">
          <div
            onClick={() => onNavigate('main')}
            className="flex items-center space-x-2 md:space-x-3 group cursor-pointer"
          >
            <div className="w-8 h-8 md:w-10 md:h-10 bg-brand-600 rounded-lg md:rounded-xl flex items-center justify-center text-white shadow-lg shadow-brand-200 group-hover:scale-105 transition-transform">
              <SulvaLogo className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-extrabold text-slate-900 tracking-tight leading-none">
                Sulva-Tutor <span className="text-brand-600">AI</span>
              </h1>
              <p className="text-[8px] md:text-[10px] font-bold text-slate-400 mt-0.5 md:mt-1 uppercase tracking-tighter">
                {currentDate}
              </p>
            </div>
          </div>
          <nav className="hidden md:flex items-center space-x-1">
            {user && (
              <div className="flex items-center space-x-4 mr-4">
                <div className="flex flex-col items-end">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    {isPro ? <span className="text-brand-600">Pro Plan</span> : <span>Free Plan</span>}
                  </div>
                  {!isPro && (
                    <div className="text-[10px] text-slate-400 font-medium">
                      {usageCount}/3 Quizzes Used
                    </div>
                  )}
                </div>
                {!isPro && (
                  <button
                    onClick={() => navigate('/pricing')}
                    className="text-xs font-black bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700 transition-colors uppercase tracking-wide"
                  >
                    Upgrade
                  </button>
                )}
              </div>
            )}
            <button
              onClick={() => onNavigate('main')}
              className="px-4 py-2 text-sm font-semibold text-brand-600 bg-brand-50 rounded-lg hover:bg-brand-100 transition-colors"
            >
              Study Hub
            </button>
          </nav>
        </div>
      </header>

      <main className="flex-grow container mx-auto px-4 py-6 md:py-12">
        {children}
      </main>

      <footer className="bg-white border-t border-slate-100 py-6 md:py-8">
        <div className="container mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4 text-slate-400 text-xs text-center md:text-left">
          <p className="font-medium">&copy; {currentYear} Sulva-Tutor AI. Built for the modern student.</p>
          <div className="flex space-x-4 md:space-x-6">
            <button onClick={() => onNavigate('privacy')} className="hover:text-slate-600 transition-colors font-semibold">Privacy</button>
            <button onClick={() => onNavigate('terms')} className="hover:text-slate-600 transition-colors font-semibold">Terms</button>
            <button onClick={() => onNavigate('help')} className="hover:text-slate-600 transition-colors font-semibold">Help</button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
