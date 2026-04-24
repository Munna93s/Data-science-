/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { useDataStore } from '../store/useDataStore';
import alasql from 'alasql';
import { Play, Terminal, AlertCircle, Copy, Check } from 'lucide-react';

export default function SQLEngine() {
  const { sheets, activeSheetName } = useDataStore();
  const [query, setQuery] = useState('SELECT * FROM data LIMIT 10');
  const [result, setResult] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const runQuery = () => {
    if (!activeSheetName) return;
    
    try {
      setError(null);
      const data = sheets[activeSheetName];
      // AlaSQL can take a list of objects as a table named 'data'
      const res = alasql(query, [data]) as any[];
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'SQL Execution Error');
      setResult([]);
    }
  };

  const copyResult = () => {
    navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!activeSheetName) return null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">SQL Query Engine</h2>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500 uppercase font-mono px-2 py-0.5 bg-slate-800 rounded ring-1 ring-border-subtle">
            Table Name: <span className="text-brand">data</span>
          </span>
        </div>
      </div>

      <div className="flex flex-col border border-border-subtle rounded-xl overflow-hidden bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-border-subtle">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-mono">
            <Terminal className="w-3 h-3" />
            query_editor.sql
          </div>
          <button 
            onClick={runQuery}
            className="flex items-center gap-2 px-3 py-1 bg-brand text-white rounded text-xs font-bold hover:bg-opacity-90 transition-all"
            id="run-sql-btn"
          >
            <Play className="w-3 h-3 fill-current" />
            Run Query
          </button>
        </div>
        
        <textarea 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          spellCheck={false}
          className="w-full h-32 bg-slate-900 p-4 text-brand font-mono text-sm outline-none resize-none placeholder:text-slate-700"
        />

        {error && (
          <div className="p-4 bg-red-500/10 border-t border-red-500/20 text-red-500 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        <div className="border-t border-border-subtle">
          <div className="px-4 py-2 bg-slate-800 flex items-center justify-between">
             <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Query Result</span>
             {result.length > 0 && (
               <button 
                onClick={copyResult}
                className="text-slate-500 hover:text-white transition-colors"
                title="Copy as JSON"
               >
                 {copied ? <Check className="w-4 h-4 text-brand" /> : <Copy className="w-4 h-4" />}
               </button>
             )}
          </div>
          <div className="max-h-[300px] overflow-auto p-0">
            {result.length > 0 ? (
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-900 border-b border-border-subtle">
                  <tr>
                    {Object.keys(result[0]).map(k => (
                      <th key={k} className="px-4 py-2 font-mono text-slate-500 uppercase">{k}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.map((row, i) => (
                    <tr key={i} className="border-b border-border-subtle/30 last:border-0 hover:bg-slate-800/50 transition-colors">
                      {Object.values(row).map((v: any, j) => (
                        <td key={j} className="px-4 py-2 text-slate-300 font-mono italic">{String(v)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-12 text-center text-slate-600 text-xs italic">
                {error ? 'Fix the query to see results' : 'No results yet. Run a query above.'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
