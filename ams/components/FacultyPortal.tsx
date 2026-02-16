
import React, { useState, useMemo } from 'react';
import { AttendanceRecord, Lecture, UserProfile, Student } from '../types';
import { RecordsTable } from './RecordsTable';
import { 
  BookOpen, TrendingUp, BarChart3, Search, Calendar, 
  Filter, ClipboardList, Download, FileSpreadsheet, Loader2 
} from 'lucide-react';

interface FacultyPortalProps {
  user: UserProfile;
  records: AttendanceRecord[];
  lectures: Lecture[];
  students: Student[];
  onRefresh: () => void;
  onDeleteRecord: (id: number) => void;
  onEditRecord: (r: AttendanceRecord) => void;
  totalClassStrength?: number;
}

export const FacultyPortal: React.FC<FacultyPortalProps> = ({ 
  user, records, lectures, students, onRefresh, onDeleteRecord, onEditRecord, totalClassStrength 
}) => {
  const [dateFilter, setDateFilter] = useState('');
  const [lectureFilter, setLectureFilter] = useState('');

  const safeRecords = records || [];
  const safeLectures = lectures || [];

  const myClasses = useMemo(() => {
    return safeRecords.filter(r => {
      const isMine = (r.created_by === user.id) || (r.faculty_name === user.full_name);
      const matchesDate = dateFilter ? r.date === dateFilter : true;
      const matchesLecture = lectureFilter ? r.lecture_name === lectureFilter : true;
      return isMine && matchesDate && matchesLecture;
    });
  }, [safeRecords, user, dateFilter, lectureFilter]);

  const stats = useMemo(() => {
    const totalSessions = myClasses.length;
    // Calculate total present and total students using the class strength to avoid inflated counts
    const totalPresent = myClasses.reduce((acc, curr) => {
      const rollSet = new Set<number>();
      curr.attendance_details?.forEach(d => {
        if(d.status === 'P') rollSet.add(d.student_roll);
      });
      return acc + (rollSet.size || curr.present_count);
    }, 0);
    
    const totalPossible = totalSessions * (totalClassStrength || 45);
    const avgAttendance = totalPossible > 0 ? Math.round((totalPresent / totalPossible) * 100) : 0;
    
    return { totalSessions, totalPresent, avgAttendance };
  }, [myClasses, totalClassStrength]);

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      {/* KPI Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-indigo-600 text-white rounded-[2rem] p-8 shadow-xl shadow-indigo-100 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16 group-hover:bg-white/20 transition-all duration-700"></div>
          <BookOpen className="w-8 h-8 text-indigo-300 mb-6" />
          <div className="text-4xl font-display font-bold tracking-tight">{stats.totalSessions}</div>
          <div className="text-[10px] font-bold text-indigo-200 uppercase tracking-[0.2em] mt-2">Classes Conducted</div>
        </div>
        
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
          <TrendingUp className="w-8 h-8 text-emerald-500 mb-6" />
          <div className="text-4xl font-display font-bold text-slate-900 dark:text-slate-100 tracking-tight">{stats.avgAttendance}%</div>
          <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mt-2">Avg. Session Presence</div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
          <BarChart3 className="w-8 h-8 text-indigo-500 mb-6" />
          <div className="text-4xl font-display font-bold text-slate-900 dark:text-slate-100 tracking-tight">{stats.totalPresent}</div>
          <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mt-2">Total Student Logs</div>
        </div>
      </div>

      {/* Records Section */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          <div>
            <h3 className="font-display font-bold text-2xl text-slate-900 dark:text-slate-100 tracking-tight uppercase flex items-center gap-3">
              <ClipboardList className="w-6 h-6 text-indigo-500" />
              Instructional Registry
            </h3>
            <p className="text-sm text-slate-400 dark:text-slate-500 font-medium">Filtered history of your academic sessions</p>
          </div>
          
          <div className="flex flex-wrap gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:flex-none">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
              <input 
                type="date" 
                value={dateFilter} 
                onChange={e => setDateFilter(e.target.value)} 
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-100 transition-all" 
              />
            </div>
            
            <div className="relative flex-1 md:flex-none">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
              <select 
                value={lectureFilter} 
                onChange={e => setLectureFilter(e.target.value)} 
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl pl-9 pr-8 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 outline-none focus:ring-2 focus:ring-indigo-100 transition-all appearance-none"
              >
                <option value="">All Lectures</option>
                {safeLectures.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
              </select>
            </div>

            <button className="p-2.5 bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-100 dark:border-slate-800 rounded-xl transition-all" title="Export Current View">
              <FileSpreadsheet className="w-5 h-5" />
            </button>
          </div>
        </div>

        <RecordsTable 
          records={myClasses} 
          students={students || []} 
          userRole={user.role} 
          userRoll={user.roll_no} 
          onDelete={onDeleteRecord} 
          onEdit={onEditRecord} 
          totalClassStrength={totalClassStrength}
        />
      </div>
    </div>
  );
};
