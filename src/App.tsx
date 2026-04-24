/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import DataPreview from './components/DataPreview';
import StatsPanel from './components/StatsPanel';
import AIChat from './components/AIChat';
import Visualization from './components/Visualization';
import SQLEngine from './components/SQLEngine';
import AdminDashboard from './components/AdminDashboard';
import AuthPage from './pages/AuthPage';
import { useDataStore } from './store/useDataStore';
import { useAuthStore } from './store/useAuthStore';
import { BarChart3, MessageSquare, Database, Table as TableIcon, Activity, Loader2, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const { user, isLoading: authLoading, verifySession } = useAuthStore();
  const [showAdmin, setShowAdmin] = useState(false);
  const { datasetName, isLoading, error } = useDataStore();
  const [activeTab, setActiveTab] = useState<'preview' | 'stats' | 'ai' | 'charts' | 'sql'>('preview');

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    verifySession();
  }, [verifySession]);

  useEffect(() => {
    const handleExport = async () => {
      if (!datasetName) return;

      const { default: jsPDF } = await import('jspdf');
      const { default: html2canvas } = await import('html2canvas');

      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Select the main area to capture
      const mainArea = document.querySelector('main');
      if (!mainArea) return;

      setLoadingData(true);
      try {
        const canvas = await html2canvas(mainArea, {
          backgroundColor: '#0F172A',
          scale: 2
        });
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = pageWidth - 20;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        doc.setFontSize(22);
        doc.setTextColor(20, 184, 166);
        doc.text('DATAMIND AI: Insight Report', 10, 20);
        
        doc.setFontSize(10);
        doc.setTextColor(148, 163, 184);
        doc.text(`Dataset: ${datasetName} | Date: ${new Date().toLocaleString()}`, 10, 30);
        
        doc.addImage(imgData, 'PNG', 10, 40, imgWidth, imgHeight);
        doc.save(`${datasetName}_analysis_report.pdf`);
      } catch (err) {
        console.error('PDF export failed', err);
      } finally {
        setLoadingData(false);
      }
    };

    window.addEventListener('export-pdf', handleExport);
    return () => window.removeEventListener('export-pdf', handleExport);
  }, [datasetName]);

  const [loadingData, setLoadingData] = useState(false);

  if (authLoading || loadingData) {
    return (
      <div className="h-screen bg-surface-dark flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-brand animate-spin" />
          {loadingData && <p className="text-brand font-mono text-xs animate-pulse tracking-widest text-center">GENERATING CRYPTOGRAPHIC REPORT...<br/>PREPARING PDF ELEMENTS</p>}
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  if (showAdmin && isAdmin) {
    return <AdminDashboard onBack={() => setShowAdmin(false)} />;
  }

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
        
        <main className="flex-1 p-6 overflow-x-hidden relative">
          {isAdmin && (
            <button 
              onClick={() => setShowAdmin(true)}
              className="absolute top-6 right-6 flex items-center gap-2 px-3 py-1.5 bg-slate-800 border border-border-subtle rounded-lg text-xs font-bold hover:border-brand transition-all z-40"
              id="admin-entry-btn"
            >
              <Shield className="w-3.5 h-3.5 text-brand" />
              Admin Panel
            </button>
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
