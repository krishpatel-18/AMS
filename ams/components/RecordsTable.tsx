
import React, { useState, useMemo } from 'react';
import { AttendanceRecord, Student } from '../types';
import { Edit2, Trash2, Eye, AlertTriangle, CheckCircle2, X, ClipboardList } from 'lucide-react';
import { Modal } from './Modal';

interface RecordsTableProps {
  records: AttendanceRecord[];
  students: Student[];
  userRole: string;
  userRoll?: number;
  onDelete: (id: number) => void;
  onEdit: (r: AttendanceRecord) => void;
  totalClassStrength?: number;
}

export const RecordsTable: React.FC<RecordsTableProps> = ({ records, students, userRole, userRoll, onDelete, onEdit, totalClassStrength }) => {
  const [viewRecordId, setViewRecordId] = useState<number | null>(null);
  const [confirmEditRecord, setConfirmEditRecord] = useState<AttendanceRecord | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<AttendanceRecord | null>(null);

  const canEdit = userRole === 'admin' || userRole === 'faculty';
  const canDelete = userRole === 'admin';
  const isStudent = userRole === 'student';

  const safeRecords = records || [];
  const safeStudents = students || [];

  const viewRecord = useMemo(() => {
    return safeRecords.find(r => r.id === viewRecordId) || null;
  }, [safeRecords, viewRecordId]);

  const handleProceedEdit = () => {
    if (confirmEditRecord) {
      onEdit(confirmEditRecord);
      setConfirmEditRecord(null);
    }
  };

  const handleConfirmDelete = () => {
    if (recordToDelete) {
      onDelete(recordToDelete.id);
      setRecordToDelete(null);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr;
  };

  const derivedDetails = useMemo(() => {
    if (!viewRecord) return [];
    
    const statusMap = new Map<number, string>();
    viewRecord.attendance_details?.forEach(d => {
      statusMap.set(Number(d.student_roll), d.status);
    });

    return safeStudents.map(s => {
      const status = statusMap.get(Number(s.roll_no)) || 'A';
      return {
        student_roll: Number(s.roll_no),
        student_name: s.name,
        status: status as 'P' | 'A'
      };
    }).sort((a, b) => a.student_roll - b.student_roll);
  }, [viewRecord, safeStudents]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col max-h-[500px] overflow-hidden transition-colors duration-300">
      <div className="p-6 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-slate-50/30 dark:bg-slate-800/20">
        <div className="flex items-center gap-3">
          <ClipboardList className="w-5 h-5 text-indigo-500" />
          <h3 className="font-display font-bold text-slate-900 dark:text-slate-100 uppercase tracking-tight text-sm">Session History</h3>
        </div>
        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{safeRecords.length} Logs Found</span>
      </div>
      
      <div className="overflow-auto flex-1">
        <table className="w-full text-left">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-widest sticky top-0 z-10 backdrop-blur-md">
            <tr>
              <th className="px-6 py-4">Session Info</th>
              <th className="px-6 py-4">Topic / Faculty</th>
              <th className="px-6 py-4 text-center">Presence</th>
              {isStudent && <th className="px-6 py-4 text-center">My Status</th>}
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
            {safeRecords.map(r => {
              const myDetail = isStudent && userRoll ? r.attendance_details?.find(d => Number(d.student_roll) === Number(userRoll)) : null;
              
              const authoritativeStatus = new Map<number, string>();
              r.attendance_details?.forEach(d => {
                authoritativeStatus.set(Number(d.student_roll), d.status);
              });

              const actualPresentCount = Array.from(authoritativeStatus.values()).filter(s => s === 'P').length;
              const actualTotalCount = totalClassStrength || safeStudents.length || r.total_count;
              const presencePercentage = actualTotalCount > 0 ? (actualPresentCount / actualTotalCount) * 100 : 0;

              return (
                <tr key={r.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-800 dark:text-slate-200 text-xs">{formatDate(r.date)}</div>
                    <div className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-tighter mt-0.5">{r.time_slot || 'Live Session'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate max-w-[180px]" title={r.lecture_name}>{r.lecture_name}</div>
                    <div className="text-[10px] font-medium text-slate-400 dark:text-slate-500 mt-0.5">{r.faculty_name}</div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex flex-col items-center">
                      <span className="bg-indigo-50 dark:bg-indigo-900/30 px-2.5 py-1 rounded-lg font-mono font-bold text-indigo-600 dark:text-indigo-400 text-[10px]">
                        {actualPresentCount}/{actualTotalCount}
                      </span>
                      <div className="w-12 h-1 bg-slate-100 dark:bg-slate-800 rounded-full mt-1.5 overflow-hidden">
                         <div className="h-full bg-indigo-400 dark:bg-indigo-500" style={{ width: `${Math.min(100, presencePercentage)}%` }}></div>
                      </div>
                    </div>
                  </td>
                  {isStudent && (
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-tight ${
                        myDetail?.status === 'P' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400'
                      }`}>
                        {myDetail?.status === 'P' ? 'Present' : 'Absent'}
                        <div className={`w-1 h-1 rounded-full ${myDetail?.status === 'P' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                      </span>
                    </td>
                  )}
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => setViewRecordId(r.id)} 
                        className="p-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-indigo-500 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-all shadow-sm"
                        title="View Full Registry"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {canEdit && (
                        <button onClick={() => setConfirmEditRecord(r)} className="p-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-amber-500 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-xl transition-all shadow-sm" title="Modify Record">
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                      {canDelete && (
                        <button onClick={() => setRecordToDelete(r)} className="p-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-xl transition-all shadow-sm" title="Delete Permanently">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {safeRecords.length === 0 && (
              <tr>
                <td colSpan={isStudent ? 5 : 4} className="text-center py-20 text-slate-300 dark:text-slate-700">
                  <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                    <ClipboardList className="w-6 h-6 text-slate-200 dark:text-slate-700" />
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em]">No logs found in this registry</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {viewRecord && (
        <Modal isOpen={true} onClose={() => setViewRecordId(null)} title="Session Audit">
          <div className="bg-slate-900 dark:bg-black p-8 text-white relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-xl"></div>
             <div className="relative z-10">
                <div className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-1">{formatDate(viewRecord.date)}</div>
                <h2 className="text-2xl font-display font-bold uppercase tracking-tight">{viewRecord.lecture_name}</h2>
                <p className="text-sm text-white/70 mt-1 font-medium">Faculty: {viewRecord.faculty_name}</p>
             </div>
             <div className="mt-8 grid grid-cols-2 gap-4 relative z-10">
                <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                   <div className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Attendance</div>
                   <div className="text-2xl font-display font-bold">
                     {derivedDetails.filter(d => d.status === 'P').length} 
                     <span className="text-white/30 text-base"> / {totalClassStrength || safeStudents.length || viewRecord.total_count}</span>
                   </div>
                </div>
                <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                   <div className="text-[10px] font-bold text-white/50 uppercase tracking-widest">Type</div>
                   <div className="text-lg font-bold uppercase">{viewRecord.lecture_type || 'Regular'}</div>
                </div>
             </div>
          </div>
          
          <div className="p-0 dark:bg-slate-900 transition-colors">
            <div className="max-h-[400px] overflow-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0 text-slate-400 dark:text-slate-500 text-[9px] font-bold uppercase tracking-widest z-10">
                  <tr>
                    <th className="px-6 py-3">Roll No</th>
                    <th className="px-6 py-3">Student Identity</th>
                    <th className="px-6 py-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {derivedDetails.map(d => (
                    <tr key={String(d.student_roll)} className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/40 ${isStudent && Number(d.student_roll) === Number(userRoll) ? 'bg-indigo-50/50 dark:bg-indigo-900/20' : ''}`}>
                      <td className="px-6 py-4">
                         <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-display font-bold text-[10px] border ${
                           isStudent && Number(d.student_roll) === Number(userRoll) ? 'bg-indigo-500 text-white border-indigo-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border-slate-100 dark:border-slate-700'
                         }`}>
                           {d.student_roll}
                         </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs font-bold text-slate-700 dark:text-slate-300">{d.student_name}</div>
                        {isStudent && Number(d.student_roll) === Number(userRoll) && <span className="text-[8px] font-bold text-indigo-500 dark:text-indigo-400 uppercase">Your Record</span>}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold tracking-widest uppercase ${
                          d.status === 'P' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400'
                        }`}>
                          {d.status === 'P' ? 'Present' : 'Absent'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-center">
               <button onClick={() => setViewRecordId(null)} className="px-8 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shadow-sm">
                 Close Report
               </button>
            </div>
          </div>
        </Modal>
      )}

      {confirmEditRecord && (
        <Modal isOpen={true} onClose={() => setConfirmEditRecord(null)} title="Protocol Override">
          <div className="p-10 text-center space-y-8 dark:bg-slate-900">
            <div className="relative inline-block">
               <div className="absolute inset-0 bg-amber-100 dark:bg-amber-900/20 rounded-full animate-ping opacity-30"></div>
               <div className="relative bg-amber-100 dark:bg-amber-900/40 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto transition-transform hover:rotate-12">
                 <AlertTriangle className="w-8 h-8 text-amber-600 dark:text-amber-400" />
               </div>
            </div>
            <div>
              <h4 className="text-2xl font-display font-bold text-slate-900 dark:text-slate-100 tracking-tight uppercase">Manual Adjustment?</h4>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-2 leading-relaxed">
                You are accessing the registry for <span className="text-indigo-600 dark:text-indigo-400 font-bold">{confirmEditRecord.lecture_name}</span>.<br/>Changes will trigger audit notifications.
              </p>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setConfirmEditRecord(null)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-2xl font-bold uppercase tracking-widest text-[10px] hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">Abort</button>
              <button onClick={handleProceedEdit} className="flex-[2] py-4 bg-varsity-navy dark:bg-varsity-navy text-white rounded-2xl font-bold uppercase tracking-widest text-[10px] hover:bg-slate-800 dark:hover:bg-slate-950 shadow-xl shadow-navy-100 dark:shadow-black transition-all flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Open Editor
              </button>
            </div>
          </div>
        </Modal>
      )}

      {recordToDelete && (
        <Modal isOpen={true} onClose={() => setRecordToDelete(null)} title="Terminal Action">
          <div className="p-10 text-center space-y-8 dark:bg-slate-900">
            <div className="relative inline-block">
               <div className="absolute inset-0 bg-rose-100 dark:bg-rose-900/20 rounded-full animate-ping opacity-30"></div>
               <div className="relative bg-rose-100 dark:bg-rose-900/40 w-16 h-16 rounded-3xl flex items-center justify-center mx-auto transition-transform hover:-rotate-12">
                 <Trash2 className="w-8 h-8 text-rose-600 dark:text-rose-400" />
               </div>
            </div>
            <div>
              <h4 className="text-2xl font-display font-bold text-slate-900 dark:text-slate-100 tracking-tight uppercase">Delete Permanently?</h4>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-2 leading-relaxed">
                You are about to purge the registry for <span className="text-rose-600 dark:text-rose-400 font-bold">{recordToDelete.lecture_name}</span>.<br/>This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-4">
              <button onClick={() => setRecordToDelete(null)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-2xl font-bold uppercase tracking-widest text-[10px] hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">Cancel</button>
              <button onClick={handleConfirmDelete} className="flex-[2] py-4 bg-rose-600 text-white rounded-2xl font-bold uppercase tracking-widest text-[10px] hover:bg-rose-700 shadow-xl shadow-rose-100 dark:shadow-black transition-all flex items-center justify-center gap-2">
                <X className="w-4 h-4" /> Purge Record
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
