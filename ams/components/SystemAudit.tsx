
import React, { useMemo, useState, useEffect } from 'react';
import { AttendanceRecord, UserProfile, Student } from '../types';
import { 
  ShieldCheck, Activity, Wifi, Fingerprint, Clock, 
  ExternalLink, Signal, Users, History, Globe, 
  Database, Zap, Lock, Terminal, Cpu, HardDrive,
  UserCheck, ShieldAlert, Monitor
} from 'lucide-react';

interface SystemAuditProps {
  admin: UserProfile;
  records: AttendanceRecord[];
  students: Student[];
  allUsers: UserProfile[];
}

export const SystemAudit: React.FC<SystemAuditProps> = ({ admin, records, students, allUsers }) => {
  const [activeTab, setActiveTab] = useState<'live' | 'history' | 'flux'>('live');
  const [now, setNow] = useState(Date.now());

  // Update a local timer to refresh "Time Ago" or "Online" status every 10 seconds
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  const activeSessions = useMemo(() => {
    return records.filter(r => r.is_active === true);
  }, [records]);

  // Determine who is "Currently Online" (active in last 3 mins)
  const onlineUsers = useMemo(() => {
    const threeMinsAgo = now - 180000;
    return allUsers.filter(u => u.last_active_at && new Date(u.last_active_at).getTime() > threeMinsAgo);
  }, [allUsers, now]);

  const sortedHistory = useMemo(() => {
    return [...allUsers].sort((a, b) => {
      const dateA = a.last_login ? new Date(a.last_login).getTime() : 0;
      const dateB = b.last_login ? new Date(b.last_login).getTime() : 0;
      return dateB - dateA;
    });
  }, [allUsers]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'No Record';
    const d = new Date(dateStr);
    return d.toLocaleString('en-GB', { 
      day: '2-digit', 
      month: 'short', 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="bg-slate-950 rounded-[2.5rem] shadow-[0_0_60px_rgba(0,0,0,0.6)] border border-slate-800/80 p-8 overflow-hidden relative group animate-in fade-in slide-in-from-top-6 duration-700 transition-all">
      {/* Background Ambience */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#6366f1 1.5px, transparent 1.5px)', backgroundSize: '24px 24px' }}></div>
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      
      {/* Header with Live Stats */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8 mb-10 relative z-10">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center shadow-2xl group-hover:rotate-12 transition-all duration-500">
             <ShieldCheck className="w-8 h-8 text-indigo-400" />
          </div>
          <div>
            <h3 className="font-display font-bold text-3xl text-white tracking-tight uppercase">
               Mission Control Audit
            </h3>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2">
                <Cpu className="w-3 h-3 text-emerald-500" /> Kernel Active
              </span>
              <div className="h-1 w-24 bg-slate-900 rounded-full overflow-hidden">
                 <div className="h-full bg-indigo-500/40 w-full animate-[shimmer_2s_infinite]"></div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full xl:w-auto">
           <AuditPill icon={<Monitor className="w-3.5 h-3.5" />} label="Live Nodes" value={onlineUsers.length.toString()} color="emerald" />
           <AuditPill icon={<Zap className="w-3.5 h-3.5" />} label="Active QR" value={activeSessions.length.toString()} color="indigo" />
           <AuditPill icon={<Database className="w-3.5 h-3.5" />} label="Total Reg" value={allUsers.length.toString()} color="slate" />
           <AuditPill icon={<ShieldAlert className="w-3.5 h-3.5" />} label="Access" value="ADMIN" color="amber" />
        </div>
      </div>

      {/* Internal Navigation Tabs */}
      <div className="flex bg-slate-900/60 p-1.5 rounded-2xl border border-slate-800/50 w-fit mb-8 relative z-10 backdrop-blur-xl">
        <button 
          onClick={() => setActiveTab('live')}
          className={`px-6 py-3 rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] transition-all flex items-center gap-2.5 ${activeTab === 'live' ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-500 hover:text-slate-300'}`}
        >
          <UserCheck className="w-4 h-4" /> Live Nodes
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={`px-6 py-3 rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] transition-all flex items-center gap-2.5 ${activeTab === 'history' ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-500 hover:text-slate-300'}`}
        >
          <History className="w-4 h-4" /> Auth History
        </button>
        <button 
          onClick={() => setActiveTab('flux')}
          className={`px-6 py-3 rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] transition-all flex items-center gap-2.5 ${activeTab === 'flux' ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-500 hover:text-slate-300'}`}
        >
          <Activity className="w-4 h-4" /> Protocol Flux
        </button>
      </div>

      {/* Main Table Container */}
      <div className="relative z-10 min-h-[420px] animate-in fade-in duration-500">
        {activeTab === 'live' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.25em] border-b border-slate-800/50">
                <tr>
                  <th className="px-4 py-5">Node Identity</th>
                  <th className="px-4 py-5">Access Profile</th>
                  <th className="px-4 py-5">Session Duration</th>
                  <th className="px-4 py-5 text-right">Heartbeat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/30">
                {onlineUsers.length > 0 ? onlineUsers.map(user => (
                  <tr key={user.id} className="group hover:bg-emerald-500/5 transition-all">
                    <td className="px-4 py-6">
                      <div className="flex items-center gap-4">
                         <div className="relative">
                            <div className="w-3 h-3 bg-emerald-500 rounded-full animate-ping absolute inset-0 opacity-40"></div>
                            <div className="w-3 h-3 bg-emerald-500 rounded-full relative shadow-[0_0_15px_rgba(16,185,129,0.4)]"></div>
                         </div>
                         <div>
                            <div className="text-sm font-bold text-slate-100">{user.full_name}</div>
                            <div className="text-[9px] font-mono text-slate-500 uppercase">{user.email}</div>
                         </div>
                      </div>
                    </td>
                    <td className="px-4 py-6">
                       <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest border ${
                         user.role === 'admin' ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' :
                         user.role === 'faculty' ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' :
                         'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                       }`}>
                         {user.role}
                       </span>
                    </td>
                    <td className="px-4 py-6">
                       <div className="text-xs font-mono text-slate-400 tracking-tighter">
                          Live Active
                       </div>
                    </td>
                    <td className="px-4 py-6 text-right">
                       <div className="text-[10px] font-mono font-bold text-emerald-500 uppercase">Synchronized</div>
                       <div className="text-[8px] font-bold text-slate-700 uppercase mt-0.5 tracking-tighter">Real-time Node</div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className="py-28 text-center text-slate-600">
                       <p className="text-[11px] font-bold uppercase tracking-[0.4em]">All Nodes are Currently Offline</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.25em] border-b border-slate-800/50">
                <tr>
                  <th className="px-4 py-5">Institutional Profile</th>
                  <th className="px-4 py-5">System Role</th>
                  <th className="px-4 py-5">Verification Timestamp</th>
                  <th className="px-4 py-5 text-right">Protocol History</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/30">
                {sortedHistory.map(user => (
                  <tr key={user.id} className="group hover:bg-white/5 transition-all">
                    <td className="px-4 py-6">
                      <div className="text-sm font-bold text-slate-200">{user.full_name}</div>
                      <div className="text-[9px] font-mono text-slate-600 uppercase mt-1 tracking-tight">{user.email}</div>
                    </td>
                    <td className="px-4 py-6">
                       <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{user.role}</span>
                    </td>
                    <td className="px-4 py-6">
                       <div className="text-[10px] font-mono font-bold text-slate-300">
                          {formatDate(user.last_login)}
                       </div>
                    </td>
                    <td className="px-4 py-6 text-right">
                       <div className="text-[9px] font-bold text-slate-600 uppercase italic">Secured Login</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'flux' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.25em] border-b border-slate-800/50">
                <tr>
                  <th className="px-4 py-5">Broadcasting Node</th>
                  <th className="px-4 py-5">Lecture Hash</th>
                  <th className="px-4 py-5 text-center">Flux Volume</th>
                  <th className="px-4 py-5 text-right">Broadcast Sync</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/30">
                {activeSessions.length > 0 ? activeSessions.map(session => (
                  <tr key={session.id} className="group hover:bg-indigo-500/5 transition-all">
                    <td className="px-4 py-6">
                      <div className="flex items-center gap-3">
                         <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-pulse"></div>
                         <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase">SID_{session.id}</span>
                      </div>
                    </td>
                    <td className="px-4 py-6">
                      <div className="text-sm font-bold text-slate-100">{session.lecture_name}</div>
                      <div className="text-[9px] font-mono text-slate-500 mt-1 uppercase">Monitor: {session.faculty_name}</div>
                    </td>
                    <td className="px-4 py-6">
                      <div className="flex flex-col items-center">
                         <div className="text-sm font-mono font-bold text-white">{session.present_count} <span className="text-slate-700 text-[10px]">/ {students.length}</span></div>
                         <div className="w-24 h-1 bg-slate-900 rounded-full mt-2.5 border border-slate-800 overflow-hidden">
                            <div 
                              className="h-full bg-indigo-500 transition-all duration-1000" 
                              style={{ width: `${(session.present_count / students.length) * 100}%` }}
                            ></div>
                         </div>
                      </div>
                    </td>
                    <td className="px-4 py-6 text-right">
                       <div className="text-[10px] font-mono text-slate-500 uppercase">{session.start_time}</div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className="py-28 text-center text-slate-600">
                       <p className="text-[11px] font-bold uppercase tracking-[0.4em]">Zero Active Broadcasts Detected</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Audit Meta Footer */}
      <div className="mt-10 pt-8 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-8 text-[9px] font-bold text-slate-700 uppercase tracking-[0.2em] relative z-10">
         <div className="flex items-center gap-10">
            <div className="flex items-center gap-2.5">
               <Activity className="w-4 h-4 text-indigo-500" />
               Node Latency: <span className="text-slate-400">Verified</span>
            </div>
            <div className="flex items-center gap-2.5">
               <Wifi className="w-4 h-4 text-emerald-500" />
               Channel: <span className="text-slate-400">Admin_Primary</span>
            </div>
         </div>
         <div className="bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl text-slate-500 shadow-inner">
            Mission Control Registry v4.5.1
         </div>
      </div>
    </div>
  );
};

const AuditPill = ({ icon, label, value, color }: { icon: any, label: string, value: string, color: string }) => {
  const colors: any = {
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    indigo: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    slate: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  };

  return (
    <div className={`px-4 py-3 rounded-2xl border flex flex-col items-center justify-center min-w-[100px] backdrop-blur-md transition-transform hover:scale-105 ${colors[color]}`}>
       <div className="mb-1 opacity-70">{icon}</div>
       <div className="text-sm font-display font-bold leading-tight">{value}</div>
       <div className="text-[7px] font-bold uppercase tracking-widest opacity-60 text-center whitespace-nowrap mt-0.5">{label}</div>
    </div>
  );
};
