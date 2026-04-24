/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Database, Download, FileText, User as UserIcon } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useDataStore } from '../store/useDataStore';

export default function Navbar() {
  const { user, logout } = useAuthStore();
  const { datasetName } = useDataStore();

  const handleExportPDF = () => {
    // Dispatch custom event for App to handle PDF export
    const event = new CustomEvent('export-pdf');
    window.dispatchEvent(event);
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
            <span className="text-[10px] text-brand font-mono uppercase tracking-widest block -mt-1">{datasetName}</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        {datasetName && (
          <button 
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-200 border border-border-subtle rounded-lg text-xs font-bold hover:bg-slate-700 transition-colors shadow-sm"
          >
            <FileText className="w-3.5 h-3.5" />
            Export Insight Report
          </button>
        )}

        {user && (
          <div className="flex items-center gap-3 pl-4 border-l border-border-subtle">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold truncate max-w-[120px]">{user.name || user.email?.split('@')[0]}</p>
              <button 
                onClick={logout}
                className="text-[10px] text-slate-500 hover:text-red-400 font-bold uppercase transition-colors"
                id="logout-btn"
              >
                Sign Out
              </button>
            </div>
            <div className="w-9 h-9 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center overflow-hidden">
               <UserIcon className="w-5 h-5 text-brand" />
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
