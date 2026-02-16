import React from 'react';
import { AttendanceRecord } from '../types';
import { Users, UserMinus, UserCheck, BookOpen, Clock, Activity } from 'lucide-react';

interface StatsSummaryProps {
  date: string;
  records: AttendanceRecord[];
  studentsCount: number;
}

export const StatsSummary: React.FC<StatsSummaryProps> = ({ date, records, studentsCount }) => {
  const todaysRecords = records.filter(r => r.date === date);
  
  const presentRolls = new Set<number>();
  todaysRecords.forEach(r => {
    r.attendance_details?.forEach(d => {
      if (d.status === 'P') presentRolls.add(d.student_roll);
    });
  });

  const presentCount = presentRolls.size;
  const absentCount = Math.max(0, studentsCount - presentCount);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
         <h3 className="font-display font-bold text-slate-900 dark:text-slate-100 uppercase tracking-tight text-sm">Today's Pulse</h3>
         <div className="px-2 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-md text-[10px] font-bold uppercase animate-pulse">Live Tracker</div>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-500 dark:text-emerald-400 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <UserCheck className="w-5 h-5" />
            </div>
            <Activity className="w-4 h-4 text-emerald-100 dark:text-emerald-900/20" />
          </div>
          <div className="text-3xl font-display font-bold text-slate-900 dark:text-slate-100">{presentCount}</div>
          <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">Present Students</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-rose-50 dark:bg-rose-900/30 text-rose-500 dark:text-rose-400 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <UserMinus className="w-5 h-5" />
            </div>
            <UserMinus className="w-4 h-4 text-rose-100 dark:text-rose-900/20" />
          </div>
          <div className="text-3xl font-display font-bold text-slate-900 dark:text-slate-100">{absentCount}</div>
          <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">Absent Students</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all group col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
               <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 dark:text-indigo-400 rounded-xl flex items-center justify-center">
                 <BookOpen className="w-5 h-5" />
               </div>
               <div>
                  <div className="text-2xl font-display font-bold text-slate-900 dark:text-slate-100">{todaysRecords.length}</div>
                  <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Active Sessions</div>
               </div>
            </div>
            <Clock className="w-6 h-6 text-slate-100 dark:text-slate-800" />
          </div>
        </div>
      </div>
    </div>
  );
};