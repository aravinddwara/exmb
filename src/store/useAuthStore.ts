import { create } from 'zustand';
import { UserProfile } from '../types';
import { supabase } from '../lib/supabase';

interface AuthState {
  user: any | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isAdmin: boolean;
  setUser: (user: any | null) => Promise<void>;
  setProfile: (profile: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  isLoading: true,
  isAdmin: false,
  setUser: async (user) => {
    let isAdmin = false;
    if (user) {
      try {
        const { data } = await supabase.rpc('is_admin');
        isAdmin = !!data;
      } catch (e) {
        console.error('Failed to check admin status', e);
      }
    }
    set({ user, isAdmin });
  },
  setProfile: (profile) => set({ profile }),
  setLoading: (isLoading) => set({ isLoading }),
}));
