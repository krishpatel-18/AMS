
import React from 'react';
import { AttendanceRecord, Student, Faculty } from '../types';
import { PANEL_KEYS } from '../constants';

interface AttendanceReportsProps {
  records: AttendanceRecord[];
  students: Student[];
  faculty: Faculty[];
  hiddenPanels: Record<string, boolean>;
  userRole: string;
}

export const AttendanceReports: React.FC<AttendanceReportsProps> = ({
  records, students, hiddenPanels, userRole
}) => {
  const safeStudents = students || [];
  const safeRecords = records || [];
  
  // Calculate stats per student
  const studentStats = React.useMemo(() => {
    const stats: Record<number, { present: number, absent: number }> = {};
    safeStudents.forEach(s => stats[s.roll_no] = { present: 0, absent: 0 });
    
    safeRecords.forEach(r => {
      r.attendance_details?.forEach(d => {
        if (!stats[d.student_roll]) stats[d.student_roll] = { present: 0, absent: 0 };
        if (d.status === 'P') stats[d.student_roll].present++;
        else stats[d.student_roll].absent++;
      });
    });
    return stats;
  }, [safeRecords, safeStudents]);

  // Daily percentages for heatbar
  const dailyStats = React.useMemo(() => {
    const daily: { date: string, pct: number }[] = [];
    const grouped: Record<string, { present: number, total: number }> = {};
    
    safeRecords.forEach(r => {
      if (!grouped[r.date]) {
        grouped[r.date] = { present: 0, total: 0 };
      }
      grouped[r.date].present += r.present_count;
      grouped[r.date].total += r.total_count;
    });

    Object.entries(grouped).forEach(([date, val]) => {
      const pct = val.total ? Math.round((val.present / val.total) * 100) : 0;
      daily.push({ date, pct });
    });
    
    return daily.sort((a,b) => b.date.localeCompare(a.date)).slice(0, 7); // Last 7 days
  }, [safeRecords]);

  // Logic: "show this table to admin only Student Summary"
  const showSummary = userRole === 'admin';
  
  // Logic: "show Recent Performance table to admin student and faculty"
  const showHeatbar = true; // Enabled for all as per request

  return (
    <div className="space-y-6">
      {showSummary && (
        <div className={`bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 p-8 ${hiddenPanels[PANEL_KEYS.REGULAR_SUMMARY] ? 'opacity-60 grayscale' : ''}`}>
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-display font-bold text-slate-800 dark:text-slate-100 uppercase tracking-tight">Student Summary</h3>
            <span className="text-[10px] font-bold text-indigo-500 uppercase bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded">Admin Only Access</span>
          </div>
          <div className="max-h-[350px] overflow-auto rounded-xl border border-slate-50 dark:border-slate-800">
            <table className="w-full text-sm">
               <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0 text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-widest z-10">
                 <tr>
                   <th className="px-6 py-4 text-left">Roll</th>
                   <th className="px-6 py-4 text-left">Name</th>
                   <th className="px-6 py-4 text-right">Pres</th>
                   <th className="px-6 py-4 text-right">%</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-50 dark:divide-slate-800 transition-colors">
                 {safeStudents.map(s => {
                   const st = studentStats[s.roll_no] || { present: 0, absent: 0 };
                   const total = st.present + st.absent;
                   const pct = total ? Math.round((st.present / total) * 100) : 0;
                   return (
                     <tr key={s.roll_no} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                       <td className="px-6 py-4 font-display font-bold text-slate-500 dark:text-slate-400">{s.roll_no}</td>
                       <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-200">{s.name}</td>
                       <td className="px-6 py-4 text-right font-bold text-emerald-600 dark:text-emerald-400">{st.present}</td>
                       <td className="px-6 py-4 text-right">
                         <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold tracking-tight 
                           ${pct >= 75 ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 
                             pct >= 50 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' : 
                             'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400'}`}>
                           {pct}%
                         </span>
                       </td>
                     </tr>
                   );
                 })}
               </tbody>
            </table>
          </div>
        </div>
      )}

      {showHeatbar && (
        <div className={`bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 p-8 ${hiddenPanels[PANEL_KEYS.HEATBAR] ? 'opacity-60 grayscale' : ''}`}>
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-display font-bold text-slate-800 dark:text-slate-100 uppercase tracking-tight">Recent Performance</h3>
            <TrendingUp className="w-5 h-5 text-indigo-500" />
          </div>
          <div className="space-y-4">
            {dailyStats.map(d => (
              <div key={d.date} className="group">
                 <div className="flex justify-between items-center mb-1.5 px-1">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{d.date}</span>
                    <span className="text-[10px] font-bold text-slate-900 dark:text-slate-100">{d.pct}%</span>
                 </div>
                 <div className="h-2 bg-slate-50 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-100/50 dark:border-slate-700/50">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ${
                        d.pct > 80 ? 'bg-emerald-500' : d.pct > 50 ? 'bg-indigo-500' : 'bg-rose-500'
                      }`}
                      style={{ width: `${d.pct}%` }} 
                    />
                 </div>
              </div>
            ))}
            {dailyStats.length === 0 && (
              <div className="text-center py-8 text-[10px] font-bold text-slate-300 dark:text-slate-700 uppercase tracking-widest">
                Aggregating Class Performance Data...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Helper for UI icons
const TrendingUp = ({ className }: { className: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
);
