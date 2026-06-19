import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '../../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

interface AgencyAuthCtx {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null; redirectTo?: string }>;
  signUp: (email: string, password: string, agencyName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AgencyAuthCtx | null>(null);

export function AgencyAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };

    const userId = data.user?.id;
    if (userId) {
      const { data: agency } = await supabase
        .from('agencies')
        .select('id')
        .eq('owner_id', userId)
        .maybeSingle();

      if (!agency) {
        // No agency — route to first sub-account they belong to
        const { data: membership } = await supabase
          .from('user_sub_accounts')
          .select('sub_account_id')
          .eq('user_id', userId)
          .limit(1)
          .maybeSingle();

        if (membership?.sub_account_id) {
          return { error: null, redirectTo: `/app/${membership.sub_account_id}/dashboard` };
        }
      }
    }

    return { error: null, redirectTo: '/agency' };
  };

  const signUp = async (email: string, password: string, agencyName: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };
    if (data.user) {
      const { error: agencyError } = await supabase.from('agencies').insert({
        name: agencyName,
        owner_id: data.user.id,
      });
      if (agencyError) return { error: agencyError.message };
    }
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return <Ctx.Provider value={{ user, session, loading, signIn, signUp, signOut }}>{children}</Ctx.Provider>;
}

export function useAgencyAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAgencyAuth must be used inside AgencyAuthProvider');
  return ctx;
}
