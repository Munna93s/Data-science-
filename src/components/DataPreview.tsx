/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useDataStore } from '../store/useDataStore';

export default function DataPreview() {
  const { sheets, activeSheetName } = useDataStore();
  const data = activeSheetName ? sheets[activeSheetName] : [];

  if (!data || data.length === 0) return null;

  const columns = Object.keys(data[0] || {});
  const previewRows = data.slice(0, 50);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Data Preview</h2>
        <span className="text-xs text-slate-500">{data.length} total rows</span>
      </div>
      
      <div className="overflow-x-auto rounded-xl border border-border-subtle bg-slate-900/50 backdrop-blur-sm shadow-2xl">
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr className="bg-slate-800/80 sticky top-0 z-10">
              {columns.map((col) => (
                <th key={col} className="px-4 py-3 font-semibold text-slate-300 border-b border-border-subtle whitespace-nowrap">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {previewRows.map((row, i) => (
              <tr key={i} className="hover:bg-brand/5 border-b border-border-subtle/50 transition-colors">
                {columns.map((col) => (
                  <td key={col} className="px-4 py-2 text-slate-400 font-mono text-xs whitespace-nowrap">
                    {String(row[col] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {data.length > 50 && (
          <div className="p-4 bg-slate-900 text-center text-xs text-slate-500 italic">
            Showing first 50 rows only. Use AI or SQL to analyze full dataset.
          </div>
        )}
      </div>
    </div>
  );
}
