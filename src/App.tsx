/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import DataPreview from './components/DataPreview';
import StatsPanel from './components/StatsPanel';
import AIChat from './components/AIChat';
import Visualization from './components/Visualization';
import SQLEngine from './components/SQLEngine';
import { useDataStore } from './store/useDataStore';
import { BarChart3, MessageSquare, Database, Table as TableIcon, Activity, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const { datasetName, isLoading, error } = useDataStore();
  const [activeTab, setActiveTab] = useState<'preview' | 'stats' | 'ai' | 'charts' | 'sql'>('preview');

  const tabs = [
    { id: 'preview', label: 'Table View', icon: TableIcon },
    { id: 'stats', label: 'Stats', icon: Activity },
    { id: 'charts', label: 'Visualization', icon: BarChart3 },
    { id: 'ai', label: 'AI Chat', icon: MessageSquare },
    { id: 'sql', label: 'SQL Editor', icon: Database },
  ] as const;

  return (
    <div className="min-h-screen bg-surface-dark font-sans selection:bg-brand/30">
      <Navbar />
      
      <div className="flex">
        <Sidebar />
        
        <main className="flex-1 p-6 overflow-x-hidden">
          {isLoading && (
            <div className="fixed inset-0 bg-surface-dark/80 backdrop-blur-sm z-[60] flex items-center justify-center">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-12 h-12 text-brand animate-spin" />
                <p className="text-brand font-mono text-sm animate-pulse">PROCESSING DATASET...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm flex items-center gap-3">
              <Activity className="w-5 h-5 flex-shrink-0" />
              {error}
            </div>
          )}

          {!datasetName ? (
            <div className="h-[calc(100vh-160px)] flex flex-col items-center justify-center text-center max-w-2xl mx-auto">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-24 h-24 bg-brand/10 border border-brand/20 rounded-3xl flex items-center justify-center mb-8"
              >
                <Database className="w-12 h-12 text-brand" />
              </motion.div>
              <h2 className="text-3xl font-bold mb-4 tracking-tight">Unlock the power of your data.</h2>
              <p className="text-slate-400 mb-8 leading-relaxed">
                Upload your CSV or Excel files to get instant insights, professional statistics, and AI-powered analysis. 
                DataMind AI processes everything in your browser for maximum privacy.
              </p>
              <div className="flex gap-4">
                <div className="px-6 py-4 bg-surface-lighter border border-border-subtle rounded-2xl flex flex-col items-center gap-2 w-40">
                  <span className="text-2xl font-bold">100%</span>
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest">Privacy</span>
                </div>
                <div className="px-6 py-4 bg-surface-lighter border border-border-subtle rounded-2xl flex flex-col items-center gap-2 w-40">
                  <span className="text-2xl font-bold">Inst.</span>
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest">Insights</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-6 max-w-7xl mx-auto">
              <div className="flex items-center gap-1 bg-surface-lighter p-1 rounded-xl border border-border-subtle w-fit self-start mb-2">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      activeTab === tab.id 
                        ? 'bg-brand text-white shadow-lg shadow-brand/20' 
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                    id={`main-tab-${tab.id}`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  {activeTab === 'preview' && <DataPreview />}
                  {activeTab === 'stats' && <StatsPanel />}
                  {activeTab === 'charts' && <Visualization />}
                  {activeTab === 'ai' && <AIChat />}
                  {activeTab === 'sql' && <SQLEngine />}
                </motion.div>
              </AnimatePresence>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
