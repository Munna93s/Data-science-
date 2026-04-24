/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { computeStats } from '../lib/dataUtils';
import { useDataStore } from '../store/useDataStore';
import { Hash, Type, AlertCircle, TrendingUp, BarChart } from 'lucide-react';

export default function StatsPanel() {
  const { sheets, activeSheetName } = useDataStore();
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    if (activeSheetName && sheets[activeSheetName]) {
      setStats(computeStats(sheets[activeSheetName]));
    }
  }, [activeSheetName, sheets]);

  if (!stats) return null;

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-bold">Automated Statistics</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(stats).map(([col, data]: [string, any]) => (
          <div key={col} className="bg-surface-lighter border border-border-subtle p-4 rounded-xl shadow-sm hover:border-brand/40 transition-colors">
            <div className="flex items-center gap-2 mb-3">
              {data.type === 'numeric' ? <Hash className="w-4 h-4 text-brand" /> : <Type className="w-4 h-4 text-blue-400" />}
              <span className="font-semibold text-sm truncate">{col}</span>
            </div>
            
            <div className="space-y-2">
              {data.type === 'numeric' ? (
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="text-slate-500">Mean: <span className="text-white font-mono">{data.mean.toFixed(2)}</span></div>
                  <div className="text-slate-500">Median: <span className="text-white font-mono">{data.median}</span></div>
                  <div className="text-slate-500">Min: <span className="text-white font-mono">{data.min}</span></div>
                  <div className="text-slate-500">Max: <span className="text-white font-mono">{data.max}</span></div>
                </div>
              ) : (
                <div className="text-[11px] space-y-1">
                  <div className="text-slate-500 flex items-center justify-between">
                    Unique Values: <span className="text-white font-mono bg-blue-500/10 px-1 rounded">{data.unique}</span>
                  </div>
                  <div className="text-slate-500 truncate">
                    Most Frequent: <span className="text-white font-medium">{data.mostFrequent}</span>
                  </div>
                </div>
              )}
              
              <div className="pt-2 mt-2 border-t border-border-subtle/30 flex justify-between items-center text-[10px]">
                <span className="text-slate-500">Missing: {data.missing}</span>
                <span className="text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded uppercase">{data.type}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
