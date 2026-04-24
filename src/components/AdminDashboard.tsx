/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { 
  Users, Database, Activity, ShieldCheck, Trash2, 
  Settings, Loader2, ArrowLeft, BarChart2 
} from 'lucide-react';
import { motion } from 'motion/react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

export default function AdminDashboard({ onBack }: { onBack: () => void }) {
  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({ totalUsers: 0, totalSessions: 0 });
  const [loading, setLoading] = useState(true);
  const { token } = useAuthStore();

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const usersRes = await fetch('/api/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const userData = await usersRes.json();
      setUsers(userData);

      const statsRes = await fetch('/api/admin/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const statsData = await statsRes.json();
      
      const proUsers = userData.filter((u: any) => u.subscription === 'pro').length;
      const totalRevenue = proUsers * 499;

      setStats({
        totalUsers: statsData.usersCount,
        totalSessions: statsData.logsCount,
        proUsers,
        revenue: totalRevenue,
        chartData: [
          { name: 'Users', count: statsData.usersCount },
          { name: 'Events', count: statsData.logsCount },
          { name: 'Revenue (₹)', count: totalRevenue / 10 }, // Scale for chart
        ]
      });
    } catch (error) {
      console.error('Failed to fetch admin data', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to delete user');
      setUsers(users.filter(u => u.id !== userId));
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-brand animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-dark p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-lg">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <ShieldCheck className="text-brand" />
                Admin Command Center
              </h1>
              <p className="text-slate-500">System metrics and user management</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-xl border border-border-subtle">
            <Activity className="w-4 h-4 text-brand animate-pulse" />
            <span className="text-sm font-mono text-slate-300 uppercase tracking-tighter">System Online</span>
          </div>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Total Users" value={stats.totalUsers} icon={Users} color="brand" />
          <StatCard title="Pro Members" value={stats.proUsers} icon={ShieldCheck} color="purple" />
          <StatCard title="System Events" value={stats.totalSessions} icon={Activity} color="blue" />
          <StatCard title="Rev (Approx)" value={`₹${stats.revenue}`} icon={Database} color="orange" />
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-surface-lighter border border-border-subtle rounded-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-border-subtle bg-slate-800/50 flex items-center justify-between">
                <h3 className="font-bold flex items-center gap-2 uppercase text-xs tracking-widest text-slate-400">
                  <Users className="w-4 h-4" />
                  User Records
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-900 border-b border-border-subtle text-slate-500 uppercase text-[10px]">
                    <tr>
                      <th className="px-6 py-4">User</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Joined</th>
                      <th className="px-6 py-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {users.map(user => (
                      <tr key={user.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center font-bold text-slate-400">
                              {user.displayName?.[0] || user.email[0]}
                            </div>
                            <div>
                              <p className="font-medium">{user.displayName || 'Unnamed User'}</p>
                              <p className="text-xs text-slate-500 font-mono">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 text-[10px] rounded-full font-bold uppercase tracking-widest ${user.subscription === 'pro' ? 'bg-purple-500/10 text-purple-400' : 'bg-slate-700 text-slate-400'}`}>
                            {user.subscription || 'Free'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-500 font-mono text-xs">
                          {user.createdAt?.seconds ? new Date(user.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-6 py-4">
                          <button 
                            onClick={() => deleteUser(user.id)}
                            className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="space-y-6 text-center">
            <div className="bg-surface-lighter border border-border-subtle p-6 rounded-2xl h-full">
              <h3 className="font-bold flex items-center justify-center gap-2 uppercase text-xs tracking-widest text-slate-400 mb-8">
                <BarChart2 className="w-4 h-4" />
                Growth Overview
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.chartData}>
                    <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{fill: 'transparent'}} contentStyle={{backgroundColor: '#0f172a', border: 'none', borderRadius: '12px'}} />
                    <Bar dataKey="count" fill="#14B8A6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-slate-500 mt-6 leading-relaxed">
                Aggregated system health metrics showing total database objects and authenticated identities.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }: any) {
  const colors: any = {
    brand: 'bg-brand/10 text-brand border-brand/20',
    blue: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    purple: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    orange: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  };
  return (
    <div className={`p-6 rounded-2xl border ${colors[color]} bg-slate-900/40 backdrop-blur-sm shadow-xl`}>
      <Icon className="w-6 h-6 mb-4" />
      <h4 className="text-xs font-bold uppercase tracking-widest opacity-70 mb-1">{title}</h4>
      <p className="text-3xl font-black">{value}</p>
    </div>
  );
}
