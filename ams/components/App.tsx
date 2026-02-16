
import React, { useState, useEffect } from 'react';
import { supabase } from './constants';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { UserProfile } from './types';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (session?.user) {
        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'USER_UPDATED') {
          fetchUserProfile(session.user.id);
          // Update last_login on sign-in
          if (event === 'SIGNED_IN') {
             supabase.from('users').update({ last_login: new Date().toISOString() }).eq('id', session.user.id).then();
          }
        }
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.warn("User profile not found in database, check 'users' table.");
        setUserProfile(null);
      } else {
        setUserProfile({
          id: userId,
          role: data.role || 'student',
          full_name: data.full_name,
          roll_no: data.roll_no,
          status: data.status,
          email: data.email,
          last_login: data.last_login,
          last_active_at: data.last_active_at
        });
        
        // Always update last_login on app load if we have a profile
        await supabase.from('users').update({ 
          last_login: new Date().toISOString(),
          last_active_at: new Date().toISOString()
        }).eq('id', userId);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setUserProfile(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-varsity-navy dark:text-varsity-gold mx-auto" />
          <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Securing Session...</p>
        </div>
      </div>
    );
  }

  if (!session || !userProfile) {
    return <Login darkMode={darkMode} setDarkMode={setDarkMode} />;
  }

  if (userProfile.status === 'blocked') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 text-center transition-colors duration-300">
        <div className="max-w-md bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-800 space-y-6">
          <div className="w-20 h-20 bg-rose-50 dark:bg-rose-900/20 text-rose-500 rounded-3xl flex items-center justify-center mx-auto">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <h2 className="text-2xl font-display font-bold text-slate-900 dark:text-slate-100 uppercase">Access Revoked</h2>
          <p className="text-slate-400 dark:text-slate-500 text-sm font-medium">Your institutional account has been blocked by the administrator. Please contact the registrar's office for resolution.</p>
          <button onClick={() => supabase.auth.signOut()} className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-bold uppercase tracking-widest text-xs">Logout Session</button>
        </div>
      </div>
    );
  }

  return <Dashboard user={userProfile} darkMode={darkMode} setDarkMode={setDarkMode} />;
}
