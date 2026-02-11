
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabaseClient';

interface AuthContextType {
    session: Session | null;
    user: User | null;
    subscription: any | null;
    isPro: boolean;
    usageCount: number;
    refreshUsage: () => void;
    loading: boolean;
    signInWithGoogle: () => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const [subscription, setSubscription] = useState<any | null>(null);
    const [usageCount, setUsageCount] = useState(0);

    const fetchUsage = async (userId: string) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const { count } = await supabase
            .from('usage_logs')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('action_type', 'generate_quiz')
            .gte('created_at', today.toISOString());

        setUsageCount(count || 0);
    };

    useEffect(() => {
        const fetchSubscription = async (userId: string) => {
            const { data, error } = await supabase
                .from('subscriptions')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (data) setSubscription(data);
        };

        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchSubscription(session.user.id);
                fetchUsage(session.user.id);
            }
            setLoading(false);
        });

        const {
            data: { subscription: authListener },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchSubscription(session.user.id);
                fetchUsage(session.user.id);
            }
            setLoading(false);
        });

        return () => authListener.unsubscribe();
    }, []);

    const signInWithGoogle = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
        });
        if (error) console.error('Error signing in with Google:', error.message);
    };

    const signOut = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) console.error('Error signing out:', error.message);
    };

    const refreshUsage = () => {
        if (user) {
            fetchUsage(user.id);
            // Re-fetch subscription to check for status updates (e.g. after payment)
            const fetchSubscription = async () => {
                const { data } = await supabase
                    .from('subscriptions')
                    .select('*')
                    .eq('user_id', user.id)
                    .single();
                if (data) setSubscription(data);
            };
            fetchSubscription();
        }
    };

    const value = {
        session,
        user,
        subscription,
        isPro: subscription?.status === 'active' || subscription?.status === 'simulated_pro',
        loading,
        usageCount,
        signInWithGoogle,
        signOut,
        refreshUsage,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
