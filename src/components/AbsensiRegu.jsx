import React, { useState, useEffect } from 'react';
import { 
  Calendar, Users, MapPin, Clock, CheckCircle2, UserCheck, RefreshCw, 
  ClipboardList, HelpCircle, MessageSquare, Phone, AlertTriangle, Check, 
  User, ExternalLink, Shield, Activity, Edit2, Save, X
} from 'lucide-react';

export default function AbsensiRegu({ 
  users, 
  areas, 
  attendanceLogs, 
  onAddAttendance,
  currentUser,
  onUpdateUser,
  reports = []
}) {
  const todayStr = new Date().toISOString().split('T')[0];
  
  const [hari, setHari] = useState(() => {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    return days[new Date().getDay()];
  });
  
  // Default to currentUser's regu if available, otherwise Regu A
  const [selectedRegu, setSelectedRegu] = useState(() => {
    return currentUser?.regu || 'Regu A';
  });
  
  const [selectedShift, setSelectedShift] = useState('P'); // 'P' | 'S' | 'M' | 'Kh'
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'form' | 'history'
  
  // For phone number editing
  const [phoneInputs, setPhoneInputs] = useState({});
  const [editingPhoneId, setEditingPhoneId] = useState(null);

  // Get active guards for the selected Regu
  const reguMembers = users.filter(u => u.regu === selectedRegu);

  // Rows state for table editing
  const [rows, setRows] = useState([]);

  // Get time string by shift
  const getJamDinas = (shiftCode) => {
    if (shiftCode === 'P') return '06.00 - 14.00';
    if (shiftCode === 'S') return '14.00 - 22.00';
    if (shiftCode === 'M') return '22.00 - 06.00';
    return '08.00 - 17.00'; // Khusus
  };

  // Re-generate table rows when Regu or Shift changes
  useEffect(() => {
    const existingLog = attendanceLogs.find(
      log => log.tanggal === todayStr && log.regu === selectedRegu && log.shift === selectedShift
    );

    if (existingLog) {
      setRows(existingLog.details);
    } else {
      const defaultRows = reguMembers.map((member, index) => {
        const areaIndex = index % (areas.length || 1);
        const defaultArea = areas[areaIndex] ? areas[areaIndex].titik : '';
        
        return {
          personilId: member.id,
          nama: member.nama,
          jabatan: member.jabatan,
          status: 'Hadir',
          alasan: '',
          penggantiId: '',
          posPlotting: defaultArea,
          jamDinas: getJamDinas(selectedShift)
        };
      });
      setRows(defaultRows);
    }
  }, [selectedRegu, selectedShift, users, areas, attendanceLogs]);

  const handleRowChange = (index, field, value) => {
    setRows(prev => prev.map((row, idx) => {
      if (idx !== index) return row;
      
      const updated = { ...row, [field]: value };
      
      if (field === 'status') {
        if (value === 'Hadir') {
          updated.alasan = '';
          updated.penggantiId = '';
        } else if (value === 'Tukar Shift') {
          updated.alasan = 'Tukar Shift';
        } else if (value === 'Sakit') {
          updated.alasan = 'Sakit';
          updated.posPlotting = '-';
        } else if (value === 'Cuti') {
          updated.alasan = 'Cuti';
          updated.posPlotting = '-';
        } else if (value === 'Mangkir') {
          updated.alasan = 'Mangkir';
          updated.posPlotting = '-';
        }
      }
      return updated;
    }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (rows.length === 0) {
      alert('Tidak ada anggota regu untuk diabsensi.');
      return;
    }

    onAddAttendance({
      tanggal: todayStr,
      hari,
      regu: selectedRegu,
      shift: selectedShift,
      jamDinas: getJamDinas(selectedShift),
      details: rows
    });
    
    // Automatically switch to dashboard after saving to view the status
    setActiveTab('dashboard');
  };

  // Get substitute options
  const substituteOptions = users.filter(u => u.regu !== selectedRegu && ['Danru', 'Wadanru', 'Anggota'].includes(u.jabatan));

  // Find if plotting has been saved today for the selected regu
  const todayAttendance = attendanceLogs.find(
    log => log.tanggal === todayStr && log.regu === selectedRegu
  );

  // Helper to determine status and counts for today
  const getMemberStatus = (member) => {
    const memberDetail = todayAttendance?.details?.find(d => d.personilId === member.id);
    const reportsToday = reports.filter(
      r => r.userId === member.id && r.timestamp?.startsWith(todayStr)
    );
    const patrolCount = reportsToday.length;

    let isOnline = false;
    let lastActiveText = 'Offline';
    if (member.lastActive) {
      const lastActiveDate = new Date(member.lastActive);
      const diffMs = new Date() - lastActiveDate;
      const diffMins = Math.floor(diffMs / 60000);
      isOnline = diffMs < 300000; // 5 minutes threshold
      
      if (diffMins < 1) {
        lastActiveText = 'Aktif';
      } else if (diffMins < 60) {
        lastActiveText = `${diffMins}m lalu`;
      } else {
        lastActiveText = `${Math.floor(diffMins / 60)}j lalu`;
      }
    }

    let statusLabel = 'Offline';
    let statusColor = 'var(--text-muted)';
    let statusIndicator = '⚪';
    let statusKey = 'offline';

    if (memberDetail && memberDetail.status !== 'Hadir') {
      statusLabel = memberDetail.status;
      statusColor = 'var(--color-danger)';
      statusIndicator = '❌';
      statusKey = 'absent';
    } else {
      if (patrolCount > 0) {
        statusLabel = `Patroli (${patrolCount} area)`;
        statusColor = 'var(--color-success)';
        statusIndicator = '🟢';
        statusKey = 'patroli';
      } else if (isOnline) {
        statusLabel = 'Standby / Login';
        statusColor = 'var(--color-warning)';
        statusIndicator = '🟡';
        statusKey = 'login';
      }
    }

    return {
      statusLabel,
      statusColor,
      statusIndicator,
      statusKey,
      patrolCount,
      lastActiveText,
      isOnline,
      plottingPos: memberDetail?.posPlotting || '-',
      shiftCode: todayAttendance?.shift || '-',
      jamDinas: todayAttendance?.jamDinas || '-'
    };
  };

  const generateWALink = (member, statusInfo) => {
    const hp = member.nomorHp || '';
    let cleanHp = hp.replace(/\D/g, '');
    if (cleanHp.startsWith('0')) {
      cleanHp = '62' + cleanHp.slice(1);
    }
    
    const hariTanggal = `${hari}, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`;
    const text = `🛡️ *NOTIFIKASI PLOTTING PENJAGAAN JDC* 🛡️

Halo *${member.nama}*, berikut adalah detail plotting dinas Anda hari ini:

📅 Hari/Tanggal: *${hariTanggal}*
👥 Regu: *${selectedRegu}*
⏱️ Shift: *Shift ${statusInfo.shiftCode} (${statusInfo.jamDinas})*
📍 Pos Jaga: *${statusInfo.plottingPos}*
🟢 Status Kehadiran: *${statusInfo.statusLabel}*

Harap standby di pos masing-masing dan lakukan patroli berkala menggunakan aplikasi JDC.

_Sistem Manajemen Keamanan JDC_`;

    const encodedText = encodeURIComponent(text);
    if (cleanHp) {
      return `https://wa.me/${cleanHp}?text=${encodedText}`;
    } else {
      return `https://api.whatsapp.com/send?text=${encodedText}`;
    }
  };

  const handlePhoneInputChange = (memberId, value) => {
    setPhoneInputs(prev => ({
      ...prev,
      [memberId]: value
    }));
  };

  const handlePhoneSave = (memberId) => {
    const val = phoneInputs[memberId]?.trim();
    if (val === undefined) return;
    
    if (onUpdateUser) {
      onUpdateUser(memberId, { nomorHp: val });
      setEditingPhoneId(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Tab Switcher */}
      <div style={{ 
        display: 'flex', 
        gap: '0.5rem', 
        borderBottom: '1px solid var(--border-glass)', 
        paddingBottom: '0.75rem',
        overflowX: 'auto',
        whiteSpace: 'nowrap'
      }}>
        <button 
          type="button"
          onClick={() => setActiveTab('dashboard')} 
          style={{ 
            padding: '0.6rem 1.2rem', 
            borderRadius: '8px', 
            border: activeTab === 'dashboard' ? '1px solid var(--color-primary)' : '1px solid transparent', 
            background: activeTab === 'dashboard' ? 'rgba(59, 130, 246, 0.15)' : 'transparent', 
            color: activeTab === 'dashboard' ? 'var(--color-primary)' : 'var(--text-secondary)', 
            fontWeight: 700, 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.4rem', 
            cursor: 'pointer',
            fontSize: '0.85rem',
            transition: 'all 0.2s',
            fontFamily: 'var(--font-sans)'
          }}
        >
          <Activity size={16} /> Dashboard Regu
        </button>
        
        <button 
          type="button"
          onClick={() => setActiveTab('form')} 
          style={{ 
            padding: '0.6rem 1.2rem', 
            borderRadius: '8px', 
            border: activeTab === 'form' ? '1px solid var(--color-primary)' : '1px solid transparent', 
            background: activeTab === 'form' ? 'rgba(59, 130, 246, 0.15)' : 'transparent', 
            color: activeTab === 'form' ? 'var(--color-primary)' : 'var(--text-secondary)', 
            fontWeight: 700, 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.4rem', 
            cursor: 'pointer',
            fontSize: '0.85rem',
            transition: 'all 0.2s',
            fontFamily: 'var(--font-sans)'
          }}
        >
          <ClipboardList size={16} /> Form Absensi & Plotting
        </button>
        
        <button 
          type="button"
          onClick={() => setActiveTab('history')} 
          style={{ 
            padding: '0.6rem 1.2rem', 
            borderRadius: '8px', 
            border: activeTab === 'history' ? '1px solid var(--color-primary)' : '1px solid transparent', 
            background: activeTab === 'history' ? 'rgba(59, 130, 246, 0.15)' : 'transparent', 
            color: activeTab === 'history' ? 'var(--color-primary)' : 'var(--text-secondary)', 
            fontWeight: 700, 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.4rem', 
            cursor: 'pointer',
            fontSize: '0.85rem',
            transition: 'all 0.2s',
            fontFamily: 'var(--font-sans)'
          }}
        >
          <UserCheck size={16} /> Histori Absensi
        </button>
      </div>

      {/* REGU & METADATA BAR */}
      <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)' }}>MEMANTAU REGU</span>
            <select 
              value={selectedRegu} 
              onChange={e => setSelectedRegu(e.target.value)} 
              className="modern-select"
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.82rem', minWidth: '150px' }}
            >
              {['Regu A', 'Regu B', 'Regu C', 'Regu D', 'Non-Regu'].map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)' }}>SHIFT OPERASIONAL</span>
            <select 
              value={selectedShift} 
              onChange={e => setSelectedShift(e.target.value)} 
              className="modern-select"
              style={{ padding: '0.4rem 0.8rem', fontSize: '0.82rem', minWidth: '180px' }}
            >
              <option value="P">P (Pagi: 06:00-14:00)</option>
              <option value="S">S (Siang: 14:00-22:00)</option>
              <option value="M">M (Malam: 22:00-06:00)</option>
              <option value="Kh">Kh (Khusus)</option>
            </select>
          </div>
        </div>

        <div style={{ textAlign: 'right', fontSize: '0.8rem' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Hari Ini:</span>{' '}
          <strong style={{ color: 'var(--color-primary)' }}>{hari}, {todayStr}</strong>
        </div>
      </div>

      {/* ========================================== */}
      {/* TAB 1: DASHBOARD REGU */}
      {/* ========================================== */}
      {activeTab === 'dashboard' && (
        <>
          {!todayAttendance ? (
            <div className="glass-panel" style={{ padding: '3rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.2rem', background: 'rgba(239, 68, 68, 0.03)', border: '1px dashed rgba(239, 68, 68, 0.25)' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AlertTriangle size={32} />
              </div>
              <div style={{ maxWidth: '450px' }}>
                <h4 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>PLOTTING HARI INI BELUM DIISI!</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                  Absensi & pos penugasan untuk <strong>{selectedRegu}</strong> hari ini belum ditentukan. Anda harus membuat plotting terlebih dahulu agar dapat memantau status keaktifan personil secara real-time.
                </p>
              </div>
              <button 
                type="button"
                onClick={() => setActiveTab('form')} 
                className="btn-primary" 
                style={{ padding: '0.75rem 2rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700 }}
              >
                <ClipboardList size={16} /> Mulai Isi Absensi & Plotting
              </button>
            </div>
          ) : (
            <>
              {/* KPI CARDS */}
              <div className="grid-cols-3" style={{ gap: '1rem' }}>
                {/* Kehadiran */}
                {(() => {
                  const total = reguMembers.length;
                  const hadir = todayAttendance.details.filter(d => d.status === 'Hadir').length;
                  const tukar = todayAttendance.details.filter(d => d.status === 'Tukar Shift').length;
                  const nonHadir = total - hadir - tukar;
                  
                  return (
                    <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--color-primary)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.5rem' }}>
                        <UserCheck size={14} className="text-primary" /> STATUS KEHADIRAN REGU
                      </div>
                      <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        {hadir + tukar} <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 500 }}>/ {total} Personil</span>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>
                        Hadir: <strong>{hadir}</strong> • Tukar: <strong>{tukar}</strong> • Absen: <strong style={{ color: nonHadir > 0 ? 'var(--color-danger)' : 'inherit' }}>{nonHadir}</strong>
                      </div>
                    </div>
                  );
                })()}

                {/* Keaktifan / Login */}
                {(() => {
                  const stats = reguMembers.map(m => getMemberStatus(m));
                  const onlineCount = stats.filter(s => s.isOnline && s.statusKey !== 'absent').length;
                  const offlineCount = stats.filter(s => !s.isOnline && s.statusKey === 'offline').length;
                  
                  return (
                    <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--color-warning)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.5rem' }}>
                        <Users size={14} className="text-warning" /> STATUS KONEKSI (LOGIN)
                      </div>
                      <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        {onlineCount} <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 500 }}>Online JDC</span>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>
                        Active: <strong>{onlineCount}</strong> • Standby/Offline: <strong>{offlineCount}</strong>
                      </div>
                    </div>
                  );
                })()}

                {/* Patrol progress */}
                {(() => {
                  const stats = reguMembers.map(m => getMemberStatus(m));
                  const patrolActive = stats.filter(s => s.patrolCount > 0).length;
                  const totalScans = stats.reduce((acc, curr) => acc + curr.patrolCount, 0);
                  
                  return (
                    <div className="glass-panel" style={{ padding: '1.25rem', borderLeft: '4px solid var(--color-success)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.5rem' }}>
                        <Activity size={14} className="text-success" /> PROGRESS PATROLI
                      </div>
                      <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        {patrolActive} <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 500 }}>Petugas Patroli</span>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>
                        Total Checkpoint Terscan Hari Ini: <strong>{totalScans} Area</strong>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* DETAILED MEMBERS LIST */}
              <div className="glass-panel" style={{ padding: '1.5rem', marginTop: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <h4 style={{ fontSize: '0.98rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Shield size={16} className="text-primary" />
                    <span>Pemantauan Personil {selectedRegu} — Shift {todayAttendance.shift}</span>
                  </h4>
                  <span className="badge badge-info" style={{ fontSize: '0.7rem', padding: '0.35rem 0.75rem' }}>
                    Jam Dinas: {todayAttendance.jamDinas}
                  </span>
                </div>

                <div style={{ overflowX: 'auto', border: '1px solid var(--border-glass)', borderRadius: '8px', background: 'rgba(0,0,0,0.1)' }}>
                  <table className="absensi-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '850px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-glass)', background: 'rgba(255,255,255,0.01)' }}>
                        <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>No</th>
                        <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Nama Personil</th>
                        <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Jabatan</th>
                        <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Plotting Pos</th>
                        <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Keaktifan (Real-time)</th>
                        <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Progress Patroli</th>
                        <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Nomor WhatsApp</th>
                        <th style={{ padding: '1rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textAlign: 'center' }}>Kirim Notif WA</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reguMembers.length === 0 ? (
                        <tr>
                          <td colSpan="8" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                            Tidak ada personil terdaftar di regu ini.
                          </td>
                        </tr>
                      ) : (
                        reguMembers.map((member, idx) => {
                          const statusInfo = getMemberStatus(member);
                          
                          return (
                            <tr key={member.id} style={{ borderBottom: '1px solid var(--border-glass)', transition: 'background 0.2s' }}>
                              <td style={{ padding: '0.9rem 1rem', fontSize: '0.8rem', fontWeight: 600 }}>{idx + 1}</td>
                              
                              <td style={{ padding: '0.9rem 1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <img 
                                    src={member.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=40'} 
                                    alt="" 
                                    style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid rgba(59,130,246,0.3)' }} 
                                    onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=40'; }}
                                  />
                                  <div>
                                    <div style={{ fontWeight: 800, fontSize: '0.82rem' }}>{member.nama}</div>
                                    <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>NRP: {member.nrp}</div>
                                  </div>
                                </div>
                              </td>
                              
                              <td style={{ padding: '0.9rem 1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                {member.jabatan}
                              </td>
                              
                              <td style={{ padding: '0.9rem 1rem' }}>
                                <span className="badge badge-info" style={{ fontSize: '0.7rem', fontWeight: 700, background: 'rgba(6,182,212,0.1)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.2)' }}>
                                  📍 {statusInfo.plottingPos}
                                </span>
                              </td>
                              
                              <td style={{ padding: '0.9rem 1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem' }}>
                                  <span>{statusInfo.statusIndicator}</span>
                                  <span style={{ color: statusInfo.statusColor, fontWeight: 700 }}>
                                    {statusInfo.statusLabel}
                                  </span>
                                  {statusInfo.statusKey !== 'absent' && (
                                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginLeft: '0.2rem' }}>
                                      ({statusInfo.lastActiveText})
                                    </span>
                                  )}
                                </div>
                              </td>

                              <td style={{ padding: '0.9rem 1rem' }}>
                                {statusInfo.patrolCount > 0 ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-success)' }}>
                                      {statusInfo.patrolCount} Area Terscan
                                    </div>
                                    <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>
                                      Terakhir: {(() => {
                                        const sorted = reports.filter(r => r.userId === member.id && r.timestamp?.startsWith(todayStr)).sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
                                        if (sorted.length > 0) {
                                          return new Date(sorted[0].timestamp).toLocaleTimeString('id-ID', {hour:'2-digit',minute:'2-digit'});
                                        }
                                        return '-';
                                      })()} WIB
                                    </span>
                                  </div>
                                ) : (
                                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Belum patroli</span>
                                )}
                              </td>

                              <td style={{ padding: '0.9rem 1rem' }}>
                                {editingPhoneId === member.id ? (
                                  <div style={{ display: 'flex', gap: '0.2rem', alignItems: 'center' }}>
                                    <input 
                                      type="text" 
                                      value={phoneInputs[member.id] !== undefined ? phoneInputs[member.id] : (member.nomorHp || '')} 
                                      onChange={e => handlePhoneInputChange(member.id, e.target.value)}
                                      placeholder="Cth: 0812..." 
                                      className="modern-input" 
                                      style={{ padding: '0.2rem 0.4rem', fontSize: '0.72rem', width: '110px' }}
                                    />
                                    <button type="button" onClick={() => handlePhoneSave(member.id)} style={{ border: '1px solid var(--color-success)', background: 'rgba(16,185,129,0.1)', color: 'var(--color-success)', borderRadius: '4px', padding: '0.25rem', cursor: 'pointer', display: 'flex' }}><Check size={11} /></button>
                                    <button type="button" onClick={() => setEditingPhoneId(null)} style={{ border: '1px solid var(--border-glass)', background: 'transparent', color: 'var(--text-muted)', borderRadius: '4px', padding: '0.25rem', cursor: 'pointer', display: 'flex' }}><X size={11} /></button>
                                  </div>
                                ) : (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                    {member.nomorHp ? (
                                      <>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-primary)' }}>{member.nomorHp}</span>
                                        <button type="button" onClick={() => { setEditingPhoneId(member.id); handlePhoneInputChange(member.id, member.nomorHp); }} style={{ border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', opacity: 0.6 }} title="Ubah HP"><Edit2 size={11} /></button>
                                      </>
                                    ) : (
                                      <button type="button" onClick={() => { setEditingPhoneId(member.id); handlePhoneInputChange(member.id, ''); }} style={{ border: '1px dashed rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.05)', color: '#f87171', borderRadius: '4px', padding: '0.2rem 0.5rem', fontSize: '0.68rem', fontWeight: 600, cursor: 'pointer' }}>
                                        + Hubungkan HP
                                      </button>
                                    )}
                                  </div>
                                )}
                              </td>

                              <td style={{ padding: '0.9rem 1rem', textAlign: 'center' }}>
                                <a 
                                  href={generateWALink(member, statusInfo)}
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    background: 'rgba(16, 185, 129, 0.12)',
                                    border: '1.5px solid rgba(16, 185, 129, 0.35)',
                                    color: '#10b981',
                                    transition: 'all 0.2s',
                                    cursor: 'pointer',
                                    boxShadow: '0 0 8px rgba(16,185,129,0.08)'
                                  }}
                                  title="Kirim plotting ke WhatsApp petugas"
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = '#10b981';
                                    e.currentTarget.style.color = 'white';
                                    e.currentTarget.style.boxShadow = '0 0 15px #10b981';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'rgba(16, 185, 129, 0.12)';
                                    e.currentTarget.style.color = '#10b981';
                                    e.currentTarget.style.boxShadow = '0 0 8px rgba(16,185,129,0.08)';
                                  }}
                                >
                                  <MessageSquare size={14} />
                                </a>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* ========================================== */}
      {/* TAB 2: FORM ABSENSI & PLOTTING */}
      {/* ========================================== */}
      {activeTab === 'form' && (
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ClipboardList size={20} className="text-primary" />
            <span>Form Isian Absensi Regu & Plotting Penjagaan</span>
          </h3>

          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Metadata Parameters */}
            <div className="grid-cols-3" style={{ gap: '1rem' }}>
              <div className="step-field">
                <label><Calendar size={12} /> HARI</label>
                <select value={hari} onChange={e => setHari(e.target.value)} className="modern-select">
                  {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'].map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              
              <div className="step-field">
                <label><Users size={12} /> REGU</label>
                <select value={selectedRegu} onChange={e => setSelectedRegu(e.target.value)} className="modern-select">
                  {['Regu A', 'Regu B', 'Regu C', 'Regu D', 'Non-Regu'].map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div className="step-field">
                <label><Clock size={12} /> SHIFT JAGA</label>
                <select value={selectedShift} onChange={e => setSelectedShift(e.target.value)} className="modern-select">
                  <option value="P">P (Pagi: 06:00-14:00)</option>
                  <option value="S">S (Siang: 14:00-22:00)</option>
                  <option value="M">M (Malam: 22:00-06:00)</option>
                  <option value="Kh">Kh (Khusus)</option>
                </select>
              </div>
            </div>

            {/* Members Table */}
            <div style={{ overflowX: 'auto', border: '1px solid var(--border-glass)', borderRadius: '8px', background: 'rgba(0,0,0,0.1)' }}>
              <table className="absensi-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-glass)' }}>
                    <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>No</th>
                    <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Nama (Auto)</th>
                    <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Jabatan (Auto)</th>
                    <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Keterangan Hadir</th>
                    <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Jika Tidak Hadir Karena</th>
                    <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Nama Pengganti (Tukar Shift / Backup)</th>
                    <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Plotting Pos (Pilih)</th>
                    <th style={{ padding: '0.85rem 1rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Jam Dinas</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                        Tidak ada personil yang terdaftar dalam {selectedRegu}.
                      </td>
                    </tr>
                  ) : (
                    rows.map((row, idx) => (
                      <tr key={row.personilId} style={{ borderBottom: '1px solid var(--border-glass)' }}>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', fontWeight: 600 }}>{idx + 1}</td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', fontWeight: 700 }}>{row.nama}</td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{row.jabatan}</td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <select 
                            value={row.status} 
                            onChange={e => handleRowChange(idx, 'status', e.target.value)} 
                            className="modern-select"
                            style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem', minWidth: '110px' }}
                          >
                            <option value="Hadir">Hadir</option>
                            <option value="Tidak Hadir">Tidak Hadir</option>
                            <option value="Tukar Shift">Tukar Shift</option>
                            <option value="Sakit">Sakit</option>
                            <option value="Cuti">Cuti</option>
                            <option value="Mangkir">Mangkir</option>
                          </select>
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <input 
                            type="text" 
                            value={row.alasan} 
                            onChange={e => handleRowChange(idx, 'alasan', e.target.value)} 
                            placeholder="-" 
                            disabled={row.status === 'Hadir'}
                            className="modern-input" 
                            style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
                          />
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <select 
                            value={row.penggantiId} 
                            onChange={e => handleRowChange(idx, 'penggantiId', e.target.value)} 
                            disabled={row.status !== 'Tukar Shift' && row.status !== 'Tidak Hadir'}
                            className="modern-select"
                            style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
                          >
                            <option value="">-- Tidak Ada --</option>
                            {substituteOptions.map(opt => (
                              <option key={opt.id} value={opt.id}>{opt.nama} ({opt.jabatan} - {opt.regu})</option>
                            ))}
                          </select>
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <select 
                            value={row.posPlotting} 
                            onChange={e => handleRowChange(idx, 'posPlotting', e.target.value)} 
                            disabled={['Sakit', 'Cuti', 'Mangkir'].includes(row.status)}
                            className="modern-select"
                            style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
                          >
                            <option value="-">-</option>
                            {areas.map(a => (
                              <option key={a.id} value={a.titik}>{a.titik}</option>
                            ))}
                          </select>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {row.jamDinas}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '0.5rem' }}>
              <button type="submit" className="btn-primary" style={{ padding: '0.65rem 2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle2 size={16} /> Simpan Absensi & Plotting
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================== */}
      {/* TAB 3: HISTORI ABSENSI */}
      {/* ========================================== */}
      {activeTab === 'history' && (
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <UserCheck size={20} className="text-primary" />
            <span>Histori Absensi & Plotting Terdaftar</span>
          </h3>
          
          <div className="grid-cols-3" style={{ gap: '1rem' }}>
            {attendanceLogs.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                Belum ada log absensi terdaftar. Silakan buat absensi baru di atas.
              </div>
            ) : (
              [...attendanceLogs].reverse().map((log, index) => {
                const presentCount = log.details.filter(d => d.status === 'Hadir' || d.status === 'Tukar Shift').length;
                return (
                  <div key={log.id || index} className="glass-panel" style={{ padding: '1rem', borderLeft: '3px solid var(--color-primary)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                      <div>
                        <h4 style={{ fontSize: '0.9rem', fontWeight: 800 }}>{log.regu}</h4>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{log.hari}, {log.tanggal}</p>
                      </div>
                      <span className="badge badge-info" style={{ fontSize: '0.6rem' }}>Shift {log.shift}</span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Jam Dinas:</span>
                        <span style={{ fontWeight: 600 }}>{log.jamDinas}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Kepatuhan Plotting:</span>
                        <span style={{ fontWeight: 600, color: 'var(--color-success)' }}>{presentCount} / {log.details.length} Personil</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

    </div>
  );
}
