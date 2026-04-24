import { create } from 'zustand';

interface User {
  email: string;
  name: string;
  role: string;
  subscription?: 'free' | 'pro';
  expiresAt?: any;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  sessions: any[];
  
  setAuth: (user: User, token: string) => void;
  logout: () => void;
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

  setAuth: (user, token) => {
    localStorage.setItem('datamind_token', token);
    set({ user, token, error: null, isLoading: false });
  },

  logout: () => {
    localStorage.removeItem('datamind_token');
    set({ user: null, token: null, isLoading: false, sessions: [] });
  },

  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  verifySession: async () => {
    const { token } = get();
    if (!token) {
      set({ isLoading: false });
      return;
    }

    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const user = await res.json();
        set({ user, isLoading: false });
      } else {
        localStorage.removeItem('datamind_token');
        set({ user: null, token: null, isLoading: false });
      }
    } catch (err) {
      set({ isLoading: false });
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
      }
    } catch (err) {
      console.error('Failed to save session');
    }
  }
}));
