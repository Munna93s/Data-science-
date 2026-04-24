/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { useDataStore } from '../store/useDataStore';
import { 
  BarChart as ReBarChart, Bar, LineChart as ReLineChart, Line, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell 
} from 'recharts';
import { BarChart, LineChart, PieChart as PieIcon, Settings2 } from 'lucide-react';

const COLORS = ['#14B8A6', '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981'];

export default function Visualization() {
  const { sheets, activeSheetName, columns } = useDataStore();
  const [chartType, setChartType] = useState<'bar' | 'line' | 'pie'>('bar');
  const [xAxis, setXAxis] = useState<string>('');
  const [yAxis, setYAxis] = useState<string>('');

  const data = activeSheetName ? sheets[activeSheetName] : [];

  useEffect(() => {
    if (columns.length >= 2) {
      if (!xAxis || !columns.includes(xAxis)) setXAxis(columns[0]);
      if (!yAxis || !columns.includes(yAxis)) setYAxis(columns[1]);
    }
  }, [columns]);

  if (!data || data.length === 0) return null;

  const chartData = data.slice(0, 20); // Top 20 for visibility

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Visual Analytics</h2>
        <div className="flex bg-slate-800 rounded-lg p-1 gap-1">
          <button 
            onClick={() => setChartType('bar')}
            className={`p-1.5 rounded ${chartType === 'bar' ? 'bg-brand text-white' : 'text-slate-400 hover:text-white'}`}
          >
            <BarChart className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setChartType('line')}
            className={`p-1.5 rounded ${chartType === 'line' ? 'bg-brand text-white' : 'text-slate-400 hover:text-white'}`}
          >
            <LineChart className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setChartType('pie')}
            className={`p-1.5 rounded ${chartType === 'pie' ? 'bg-brand text-white' : 'text-slate-400 hover:text-white'}`}
          >
            <PieIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 bg-surface-lighter p-4 rounded-xl border border-border-subtle h-fit space-y-4">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <Settings2 className="w-3 h-3" />
            Chart Config
          </div>
          
          <div>
            <label className="text-xs text-slate-500 block mb-1">X-Axis (Category)</label>
            <select 
              value={xAxis} 
              onChange={(e) => setXAxis(e.target.value)}
              className="w-full bg-slate-800 border border-border-subtle rounded-md px-2 py-1.5 text-xs outline-none focus:border-brand"
            >
              {columns.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-500 block mb-1">Y-Axis (Value)</label>
            <select 
              value={yAxis} 
              onChange={(e) => setYAxis(e.target.value)}
              className="w-full bg-slate-800 border border-border-subtle rounded-md px-2 py-1.5 text-xs outline-none focus:border-brand"
            >
              {columns.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="lg:col-span-3 bg-surface-lighter p-6 rounded-xl border border-border-subtle min-h-[400px]">
          <ResponsiveContainer width="100%" height={400}>
            {chartType === 'bar' ? (
              <ReBarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey={xAxis} stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: '8px' }}
                  itemStyle={{ color: '#14B8A6' }}
                />
                <Legend />
                <Bar dataKey={yAxis} fill="#14B8A6" radius={[4, 4, 0, 0]} />
              </ReBarChart>
            ) : chartType === 'line' ? (
              <ReLineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey={xAxis} stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: '8px' }}
                />
                <Legend />
                <Line type="monotone" dataKey={yAxis} stroke="#14B8A6" strokeWidth={2} dot={{ fill: '#14B8A6', r: 4 }} activeDot={{ r: 6 }} />
              </ReLineChart>
            ) : (
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey={yAxis}
                  nameKey={xAxis}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: '8px' }}
                />
                <Legend />
              </PieChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
