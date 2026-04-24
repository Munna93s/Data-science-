import { create } from 'zustand';
import { account } from '../lib/appwrite';
import { ID } from 'appwrite';

interface User {
  email: string;
  name: string;
  role: string;
  subscription?: 'free' | 'pro';
  expiresAt?: any;
  usageCount?: number;
  usageLimit?: number;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  sessions: any[];
  
  login: (email: string, pass: string) => Promise<void>;
  signup: (email: string, pass: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  verifySession: () => Promise<void>;
  fetchSessions: () => Promise<void>;
  upgradeToPro: () => Promise<void>;
  saveSession: (datasetName: string, rowCount: number) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem('datamind_token'),
  isLoading: true,
  error: null,
  sessions: [],

  login: async (email, pass) => {
    try {
      set({ isLoading: true, error: null });
      await account.createEmailPasswordSession(email, pass);
      const userRes = await account.get();
      const jwtRes = await account.createJWT();
      
      const token = jwtRes.jwt;
      localStorage.setItem('datamind_token', token);
      
      // Determine role (custom logic if needed, or query backend)
      const ADMIN_EMAILS = ['munna93s@gmail.com', 'kolly93m@gmail.com'];
      const role = ADMIN_EMAILS.includes(userRes.email) ? 'admin' : 'user';
      
      set({ 
        user: { email: userRes.email, name: userRes.name, role }, 
        token, 
        isLoading: false 
      });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  signup: async (email, pass, name) => {
    try {
      set({ isLoading: true, error: null });
      await account.create(ID.unique(), email, pass, name);
      await get().login(email, pass);
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    try {
      await account.deleteSession('current');
    } catch (e) {
      console.warn('Silent session delete fail');
    }
    localStorage.removeItem('datamind_token');
    set({ user: null, token: null, isLoading: false, sessions: [] });
  },

  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  verifySession: async () => {
    try {
      const userRes = await account.get();
      const jwtRes = await account.createJWT();
      const token = jwtRes.jwt;
      localStorage.setItem('datamind_token', token);
      
      // Fetch detailed user profile from our own backend if needed (e.g. for subscription status)
      const res = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const userData = await res.json();
        set({ user: userData, token, isLoading: false });
      } else {
        // Fallback to basic appwrite info
        const ADMIN_EMAILS = ['munna93s@gmail.com', 'kolly93m@gmail.com'];
        const role = ADMIN_EMAILS.includes(userRes.email) ? 'admin' : 'user';
        set({ 
          user: { email: userRes.email, name: userRes.name, role }, 
          token, 
          isLoading: false 
        });
      }
    } catch (err) {
      localStorage.removeItem('datamind_token');
      set({ user: null, token: null, isLoading: false });
    }
  },

  fetchSessions: async () => {
    const { token } = get();
    if (!token) return;
    try {
      const res = await fetch('/api/sessions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const sessions = await res.json();
        set({ sessions });
      }
    } catch (err) {
      console.error('Failed to fetch sessions');
    }
  },

  upgradeToPro: async () => {
    const { token } = get();
    if (!token) return;
    try {
      const res = await fetch('/api/user/subscribe', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const { user } = get();
        if (user) {
          set({ user: { ...user, subscription: 'pro', expiresAt: data.expiresAt } });
        }
      }
    } catch (err) {
      console.error('Upgrade failed');
    }
  },

  saveSession: async (datasetName, rowCount) => {
    const { token } = get();
    if (!token) return;
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ datasetName, rowCount })
      });
      if (res.ok) {
        get().fetchSessions();
        // Refresh me to get updated usage counts
        get().verifySession();
      } else {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to save session');
      }
    } catch (err: any) {
      console.error('Failed to save session', err);
      throw err;
    }
  }
}));
