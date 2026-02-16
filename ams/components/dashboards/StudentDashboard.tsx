import React, { useState, useEffect } from 'react';
import { UserProfile, AttendanceRecord, QRPayload } from '../../types';
import { supabase } from '../../constants';
import { Header } from '../Header';
import { Scan, X, RotateCcw, CheckCircle, Smartphone } from 'lucide-react';

interface Props {
  user: UserProfile;
  onLogout: () => void;
  addNotification: (t: string, m: string, type: 'success' | 'update' | 'error') => void;
}

export const StudentDashboard: React.FC<Props> = ({ user, onLogout, addNotification }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [recentAttendance, setRecentAttendance] = useState<any[]>([]);
  const [stats, setStats] = useState({ present: 0, total: 0 });
  const [scanner, setScanner] = useState<any>(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    if (!user.roll_no) return;

    // Get stats
    const { data: details } = await supabase
      .from('attendance_details')
      .select('status, attendance_records(lecture_name, date)')
      .eq('student_roll', user.roll_no)
      .order('id', { ascending: false });

    if (details) {
      setRecentAttendance(details.slice(0, 5));
      const p = details.filter(d => d.status === 'P').length;
      setStats({ present: p, total: details.length });
    }
  };

  const startScanner = () => {
    setIsScanning(true);
    setTimeout(() => {
      // @ts-ignore
      const html5QrCode = new Html5Qrcode("reader");
      setScanner(html5QrCode);
      
      const config = { fps: 10, qrbox: { width: 250, height: 250 } };
      
      html5QrCode.start({ facingMode: "environment" }, config, onScanSuccess)
        .catch((err: any) => {
          console.error(err);
          addNotification("Camera Error", "Could not start camera.", "error");
          setIsScanning(false);
        });
    }, 100);
  };

  const stopScanner = () => {
    if (scanner) {
      scanner.stop().then(() => {
        scanner.clear();
        setIsScanning(false);
      });
    } else {
      setIsScanning(false);
    }
  };

  const onScanSuccess = async (decodedText: string) => {
    try {
      if(scanner) await scanner.stop();
      setIsScanning(false);
      
      const payload: { rid: number, t: string, l: string } = JSON.parse(decodedText);
      
      // Verify session validity
      const { data: record, error: recordError } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('id', payload.rid)
        .single();

      if (recordError || !record) throw new Error("Invalid Session");
      if (!record.is_active) throw new Error("Session Expired");
      if (record.session_token !== payload.t) throw new Error("Invalid Token");

      // Mark Attendance
      const { error: insertError } = await supabase
        .from('attendance_details')
        .insert({
          attendance_record_id: record.id,
          student_roll: user.roll_no,
          student_name: user.full_name,
          status: 'P',
          timestamp: new Date().toISOString()
        });

      if (insertError) {
        if (insertError.code === '23505') throw new Error("Already Marked!");
        throw insertError;
      }

      addNotification("Success!", `Marked Present for ${payload.l}`, "success");
      fetchHistory(); // Refresh UI

    } catch (err: any) {
      addNotification("Failed", err.message || "Invalid QR Code", "error");
    }
  };

  const percentage = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-100">
      <Header user={user} onLogout={onLogout} title="My Attendance" />

      {isScanning && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
          <div id="reader" className="w-full max-w-sm h-[400px] bg-black"></div>
          <p className="text-white mt-4 font-mono text-sm animate-pulse">Align QR Code within frame</p>
          <button 
            onClick={stopScanner}
            className="mt-8 bg-white/20 text-white px-6 py-3 rounded-full backdrop-blur-md flex items-center gap-2"
          >
            <X className="w-5 h-5" /> Cancel Scan
          </button>
        </div>
      )}

      <main className="max-w-md mx-auto p-4 space-y-4">
        {/* ID Card Style Header */}
        <div className="bg-varsity-navy text-white rounded-2xl p-6 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10"></div>
          <div className="relative z-10">
            <h2 className="text-2xl font-display font-bold">{user.full_name}</h2>
            <p className="text-slate-300 font-mono text-sm">Roll No: {user.roll_no}</p>
            
            <div className="mt-6 flex items-end gap-2">
              <span className="text-5xl font-display font-bold">{percentage}%</span>
              <span className="text-sm text-slate-300 mb-2">Attendance</span>
            </div>
            
            <div className="w-full bg-white/20 h-2 rounded-full mt-2">
              <div 
                className={`h-full rounded-full ${percentage > 75 ? 'bg-emerald-400' : 'bg-varsity-gold'}`} 
                style={{ width: `${percentage}%` }}
              ></div>
            </div>
          </div>
        </div>

        <button 
          onClick={startScanner}
          className="w-full bg-varsity-red text-white py-5 rounded-2xl font-bold text-lg uppercase tracking-widest shadow-xl hover:bg-red-700 active:scale-95 transition-all flex items-center justify-center gap-3"
        >
          <Scan className="w-6 h-6" /> Scan QR Code
        </button>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-slate-400" /> Recent Activity
          </h3>
          <div className="space-y-3">
            {recentAttendance.length === 0 ? (
              <p className="text-center text-slate-400 text-sm py-4">No records found.</p>
            ) : (
              recentAttendance.map((rec, idx) => (
                <div key={idx} className="flex justify-between items-center text-sm border-b border-slate-50 last:border-0 pb-2 last:pb-0">
                  <div>
                    <div className="font-bold text-slate-700">{rec.attendance_records?.lecture_name}</div>
                    <div className="text-xs text-slate-400">{rec.attendance_records?.date}</div>
                  </div>
                  <div className="flex items-center gap-1 text-emerald-600 font-bold text-xs uppercase bg-emerald-50 px-2 py-1 rounded">
                    <CheckCircle className="w-3 h-3" /> Present
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
