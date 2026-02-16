
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase, PANEL_KEYS, ADMIN_TABLE, ADMIN_SETTINGS_KEY } from '../constants';
import { UserProfile, Student, Faculty, Lecture, AttendanceRecord, NotificationItem } from '../types';
import { Header } from './Header';
import { UserList } from './UserList';
import { LectureForm } from './LectureForm';
import { AdminPanel } from './AdminPanel';
import { AttendanceReports } from './AttendanceReports';
import { StatsSummary } from './StatsSummary';
import { ScanLog } from './ScanLog';
import { RecordsTable } from './RecordsTable';
import { Analytics } from './Analytics';
import { NotificationToast } from './NotificationToast';
import { UserManagement } from './UserManagement';
import { FacultyPortal } from './FacultyPortal';
import { SystemAudit } from './SystemAudit';
import { 
  Scan, X, CheckCircle, Smartphone, AlertTriangle, 
  CheckCircle2, Loader2, Sparkles, Bell, Users, 
  Settings2, BookOpen, BarChart3, Calendar as CalendarIcon,
  Search, ClipboardList, TrendingUp
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

interface DashboardProps {
  user: UserProfile;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
}

type TabType = 'attendance' | 'history' | 'management' | 'my-classes';

export const Dashboard: React.FC<DashboardProps> = ({ user, darkMode, setDarkMode }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [hiddenPanels, setHiddenPanels] = useState<Record<string, boolean>>({});
  
  const [activeTab, setActiveTab] = useState<TabType>('attendance');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState<{ type: 'success' | 'error' | 'loading', msg: string } | null>(null);
  const [showSuccessOverlay, setShowSuccessOverlay] = useState<{ lecture: string, faculty: string } | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const [selectedRolls, setSelectedRolls] = useState<Set<number>>(new Set());
  const [currentEditRecord, setCurrentEditRecord] = useState<AttendanceRecord | null>(null);

  const [historyDateFilter, setHistoryDateFilter] = useState('');
  const [historyLectureFilter, setHistoryLectureFilter] = useState('');
  const [scanLog, setScanLog] = useState<{time: string, roll: number, name: string}[]>([]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const addNotification = useCallback((title: string, message: string, type: 'success' | 'update' | 'error') => {
    const id = Math.random().toString(36).substring(7);
    setNotifications(prev => [{ id, title, message, type }, ...prev].slice(0, 5));
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const fetchInitialData = useCallback(async () => {
    try {
      const { data: sData, error: sError } = await supabase
        .from('students')
        .select('*')
        .order('roll_no');
        
      if (sError) throw sError;
      if (sData) {
        const seen = new Set();
        const uniqueStudents = sData.filter(s => {
          if (seen.has(s.roll_no)) return false;
          seen.add(s.roll_no);
          return true;
        });
        setStudents(uniqueStudents);
      }
      
      const { data: fData, error: fError } = await supabase.from('faculty').select('*').order('roll_no');
      if (fError) console.error("Faculty fetch error:", fError);
      if (fData) setFaculty(fData);
      
      const { data: lData, error: lError } = await supabase.from('lectures').select('*').order('name');
      if (lError) console.error("Lectures fetch error:", lError);
      if (lData) setLectures(lData);

      if (user.role === 'admin') {
        const { data: uData, error: uError } = await supabase.from('users').select('*');
        if (uError) console.error("Users fetch error:", uError);
        if (uData) setAllUsers(uData as UserProfile[]);
      }
    } catch (err: any) {
      console.error("Error fetching initial data:", err);
      // addNotification('Data Load Error', 'Could not load directory data.', 'error');
    }
  }, [user.role]);

  const fetchRecords = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('attendance_records')
        .select(`*, attendance_details (student_roll, student_name, status)`)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });
      
      if (error) {
        const { data: simpleData } = await supabase
          .from('attendance_records')
          .select('*')
          .order('date', { ascending: false });
        if (simpleData) setRecords(simpleData as AttendanceRecord[]);
      } else if (data) {
        setRecords(data as AttendanceRecord[]);
      }
    } catch (err) {
      console.error("Error fetching records:", err);
    }
  }, []);

  const loadAdminSettings = useCallback(async () => {
    try {
      const { data } = await supabase.from(ADMIN_TABLE).select('value').eq('key', ADMIN_SETTINGS_KEY).single();
      if (data?.value) setHiddenPanels(data.value);
    } catch {
      const ls = localStorage.getItem('admin_hidden_panels');
      if (ls) setHiddenPanels(JSON.parse(ls));
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setIsLoadingData(true);
      await Promise.all([
        fetchInitialData(),
        fetchRecords(),
        loadAdminSettings()
      ]);
      setIsLoadingData(false);
    };
    
    init();

    const heartbeat = setInterval(async () => {
      await supabase.from('users').update({ 
        last_active_at: new Date().toISOString() 
      }).eq('id', user.id);
    }, 30000);

    let polling: any = null;
    if (user.role === 'admin') {
      polling = setInterval(async () => {
        const { data: uData } = await supabase.from('users').select('*');
        if (uData) setAllUsers(uData as UserProfile[]);
      }, 20000);
    }

    const channel = supabase
      .channel('attendance_live_sync_global')
      .on(
        'postgres_changes',
        { event: '*', table: 'attendance_records' },
        () => { fetchRecords(); }
      )
      .on(
        'postgres_changes',
        { event: '*', table: 'attendance_details' },
        () => { fetchRecords(); }
      )
      .on(
        'postgres_changes',
        { event: '*', table: 'users' },
        () => { if(user.role === 'admin') fetchInitialData(); }
      )
      .subscribe();

    return () => {
      clearInterval(heartbeat);
      if (polling) clearInterval(polling);
      if (scannerRef.current) scannerRef.current.stop().catch(console.error);
      supabase.removeChannel(channel);
    };
  }, [addNotification, fetchInitialData, fetchRecords, loadAdminSettings, user.id, user.role]);

  const togglePanelVisibility = async (key: string, isHidden: boolean) => {
    const newHidden = { ...hiddenPanels, [key]: isHidden };
    if (!isHidden) delete newHidden[key];
    setHiddenPanels(newHidden);
    if (user.role === 'admin') {
      try {
        await supabase.from(ADMIN_TABLE).upsert({ 
          key: ADMIN_SETTINGS_KEY, 
          value: newHidden, 
          updated_at: new Date().toISOString() 
        }, { onConflict: 'key' });
      } catch (e) {
        console.error("Error saving panel visibility:", e);
      }
    }
  };

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
      } catch (e) {
        console.warn("Scanner stop error", e);
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
  }, []);

  const onScanSuccess = useCallback(async (decodedText: string) => {
    if (user.role !== 'student' || !user.roll_no) {
      setScanStatus({ type: 'error', msg: "Only students can scan." });
      return;
    }

    try {
      setScanStatus({ type: 'loading', msg: "Verifying session..." });
      if (scannerRef.current) {
        try { await scannerRef.current.pause(true); } catch(e){}
      }
      
      let payload;
      try { 
        payload = JSON.parse(decodedText); 
      } catch (e) { 
        throw new Error("Invalid QR format detected."); 
      }

      const { rid, t, l, f, exp } = payload;
      
      if (exp && Date.now() > exp) {
        throw new Error("This QR code has expired locally.");
      }

      const { data: record, error: recordErr } = await supabase.from('attendance_records').select('*').eq('id', rid).single();
      
      if (recordErr || !record) throw new Error("Attendance record not found.");
      if (!record.is_active) throw new Error("This session has already ended.");
      if (record.session_token !== t) throw new Error("Security token mismatch.");

      const { error: insertErr } = await supabase.from('attendance_details').insert({
        attendance_record_id: record.id,
        student_roll: user.roll_no,
        student_name: user.full_name,
        status: 'P'
      });

      if (insertErr) {
        if (insertErr.code === '23505') throw new Error("Already marked for this session!");
        throw insertErr;
      }

      setScanStatus({ type: 'success', msg: `Present for ${l}` });
      setShowSuccessOverlay({ lecture: l, faculty: f });
      fetchRecords();
      setTimeout(() => stopScanner(), 1000);
    } catch (err: any) {
      setScanStatus({ type: 'error', msg: err.message || "Failed to mark attendance." });
      if (scannerRef.current) {
        try { scannerRef.current.resume(); } catch(e){}
      }
    }
  }, [user, stopScanner, fetchRecords]);

  const startScanner = async () => {
    setIsScanning(true);
    setScanStatus(null);
    setTimeout(async () => {
      try {
        const newScanner = new Html5Qrcode("scanner-region");
        scannerRef.current = newScanner;
        await newScanner.start(
          { facingMode: "environment" },
          { fps: 15, qrbox: { width: 250, height: 250 } },
          onScanSuccess,
          () => {} 
        );
      } catch (err) {
        setScanStatus({ type: 'error', msg: "Camera access denied or unavailable." });
        setIsScanning(false);
      }
    }, 400);
  };

  const handleScan = (roll: number) => {
    if (user.role === 'student') return; 
    const student = students.find(s => Number(s.roll_no) === Number(roll));
    if (student) {
      setSelectedRolls(prev => new Set(prev).add(Number(roll)));
      setScanLog(prev => [{ time: new Date().toLocaleTimeString(), roll, name: student.name }, ...prev].slice(0, 50));
    }
  };

  const handleNewSessionClick = () => {
    // Explicitly reset session and selections when starting "New Session"
    setCurrentEditRecord(null);
    setSelectedRolls(new Set());
    setActiveTab('attendance');
  };

  const isVisible = (key: string) => user.role === 'admin' || !hiddenPanels[key];

  const myHistoryRecords = useMemo(() => {
    const safeRecords = records || [];
    return safeRecords.filter(r => {
      let isRelevant = true;
      const matchesDate = historyDateFilter ? r.date === historyDateFilter : true;
      const matchesLecture = historyLectureFilter ? r.lecture_name === historyLectureFilter : true;
      return isRelevant && matchesDate && matchesLecture;
    });
  }, [records, historyDateFilter, historyLectureFilter]);

  const handleEditRequest = (r: AttendanceRecord) => {
    if (user.role === 'student') return;
    setCurrentEditRecord(r); 
    
    // Resolve duplicate statuses using Map (Last Write Wins) to match RecordsTable logic
    const statusMap = new Map<number, string>();
    if (r.attendance_details) {
      r.attendance_details.forEach(d => {
        statusMap.set(Number(d.student_roll), d.status);
      });
    }

    const present = new Set<number>(); 
    statusMap.forEach((status, roll) => {
      if(status === 'P') present.add(roll);
    });
    
    setSelectedRolls(present); 
    setActiveTab('attendance'); 
    window.scrollTo({top: 0, behavior:'smooth'});
  };

  const handleDeleteRecord = async (id: number) => {
    try {
      await supabase.from('attendance_details').delete().eq('attendance_record_id', id);
      await supabase.from('attendance_records').delete().eq('id', id);
      addNotification('Deletion Successful', 'The session record has been permanently removed.', 'success');
      fetchRecords();
    } catch (err: any) {
      addNotification('Deletion Failed', err.message, 'error');
    }
  };

  if (isLoadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-varsity-navy dark:text-varsity-gold mx-auto" />
          <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Loading Dashboard Core...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-slate-950 flex flex-col font-sans transition-colors duration-300">
      <Header 
        user={user} 
        title="AMS PORTAL" 
        date={date} 
        setDate={setDate} 
        onLogout={handleLogout} 
        darkMode={darkMode}
        setDarkMode={setDarkMode}
      />

      <NotificationToast notifications={notifications} onDismiss={dismissNotification} />

      <main className="flex-1 max-w-[1400px] w-full mx-auto p-4 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 relative">
        {showSuccessOverlay && (
          <div className="fixed inset-0 z-[100] bg-slate-900/40 dark:bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in slide-in-from-bottom-8 duration-500 border border-slate-100 dark:border-slate-800">
              <div className="p-10 text-center space-y-8">
                <div className="relative inline-block">
                  <div className="absolute inset-0 bg-emerald-100 dark:bg-emerald-900/20 rounded-full animate-ping opacity-20 scale-150"></div>
                  <div className="relative bg-emerald-500 text-white p-6 rounded-full shadow-2xl shadow-emerald-200 dark:shadow-black">
                    <CheckCircle2 className="w-14 h-14" />
                  </div>
                </div>
                <div className="space-y-2">
                   <h2 className="text-3xl font-display font-bold text-slate-900 dark:text-slate-100 tracking-tighter uppercase">Verified</h2>
                   <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Attendance successfully logged</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-[2rem] p-6 text-left border border-slate-100 dark:border-slate-800">
                  <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Lecture</div>
                  <div className="text-lg font-bold text-slate-800 dark:text-slate-200 leading-tight mb-4">{showSuccessOverlay.lecture}</div>
                  <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Faculty</div>
                  <div className="text-sm font-semibold text-slate-600 dark:text-slate-400">{showSuccessOverlay.faculty}</div>
                </div>
                <button onClick={() => setShowSuccessOverlay(null)} className="w-full py-5 bg-varsity-navy text-white rounded-2xl font-bold uppercase tracking-widest shadow-xl shadow-navy-100 dark:shadow-black hover:bg-slate-800 dark:hover:bg-slate-950 active:scale-95 transition-all flex items-center justify-center gap-2">
                  Confirm <Sparkles className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="lg:col-span-8 flex flex-col gap-8">
          {user.role === 'admin' && (
            <div className="space-y-8">
               <AdminPanel hiddenPanels={hiddenPanels} onToggle={togglePanelVisibility} />
               <SystemAudit admin={user} records={records} students={students} allUsers={allUsers} />
            </div>
          )}

          <div className="flex bg-white/50 dark:bg-slate-900/50 p-1 rounded-2xl border border-slate-100 dark:border-slate-800 w-fit overflow-x-auto max-w-full backdrop-blur-sm">
            <button 
              onClick={handleNewSessionClick} 
              className={`px-6 py-3 text-xs font-bold uppercase tracking-widest rounded-xl transition-all whitespace-nowrap ${activeTab === 'attendance' && !currentEditRecord ? 'bg-white dark:bg-slate-800 shadow-sm text-varsity-navy dark:text-varsity-gold' : 'text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400'}`}
            >
              {user.role === 'student' ? 'Scanning' : 'New Session'}
            </button>
            {currentEditRecord && activeTab === 'attendance' && (
              <button className="px-6 py-3 text-xs font-bold uppercase tracking-widest rounded-xl bg-indigo-600 text-white shadow-sm whitespace-nowrap">
                Editing Session
              </button>
            )}
            <button onClick={() => setActiveTab('history')} className={`px-6 py-3 text-xs font-bold uppercase tracking-widest rounded-xl transition-all whitespace-nowrap ${activeTab === 'history' ? 'bg-white dark:bg-slate-800 shadow-sm text-varsity-navy dark:text-varsity-gold' : 'text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400'}`}>
              History
            </button>
            {user.role === 'faculty' && (
              <button onClick={() => setActiveTab('my-classes')} className={`px-6 py-3 text-xs font-bold uppercase tracking-widest rounded-xl transition-all whitespace-nowrap ${activeTab === 'my-classes' ? 'bg-white dark:bg-slate-800 shadow-sm text-varsity-navy dark:text-varsity-gold' : 'text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400'}`}>
                My Classes
              </button>
            )}
            {user.role === 'admin' && (
              <button onClick={() => setActiveTab('management')} className={`px-6 py-3 text-xs font-bold uppercase tracking-widest rounded-xl transition-all whitespace-nowrap ${activeTab === 'management' ? 'bg-white dark:bg-slate-800 shadow-sm text-varsity-navy dark:text-varsity-gold' : 'text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400'}`}>
                Management
              </button>
            )}
          </div>

          {activeTab === 'attendance' && (
            <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
              <div className={`grid grid-cols-1 ${user.role !== 'student' ? 'md:grid-cols-2' : ''} gap-8`}>
                {user.role !== 'student' && (
                  <UserList students={students} faculty={faculty} selectedRolls={selectedRolls} onSelectionChange={setSelectedRolls} onScan={handleScan} canEdit={true} />
                )}
                
                {user.role === 'student' ? (
                  <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl shadow-slate-200/50 dark:shadow-black border border-slate-100 dark:border-slate-800 p-10 flex flex-col items-center justify-center text-center space-y-8 h-fit transition-colors duration-300 max-w-2xl mx-auto w-full">
                    <div className="w-24 h-24 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-500 dark:text-indigo-400 rounded-[2rem] flex items-center justify-center rotate-3 transition-transform hover:rotate-0 duration-500">
                      <Smartphone className="w-12 h-12" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-display font-bold text-slate-900 dark:text-slate-100 tracking-tight uppercase">Quick Scan</h3>
                      <p className="text-sm text-slate-400 dark:text-slate-500 mt-2 font-medium">Verify your presence instantly via QR code</p>
                    </div>
                    {!isScanning ? (
                      <button onClick={startScanner} className="w-full bg-varsity-navy text-white py-5 rounded-3xl font-bold uppercase tracking-widest shadow-2xl shadow-navy-100 dark:shadow-black hover:bg-slate-800 dark:hover:bg-slate-950 transition-all flex items-center justify-center gap-3 active:scale-[0.98]">
                        <Scan className="w-6 h-6" /> Open Scanner
                      </button>
                    ) : (
                      <div className="w-full space-y-6 animate-in zoom-in duration-300">
                        <div className="relative overflow-hidden rounded-[2rem] border-[8px] border-varsity-navy dark:border-slate-800 shadow-2xl bg-black aspect-square max-w-[320px] mx-auto">
                          <div id="scanner-region" className="w-full h-full"></div>
                          <div className="absolute top-0 left-0 w-full h-1 bg-emerald-400 animate-[scan_2s_linear_infinite] shadow-[0_0_15px_rgba(52,211,153,1)] z-10"></div>
                        </div>
                        {scanStatus && (
                          <div className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 ${scanStatus.type === 'loading' ? 'bg-indigo-50 text-indigo-600' : scanStatus.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                            {scanStatus.msg}
                          </div>
                        )}
                        <button onClick={stopScanner} className="text-slate-400 font-bold text-[10px] uppercase tracking-widest hover:text-rose-500 transition-all">
                          Exit Scanner
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <LectureForm lectures={lectures} faculty={faculty} selectedRolls={selectedRolls} totalStudents={students.length} students={students} date={date} user={user} onSuccess={() => {fetchRecords(); setSelectedRolls(new Set()); setCurrentEditRecord(null);}} editRecord={currentEditRecord} onCancelEdit={() => {setCurrentEditRecord(null); setSelectedRolls(new Set());}} />
                )}
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 p-8">
                <div className="flex justify-between items-center mb-6 px-2">
                  <div>
                    <h3 className="font-display font-bold text-xl text-slate-900 dark:text-slate-100 uppercase tracking-tight">Today's Session Logs</h3>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">Audit trail for {date}</p>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                    <ClipboardList className="w-5 h-5 text-indigo-500" />
                  </div>
                </div>
                <RecordsTable 
                  records={myHistoryRecords.filter(r => r.date === date)} 
                  students={students} 
                  userRole={user.role} 
                  userRoll={user.roll_no} 
                  onDelete={handleDeleteRecord} 
                  onEdit={handleEditRequest} 
                  totalClassStrength={students.length} 
                />
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-800 p-8 animate-in slide-in-from-bottom-4 duration-500">
               <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                  <div>
                    <h3 className="font-display font-bold text-2xl text-slate-900 dark:text-slate-100 tracking-tight uppercase">Full Lecture Log</h3>
                    <p className="text-sm text-slate-400 dark:text-slate-500 font-medium">Historical audit of all batch sessions</p>
                  </div>
                  <div className="flex gap-2 w-full md:w-auto">
                     <div className="relative">
                        <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
                        <input type="date" value={historyDateFilter} onChange={e => setHistoryDateFilter(e.target.value)} className="bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 outline-none" />
                     </div>
                     <select value={historyLectureFilter} onChange={e => setHistoryLectureFilter(e.target.value)} className="bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 outline-none">
                        <option value="">All Topics</option>
                        {(lectures || []).map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
                     </select>
                  </div>
               </div>
               <RecordsTable records={myHistoryRecords} students={students} userRole={user.role} userRoll={user.roll_no} onDelete={handleDeleteRecord} onEdit={handleEditRequest} totalClassStrength={students.length} />
            </div>
          )}

          {activeTab === 'management' && user.role === 'admin' && (
            <UserManagement onUpdate={fetchInitialData} addNotification={addNotification} records={records} />
          )}

          {activeTab === 'my-classes' && user.role === 'faculty' && (
            <FacultyPortal user={user} records={records} lectures={lectures} students={students} onRefresh={fetchRecords} onDeleteRecord={handleDeleteRecord} onEditRecord={handleEditRequest} totalClassStrength={students.length} />
          )}

          {isVisible(PANEL_KEYS.REPORTS) && activeTab !== 'management' && activeTab !== 'my-classes' && (
            <AttendanceReports records={records} students={students} faculty={faculty} hiddenPanels={hiddenPanels} userRole={user.role} />
          )}
        </div>

        <aside className="lg:col-span-4 flex flex-col gap-8">
          <StatsSummary date={date} records={records} studentsCount={students.length} />
          {user.role !== 'student' && <ScanLog log={scanLog} />}
          {isVisible(PANEL_KEYS.ANALYTICS) && <Analytics records={records} students={students} date={date} />}
        </aside>
      </main>

      <footer className="py-8 text-center bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 transition-colors duration-300 mt-auto">
        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-[0.2em]">Academic Management Suite 2026 • Secured via Supabase</p>
      </footer>
    </div>
  );
};
