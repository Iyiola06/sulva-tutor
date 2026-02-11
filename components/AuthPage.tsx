
import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';

const AuthPage: React.FC = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null);
    const navigate = useNavigate();

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            if (isLogin) {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                navigate('/');
            } else {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (error) throw error;
                setMessage({ type: 'success', text: 'Check your email for the confirmation link!' });
            }
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || 'An error occurred' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-[80vh] flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-[2rem] shadow-2xl w-full max-w-md border border-slate-100">
                <h2 className="text-3xl font-black text-slate-900 mb-6 text-center tracking-tight">
                    {isLogin ? 'Welcome Back' : 'Join Sulva-Tutor'}
                </h2>

                {message && (
                    <div className={`p-4 rounded-xl mb-6 text-sm font-medium ${message.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleAuth} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full p-4 rounded-xl border-2 border-slate-100 focus:border-brand-600 focus:outline-none transition-colors font-medium text-slate-900 bg-slate-50 focus:bg-white"
                            placeholder="student@example.com"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full p-4 rounded-xl border-2 border-slate-100 focus:border-brand-600 focus:outline-none transition-colors font-medium text-slate-900 bg-slate-50 focus:bg-white"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-brand-600 text-white font-black py-4 rounded-xl hover:bg-brand-700 transition-all shadow-lg hover:shadow-brand-200 disabled:opacity-70 disabled:cursor-not-allowed mt-4"
                    >
                        {loading ? <i className="fas fa-spinner fa-spin"></i> : (isLogin ? 'Sign In' : 'Create Account')}
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <button
                        onClick={() => setIsLogin(!isLogin)}
                        className="text-slate-400 hover:text-brand-600 font-bold text-sm transition-colors"
                    >
                        {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AuthPage;
