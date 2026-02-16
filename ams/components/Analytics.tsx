
import React, { useMemo } from 'react';
import { AttendanceRecord, Student } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Trophy } from 'lucide-react';

interface AnalyticsProps {
  records: AttendanceRecord[];
  students: Student[];
  date: string;
}

export const Analytics: React.FC<AnalyticsProps> = ({ records, students, date }) => {
  // Pie Data (Today's Attendance)
  const pieData = useMemo(() => {
    const todays = records.filter(r => r.date === date);
    const presentRolls = new Set<number>();
    todays.forEach(r => {
      r.attendance_details?.forEach(d => {
        if (d.status === 'P') presentRolls.add(d.student_roll);
      });
    });
    const present = presentRolls.size;
    const absent = Math.max(0, students.length - present);
    return [
      { name: 'Present', value: present, color: '#10b981' },
      { name: 'Absent', value: absent, color: '#f43f5e' }
    ];
  }, [records, students, date]);

  // Leaderboard Data
  const leaderboard = useMemo(() => {
    const stats: Record<number, { name: string, pct: number }> = {};
    students.forEach(s => stats[s.roll_no] = { name: s.name, pct: 0 });
    
    // Calculate totals
    const counts: Record<number, {p:number, t:number}> = {};
    records.forEach(r => {
      r.attendance_details?.forEach(d => {
        if(!counts[d.student_roll]) counts[d.student_roll] = {p:0, t:0};
        counts[d.student_roll].t++;
        if(d.status === 'P') counts[d.student_roll].p++;
      });
    });

    Object.keys(counts).forEach(key => {
      const roll = parseInt(key);
      if(stats[roll]) {
        stats[roll].pct = counts[roll].t ? (counts[roll].p / counts[roll].t) * 100 : 0;
      }
    });

    return Object.entries(stats)
      .map(([roll, val]) => ({ roll: Number(roll), ...val }))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 5); // Top 5
  }, [records, students]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 p-6">
      <h3 className="font-display font-bold text-slate-800 dark:text-slate-100 uppercase tracking-tight mb-4">Analytics</h3>
      
      <div className="h-[220px] w-full mb-6">
        <p className="text-center text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Daily Presence ({date})</p>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
            <Legend verticalAlign="bottom" height={36}/>
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="border-t border-slate-50 dark:border-slate-800 pt-6">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-4 h-4 text-amber-500" />
          <h4 className="font-display font-bold text-xs text-slate-700 dark:text-slate-300 uppercase tracking-widest">Top Regulars</h4>
        </div>
        <div className="space-y-2">
          {leaderboard.map((s, idx) => (
            <div key={s.roll} className="flex justify-between items-center text-xs bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/50">
              <div className="flex items-center gap-3">
                 <span className={`w-6 h-6 flex items-center justify-center rounded-lg font-display font-bold text-[10px] 
                   ${idx === 0 ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                   {idx + 1}
                 </span>
                 <div>
                   <span className="font-bold text-slate-700 dark:text-slate-200">{s.name}</span>
                   <div className="text-[9px] font-mono text-slate-400 dark:text-slate-600">ID #{s.roll}</div>
                 </div>
              </div>
            </div>
          ))}
          {leaderboard.length === 0 && (
            <p className="text-center py-4 text-[10px] font-bold text-slate-300 dark:text-slate-700 uppercase tracking-widest">Awaiting session data...</p>
          )}
        </div>
      </div>
    </div>
  );
};
