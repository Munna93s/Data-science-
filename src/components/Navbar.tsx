/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Database, Download, LogIn, User as UserIcon } from 'lucide-react';
import { auth } from '../lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { motion } from 'motion/react';
import { useDataStore } from '../store/useDataStore';

export default function Navbar() {
  const [user] = useAuthState(auth);
  const { datasetName } = useDataStore();

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Login failed', error);
    }
  };

  return (
    <nav className="h-16 border-b border-border-subtle bg-surface-dark flex items-center justify-between px-6 sticky top-0 z-50">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-brand rounded-lg flex items-center justify-center shadow-lg shadow-brand/20">
          <Database className="text-white w-6 h-6" />
        </div>
        <div>
          <h1 className="font-bold text-xl tracking-tight">DataMind AI</h1>
          {datasetName && (
            <span className="text-xs text-brand font-mono uppercase tracking-widest">{datasetName}</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        {datasetName && (
          <button className="flex items-center gap-2 px-4 py-2 bg-surface-lighter border border-border-subtle rounded-lg text-sm hover:bg-slate-700 transition-colors">
            <Download className="w-4 h-4" />
            Export
          </button>
        )}

        {user ? (
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium">{user.displayName}</p>
              <button 
                onClick={() => signOut(auth)}
                className="text-xs text-slate-400 hover:text-white transition-colors"
                id="logout-btn"
              >
                Log out
              </button>
            </div>
            {user.photoURL ? (
              <img src={user.photoURL} alt="Avatar" className="w-10 h-10 rounded-full border border-border-subtle" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-slate-800 border border-border-subtle flex items-center justify-center">
                <UserIcon className="w-6 h-6 text-slate-400" />
              </div>
            )}
          </div>
        ) : (
          <button 
            onClick={handleLogin}
            className="flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-lg text-sm font-semibold hover:bg-opacity-90 transition-all shadow-lg shadow-brand/20"
            id="login-btn"
          >
            <LogIn className="w-4 h-4" />
            Sign In
          </button>
        )}
      </div>
    </nav>
  );
}
