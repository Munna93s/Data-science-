/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FileUp, Table as TableIcon, Database, BookOpen, ChevronRight } from 'lucide-react';
import { useRef } from 'react';
import { parseFile } from '../lib/dataUtils';
import { useDataStore } from '../store/useDataStore';
import { motion, AnimatePresence } from 'motion/react';

export default function Sidebar() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { setDataset, datasetName, sheets, activeSheetName, setActiveSheet, setLoading, setError } = useDataStore();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const data = await parseFile(file);
      setDataset(file.name, data);
    } catch (err: any) {
      setError(err.message || 'Failed to parse file');
    } finally {
      setLoading(false);
    }
  };

  const loadSampleData = () => {
    const sample = [
      { id: 1, name: "Product A", price: 120, stock: 50, category: "Electronics" },
      { id: 2, name: "Product B", price: 80, stock: 30, category: "Apparel" },
      { id: 3, name: "Product C", price: 300, stock: 15, category: "Electronics" },
      { id: 4, name: "Product D", price: 45, stock: 100, category: "Accessories" },
    ];
    setDataset("sample_inventory.csv", { "Inventory": sample });
  };

  return (
    <aside className="w-64 border-r border-border-subtle bg-surface-dark h-[calc(100vh-64px)] overflow-y-auto flex flex-col p-4 gap-6">
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
        
        {!datasetName && (
          <button 
            onClick={loadSampleData}
            className="w-full mt-3 flex items-center justify-center gap-2 text-xs text-brand hover:underline"
            id="sample-data-btn"
          >
            <BookOpen className="w-3 h-3" />
            Load Sample Data
          </button>
        )}
      </section>

      <AnimatePresence>
        {datasetName && (
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-2"
          >
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Sheets</h3>
            {Object.keys(sheets).map((name) => (
              <button
                key={name}
                onClick={() => setActiveSheet(name)}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all ${
                  activeSheetName === name 
                    ? 'bg-brand/10 text-brand ring-1 ring-brand/20' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
                id={`sheet-tab-${name}`}
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

      <section className="mt-auto pt-6 border-t border-border-subtle">
        <div className="flex items-center gap-2 text-slate-500 text-xs mb-4">
          <Database className="w-3 h-3" />
          <span>Storage: Local Session</span>
        </div>
        <p className="text-[10px] text-slate-600 leading-tight">
          Powered by DataMind AI Engine. Raw data is processed locally for your privacy.
        </p>
      </section>
    </aside>
  );
}
