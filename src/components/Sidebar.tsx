/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FileUp, Table as TableIcon, Database, BookOpen, ChevronRight, Activity, ShieldCheck, Sparkles } from 'lucide-react';
import { useRef, useEffect } from 'react';
import { parseFile } from '../lib/dataUtils';
import { useDataStore } from '../store/useDataStore';
import { useAuthStore } from '../store/useAuthStore';
import { motion, AnimatePresence } from 'motion/react';

export default function Sidebar() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user, sessions, fetchSessions, upgradeToPro, saveSession } = useAuthStore();
  const { setDataset, datasetName, sheets, activeSheetName, setActiveSheet, setLoading, setError } = useDataStore();

  useEffect(() => {
    if (user) fetchSessions();
  }, [user]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      setError('File too large. Max 10MB allowed for this version.');
      return;
    }

    setLoading(true);
    try {
      const data = await parseFile(file);
      setDataset(file.name, data);

      if (user) {
        const rowCount = Object.values(data)[0]?.length || 0;
        await saveSession(file.name, rowCount);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to parse file');
    } finally {
      setLoading(false);
    }
  };

  return (
    <aside className="w-72 border-r border-border-subtle bg-surface-dark h-[calc(100vh-64px)] overflow-y-auto flex flex-col p-4 gap-6">
      <section>
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Input Data</h3>
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="group relative border-2 border-dashed border-border-subtle rounded-xl p-6 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-brand hover:bg-brand/5 transition-all"
          id="upload-zone"
        >
          <FileUp className="w-8 h-8 text-slate-500 group-hover:text-brand transition-colors" />
          <p className="text-xs text-center text-slate-400 group-hover:text-slate-300">
            Click or drag CSV/Excel files
          </p>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
            accept=".csv,.tsv,.xlsx,.xls,.txt"
          />
        </div>
      </section>

      {sessions.length > 0 && (
          <section className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Activity className="w-3.5 h-3.5" />
              Recent Analysis
            </h3>
            <div className="space-y-1">
              {sessions.map((session) => (
                <button
                  key={session.id}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-all group border border-transparent hover:border-border-subtle hover:bg-slate-800 ${datasetName === session.datasetName ? 'bg-slate-800 border-border-subtle' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <Database className={`w-3.5 h-3.5 ${datasetName === session.datasetName ? 'text-brand' : 'text-slate-500'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold truncate text-slate-300">{session.datasetName}</p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-tighter">
                        {session.rowCount} nodes collected
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

      <AnimatePresence>
        {datasetName && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-2"
          >
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Active Sheets</h3>
            {Object.keys(sheets).map((name) => (
              <button
                key={name}
                onClick={() => setActiveSheet(name)}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all ${
                  activeSheetName === name 
                    ? 'bg-brand/10 text-brand ring-1 ring-brand/20' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <TableIcon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{name}</span>
                </div>
                {activeSheetName === name && <ChevronRight className="w-4 h-4" />}
              </button>
            ))}
          </motion.section>
        )}
      </AnimatePresence>

      <section className="mt-auto pt-6 border-t border-border-subtle space-y-4">
        {user?.subscription !== 'pro' ? (
          <div className="p-4 bg-brand/10 border border-brand/20 rounded-xl space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-brand" />
              <span className="text-xs font-black text-brand uppercase tracking-widest">Upgrade to Pro</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
              Get advanced statistical models and deeper AI analysis for ₹499/mo.
            </p>
            <button 
              onClick={upgradeToPro}
              className="w-full py-2 bg-brand text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-opacity-90 transition-all shadow-lg shadow-brand/20"
            >
              UPGRADE • ₹499
            </button>
          </div>
        ) : (
          <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-black text-purple-400 uppercase tracking-widest">Pro Member</span>
            </div>
            <p className="text-[10px] text-slate-500 font-mono">Subscription Active</p>
          </div>
        )}
        
        <p className="text-[10px] text-slate-600 leading-tight">
          Powered by DataMind AI Engine. Processing is secured by JWT + Firestore.
        </p>
      </section>
    </aside>
  );
}
