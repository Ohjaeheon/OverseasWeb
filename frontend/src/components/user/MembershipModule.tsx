import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { logService } from '../../services/logService';
import { adminService, UserItem } from '../../services/adminService';
import { diagnosisService } from '../../services/diagnosisService';
import defaultChurchesData from '../../assets/defaultChurches.json';
import { Building2, Calendar, Lock, Send, CheckCircle2, BarChart3, Edit3, Sparkles, Filter, HelpCircle } from 'lucide-react';

import api from '../../services/api';

interface DeptMembershipData {
  assemblyAdmit: number;    // 회별 재적 - 입교
  assemblyAccident: number; // 회별 재적 - 사고
  evangIncrease: number;    // 전도 재적 - 증가
  evangDecrease: number;    // 전도 재적 - 감소
  attendIncrease: number;   // 출결 재적 - 증가
  attendDecrease: number;   // 출결 재적 - 감소
  calculatedEvangReg?: number;
}

interface MembershipModuleProps {
  initialTab?: 'check' | 'input';
}

const DEPARTMENTS = ['교역자', '자문회', '장년회', '부녀회', '청년회'];
const ALL_MONTHS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

const getPreviousMonthKey = (monthKey: string): string => {
  const num = parseInt(monthKey.replace('월', ''));
  if (num === 1) return '12월';
  return `${num - 1}월`;
};

export const MembershipModule: React.FC<MembershipModuleProps> = ({ initialTab = 'check' }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'check' | 'input'>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // User Permission & Scope Guard
  const [userScope, setUserScope] = useState<string>('전체');
  const [userRole, setUserRole] = useState<string>('ROLE_ADMIN');
  const [availableChurches, setAvailableChurches] = useState<{ id: string; name: string; jipa: string }[]>([]);
  const [selectedChurch, setSelectedChurch] = useState<string>('도쿄교회');

  // Date Filters
  const currentYearNum = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<string>(() => `${currentYearNum}년`);
  const [selectedMonthCheck, setSelectedMonthCheck] = useState<string>('전체'); // For Tab 1 (check)
  const [selectedMonthInput, setSelectedMonthInput] = useState<string>(() => {
    const curMonthNum = new Date().getMonth() + 1; // 1-12
    return `${curMonthNum}월`;
  }); // For Tab 2 (input)

  const dynamicYears: string[] = [];
  for (let y = currentYearNum; y >= 2026; y--) {
    dynamicYears.push(`${y}년`);
  }

  const getMonthsLimit = () => {
    const currentYear = new Date().getFullYear();
    const selectedYearNum = parseInt(selectedYear.replace(/[^0-9]/g, '')) || currentYear;
    if (selectedYearNum < currentYear) {
      return 12;
    }
    if (selectedYearNum === currentYear) {
      return new Date().getMonth() + 1;
    }
    return 0;
  };

  // Current Month Data Input State
  const [currentMonthInputs, setCurrentMonthInputs] = useState<Record<string, DeptMembershipData>>({
    '교역자': { assemblyAdmit: 0, assemblyAccident: 0, evangIncrease: 0, evangDecrease: 0, attendIncrease: 0, attendDecrease: 0 },
    '자문회': { assemblyAdmit: 0, assemblyAccident: 0, evangIncrease: 0, evangDecrease: 0, attendIncrease: 0, attendDecrease: 0 },
    '장년회': { assemblyAdmit: 0, assemblyAccident: 0, evangIncrease: 0, evangDecrease: 0, attendIncrease: 0, attendDecrease: 0 },
    '부녀회': { assemblyAdmit: 0, assemblyAccident: 0, evangIncrease: 0, evangDecrease: 0, attendIncrease: 0, attendDecrease: 0 },
    '청년회': { assemblyAdmit: 0, assemblyAccident: 0, evangIncrease: 0, evangDecrease: 0, attendIncrease: 0, attendDecrease: 0 },
  });

  // Database Records State
  const [dbRecords, setDbRecords] = useState<Record<string, Record<string, DeptMembershipData>>>({});
  const [loadingDb, setLoadingDb] = useState<boolean>(false);

  // Help Descriptions Tooltip Modal State
  const [activeHelpKey, setActiveHelpKey] = useState<string | null>(null);
  const [activeHelpTitle, setActiveHelpTitle] = useState<string>('');
  const [helpTexts, setHelpTexts] = useState<Record<string, string>>({
    DESC_MEMBERSHIP_STATUS_1: '선택한 교회의 부서별/월별 입교 및 사고 현황 요약 데이터 표입니다.',
    DESC_MEMBERSHIP_STATUS_2: '선택한 교회의 부서별/월별 전도 재적 증감 데이터 표입니다.',
    DESC_MEMBERSHIP_STATUS_3: '선택한 교회의 부서별/월별 출결 재적 증감 데이터 표입니다.'
  });

  const openHelpModal = (key: string, title: string) => {
    setActiveHelpKey(key);
    setActiveHelpTitle(title);
  };

  const fetchDbRecords = async () => {
    setLoadingDb(true);
    try {
      const res = await api.get<any[]>(`/membership/records?church=${encodeURIComponent(selectedChurch)}&year=${selectedYear}`);
      const map: Record<string, Record<string, DeptMembershipData>> = {};
      res.data.forEach((r: any) => {
        if (!map[r.monthKey]) {
          map[r.monthKey] = {};
        }
        map[r.monthKey][r.department] = {
          assemblyAdmit: r.assemblyAdmit || 0,
          assemblyAccident: r.assemblyAccident || 0,
          evangIncrease: r.evangIncrease || 0,
          evangDecrease: r.evangDecrease || 0,
          attendIncrease: r.attendIncrease || 0,
          attendDecrease: r.attendDecrease || 0,
          calculatedEvangReg: r.calculatedEvangReg || 0
        };
      });
      setDbRecords(map);
    } catch (e) {
      console.error("Failed to fetch membership records from DB", e);
    } finally {
      setLoadingDb(false);
    }
  };

  useEffect(() => {
    fetchDbRecords();
  }, [selectedChurch, selectedYear]);

  // Admin Users list for Modal
  const [adminUsers, setAdminUsers] = useState<UserItem[]>([]);

  // Unlock Request Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [requestMonth, setRequestMonth] = useState<string>('7월');
  const [requestReason, setRequestReason] = useState<string>('');
  const [requestAdminUser, setRequestAdminUser] = useState<string>('');

  const [hasEditPermission, setHasEditPermission] = useState<boolean>(false);
  const [hasPrevEditPermission, setHasPrevEditPermission] = useState<boolean>(false);

  const checkAccessPermission = async () => {
    try {
      const res = await api.get(`/membership/edit-requests/check?church=${encodeURIComponent(selectedChurch)}&year=${encodeURIComponent(selectedYear)}&month=${encodeURIComponent(selectedMonthInput)}`);
      setHasEditPermission(res.data?.hasAccess || false);
    } catch (e) {
      setHasEditPermission(false);
    }
  };

  const checkPrevAccessPermission = async (prevMonth: string) => {
    try {
      const res = await api.get(`/membership/edit-requests/check?church=${encodeURIComponent(selectedChurch)}&year=${encodeURIComponent(selectedYear)}&month=${encodeURIComponent(prevMonth)}`);
      setHasPrevEditPermission(res.data?.hasAccess || false);
    } catch (e) {
      setHasPrevEditPermission(false);
    }
  };

  useEffect(() => {
    checkAccessPermission();
    const prevMonthKey = getPreviousMonthKey(selectedMonthInput);
    checkPrevAccessPermission(prevMonthKey);
  }, [selectedChurch, selectedYear, selectedMonthInput]);

  useEffect(() => {
    const handleRefresh = () => {
      checkAccessPermission();
      const prevMonthKey = getPreviousMonthKey(selectedMonthInput);
      checkPrevAccessPermission(prevMonthKey);
    };
    window.addEventListener('refreshEditRequests', handleRefresh);
    return () => window.removeEventListener('refreshEditRequests', handleRefresh);
  }, [selectedChurch, selectedYear, selectedMonthInput]);

  // Fetch help descriptions on mount
  useEffect(() => {
    adminService.getConfigs().then((data) => {
      const map: Record<string, string> = {};
      data.forEach((c: any) => {
        if (c.configKey.startsWith('DESC_MEMBERSHIP_')) {
          map[c.configKey] = c.configValue;
        }
      });
      setHelpTexts(prev => ({ ...prev, ...map }));
    }).catch((e) => {
      console.warn("Failed to load help descriptions from DB, using defaults:", e);
    });
  }, []);

  // Load User Scope & Available Churches
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    let scope = '전체';
    let role = 'ROLE_ADMIN';
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        role = u.role || 'ROLE_ADMIN';
        scope = u.assignedCountry || '전체';
      } catch (e) {}
    }

    let normRole = role.toUpperCase();
    if (normRole === 'ROLE_해외선교부 담당자' || normRole === 'ROLE_USER' || normRole === '해외선교부 담당자' || normRole === 'USER') {
      normRole = 'ROLE_USER';
    } else if (normRole === 'ROLE_지파 담당자' || normRole === 'ROLE_JIPA' || normRole === '지파 담당자' || normRole === 'JIPA') {
      normRole = 'ROLE_JIPA';
    } else if (normRole === 'ROLE_일반 회원' || normRole === 'ROLE_GUEST' || normRole === '일반 회원' || normRole === 'GUEST') {
      normRole = 'ROLE_GUEST';
    } else if (normRole === 'ROLE_관리자' || normRole === 'ROLE_ADMIN' || normRole === '관리자' || normRole === 'ADMIN') {
      normRole = 'ROLE_ADMIN';
    }

    setUserScope(scope);
    setUserRole(normRole);

    const loadAvailableChurches = async () => {
      let list: { id: string; name: string; jipa: string; sortOrder?: number }[] = [];
      try {
        const data = await diagnosisService.getChurches();
        if (data && data.length > 0) {
          list = data.map((c: any) => ({
            id: c.name,
            name: c.name,
            jipa: c.jipa || '맛디아',
            sortOrder: c.sortOrder
          }));
        }
      } catch (err) {
        console.warn("Failed to fetch churches from API, using default list:", err);
      }

      if (list.length === 0) {
        defaultChurchesData.forEach((c: any) => {
          list.push({ id: c.name, name: c.name, jipa: c.jipa || '맛디아', sortOrder: c.sortOrder });
        });
      }

      list.sort((a, b) => {
        const orderA = a.sortOrder !== undefined && a.sortOrder !== null ? a.sortOrder : 999999;
        const orderB = b.sortOrder !== undefined && b.sortOrder !== null ? b.sortOrder : 999999;
        if (orderA !== orderB) return orderA - orderB;
        return a.name.localeCompare(b.name, 'ko');
      });

      setAvailableChurches(list);

      if (normRole !== 'ROLE_ADMIN' && normRole !== 'ADMIN' && scope !== '전체') {
        const matched = list.find(c => c.name === scope || `${c.jipa} · ${c.name}` === scope);
        if (matched) {
          setSelectedChurch(matched.name);
        } else {
          setSelectedChurch(list[0]?.name || '도쿄교회');
        }
      } else {
        setSelectedChurch('도쿄교회');
      }
    };
    loadAvailableChurches();

    const loadUsers = async () => {
      try {
        const users = await adminService.getUsers();
        const admins = users.filter(u => u.role === 'ROLE_USER' || u.role === 'ROLE_ADMIN');
        setAdminUsers(admins);
        if (admins.length > 0) {
          setRequestAdminUser(admins[0].name);
        }
      } catch (e) {
        setAdminUsers([
          { username: 'user', name: '해외선교부 담당자', role: 'ROLE_USER' },
          { username: 'admin', name: '최고 관리자', role: 'ROLE_ADMIN' }
        ]);
        setRequestAdminUser('해외선교부 담당자');
      }
    };
    loadUsers();
  }, []);

  // Sync inputs with DB values on active month selection change
  useEffect(() => {
    const inputs: Record<string, DeptMembershipData> = {};
    DEPARTMENTS.forEach(dept => {
      inputs[dept] = getMonthlyData(selectedMonthInput, dept);
    });
    setCurrentMonthInputs(inputs);
  }, [selectedMonthInput, dbRecords]);

  // Mock Monthly Data Generator with Database priority
  const getMonthlyData = (monthKey: string, dept: string): DeptMembershipData => {
    if (dbRecords[monthKey] && dbRecords[monthKey][dept]) {
      return dbRecords[monthKey][dept];
    }
    return { assemblyAdmit: 0, assemblyAccident: 0, evangIncrease: 0, evangDecrease: 0, attendIncrease: 0, attendDecrease: 0, calculatedEvangReg: 0 };
  };

  // Filter months to render
  const getFilteredMonths = () => {
    if (selectedMonthCheck === '전체') {
      const curMonthNum = new Date().getMonth() + 1; // 1-12
      return ALL_MONTHS.slice(0, curMonthNum);
    }
    return [selectedMonthCheck];
  };

  const filteredMonths = getFilteredMonths();

  // Compute KPI Totals for Tab 1
  const computeKpiTotals = () => {
    let totalAdmit = 0;
    let totalAccident = 0;
    let totalIncrease = 0;
    let latestMonthReg = 0;

    const allMonthsToShow = getFilteredMonths();
    const latestMonth = allMonthsToShow[allMonthsToShow.length - 1] || '1월';

    DEPARTMENTS.forEach(dept => {
      allMonthsToShow.forEach(m => {
        const d = getMonthlyData(m, dept);
        totalAdmit += d.assemblyAdmit;
        totalAccident += d.assemblyAccident;
        totalIncrease += d.evangIncrease;
      });
      const latestData = getMonthlyData(latestMonth, dept);
      latestMonthReg += latestData.calculatedEvangReg || 0;
    });

    return { latestMonthReg, totalIncrease, totalAccident };
  };

  const kpi = computeKpiTotals();

  // Submit Unlock Request Modal
  const handleSendUnlockRequest = async () => {
    if (!requestReason.trim()) {
      alert('수정 요청 사유를 입력해 주세요.');
      return;
    }
    const userStr = localStorage.getItem('user');
    let username = 'admin';
    if (userStr) {
      try {
        username = JSON.parse(userStr).username || 'admin';
      } catch (e) {}
    }
    try {
      await api.post('/membership/edit-requests', {
        churchName: selectedChurch,
        yearStr: selectedYear,
        monthKey: requestMonth,
        reason: requestReason,
        requestedBy: username,
        requestedTo: requestAdminUser
      });
      logService.addAccessLog(
        `🔒 이전 월 수정 요청 (${requestMonth})`,
        `/membership/request?month=${requestMonth}&reason=${encodeURIComponent(requestReason)}`
      );
      alert(`[${requestMonth}] 데이터 수정 요청이 ${requestAdminUser} 담당자에게 성공적으로 전송되었습니다!\n승인 후 해당 월 수정이 활성화됩니다.`);
      setIsModalOpen(false);
      setRequestReason('');
      window.dispatchEvent(new Event('refreshEditRequests'));
    } catch (e) {
      alert('수정 요청 전송 중 오류가 발생했습니다.');
    }
  };

  // Handle Input Change for Input Tab
  const handleInputChange = (dept: string, field: keyof DeptMembershipData, value: number) => {
    setCurrentMonthInputs(prev => ({
      ...prev,
      [dept]: {
        ...prev[dept],
        [field]: Math.max(0, value)
      }
    }));
  };

  const isScopeRestricted = userRole !== 'ROLE_ADMIN' && userRole !== 'ADMIN' && userScope !== '전체';

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '20px' }}>
      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #1e293b, #0f172a)',
        color: '#ffffff',
        borderRadius: '20px',
        padding: '28px 32px',
        marginBottom: '24px',
        boxShadow: '0 10px 30px rgba(15, 23, 42, 0.15)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.1)', padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 700, color: '#38bdf8', marginBottom: '10px' }}>
            <Sparkles size={14} /> 해외선교부 신앙 프로세스 3단계
          </div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0, letterSpacing: '-0.5px', color: '#f8fafc' }}>
            ③ 내무 · 재적 및 입교 관리 포탈
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: '6px 0 0 0' }}>
            전세계 해외교회의 월별 부서별 회별 재적(입교/사고), 전도 재적(증감), 출결 재적(증감) 데이터를 확인하고 합산합니다.
          </p>
        </div>

        {/* Sub-tab Switches */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.08)', padding: '5px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.1)' }}>
          <button
            onClick={() => navigate('/membership/check')}
            style={{
              padding: '10px 22px',
              borderRadius: '10px',
              border: 'none',
              fontSize: '0.92rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
              background: activeTab === 'check' ? '#ffffff' : 'transparent',
              color: activeTab === 'check' ? '#0f172a' : '#cbd5e1',
              boxShadow: activeTab === 'check' ? '0 4px 14px rgba(0,0,0,0.2)' : 'none'
            }}
          >
            <BarChart3 size={18} color={activeTab === 'check' ? '#2563eb' : '#cbd5e1'} />
            1. 교회별 데이터 확인
          </button>

          <button
            onClick={() => navigate('/membership/input')}
            style={{
              padding: '10px 22px',
              borderRadius: '10px',
              border: 'none',
              fontSize: '0.92rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
              background: activeTab === 'input' ? '#ffffff' : 'transparent',
              color: activeTab === 'input' ? '#0f172a' : '#cbd5e1',
              boxShadow: activeTab === 'input' ? '0 4px 14px rgba(0,0,0,0.2)' : 'none'
            }}
          >
            <Edit3 size={18} color={activeTab === 'input' ? '#16a34a' : '#cbd5e1'} />
            2. 월별 데이터 입력
          </button>
        </div>
      </div>

      {/* Global Control Bar */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '18px 24px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        boxShadow: '0 4px 14px rgba(0,0,0,0.03)'
      }}>
        {/* Left: Church Selection Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, color: '#1e293b', fontSize: '0.95rem' }}>
            <Building2 size={20} color="#2563eb" /> 교회 선택
          </div>

          <select
            value={selectedChurch}
            onChange={(e) => setSelectedChurch(e.target.value)}
            disabled={isScopeRestricted}
            style={{
              padding: '10px 16px',
              borderRadius: '10px',
              border: '1.5px solid #cbd5e1',
              fontSize: '0.92rem',
              fontWeight: 700,
              color: '#0f172a',
              background: isScopeRestricted ? '#f1f5f9' : '#ffffff',
              cursor: isScopeRestricted ? 'not-allowed' : 'pointer',
              minWidth: '220px',
              outline: 'none'
            }}
          >
            {availableChurches
              .filter(c => !isScopeRestricted || c.name === selectedChurch || `${c.jipa} · ${c.name}` === userScope)
              .map((c) => (
                <option key={c.id} value={c.name}>
                  {c.jipa} · {c.name}
                </option>
              ))}
          </select>

          {isScopeRestricted && (
            <span style={{ fontSize: '0.8rem', background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '4px 10px', borderRadius: '6px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Lock size={12} /> 담당 범위 제한: {userScope}
            </span>
          )}
        </div>

        {/* Right: Year & Month Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Year Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '6px 12px', borderRadius: '10px' }}>
            <Calendar size={16} color="#64748b" />
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>연도</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              style={{ border: 'none', background: 'transparent', fontWeight: 800, color: '#2563eb', fontSize: '0.9rem', outline: 'none', cursor: 'pointer' }}
            >
              {dynamicYears.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Month Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '6px 14px', borderRadius: '10px' }}>
            <Filter size={16} color="#16a34a" />
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#166534' }}>월 선택</span>
            {activeTab === 'check' ? (
              <select
                value={selectedMonthCheck}
                onChange={(e) => setSelectedMonthCheck(e.target.value)}
                style={{ border: 'none', background: 'transparent', fontWeight: 800, color: '#16a34a', fontSize: '0.9rem', outline: 'none', cursor: 'pointer', maxWidth: '280px' }}
              >
                <option value="전체">🌐 전체 (1월 ~ 현재월)</option>
                {ALL_MONTHS.slice(0, getMonthsLimit()).map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            ) : (
              <select
                value={selectedMonthInput}
                onChange={(e) => setSelectedMonthInput(e.target.value)}
                style={{ border: 'none', background: 'transparent', fontWeight: 800, color: '#16a34a', fontSize: '0.9rem', outline: 'none', cursor: 'pointer', maxWidth: '280px' }}
              >
                {ALL_MONTHS.slice(0, getMonthsLimit()).map((m) => (
                  <option key={m} value={m}>{m} {m === `${new Date().getMonth() + 1}월` ? '[현재월]' : ''}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: 교회별 데이터 확인 (Check Data)                                    */}
      {/* ========================================================================= */}
      {activeTab === 'check' && (
        <div>
          {/* Top KPI Cards (현재적 | 증가수 | 사고수) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '28px' }}>
            {/* Card 1: 현재적 */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '22px 26px', boxShadow: '0 4px 14px rgba(0,0,0,0.03)' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b', marginBottom: '6px' }}>
                👤 현재적 (전도 재적 총계)
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                <span style={{ fontSize: '2rem', fontWeight: 900, color: '#2563eb' }}>{kpi.latestMonthReg}명</span>
              </div>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '6px' }}>
                가장 최신 월 기준 전성도 전도재적 총합
              </div>
            </div>

            {/* Card 2: 총 증가수 */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '22px 26px', boxShadow: '0 4px 14px rgba(0,0,0,0.03)' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b', marginBottom: '6px' }}>
                📈 총 전도 재적 증가수
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                <span style={{ fontSize: '2rem', fontWeight: 900, color: '#16a34a' }}>{kpi.totalIncrease}명</span>
              </div>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '6px' }}>
                선택 기간 동안 발생한 전도 재적 증가수 누적
              </div>
            </div>

            {/* Card 3: 총 사고수 */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '22px 26px', boxShadow: '0 4px 14px rgba(0,0,0,0.03)' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b', marginBottom: '6px' }}>
                🚨 총 사고(제적/사고) 수
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                <span style={{ fontSize: '2rem', fontWeight: 900, color: '#ef4444' }}>{kpi.totalAccident}명</span>
              </div>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '6px' }}>
                선택 기간 동안 회별 재적에서 이탈한 사고자 수 누적
              </div>
            </div>
          </div>

          {/* Table (1): 회별 재적수 */}
          {renderSummaryTable('(1) 회별 재적수', helpTexts.DESC_MEMBERSHIP_STATUS_1, '입교', '사고', 'assemblyAdmit', 'assemblyAccident', filteredMonths, getMonthlyData)}

          {/* Table (2): 전도 재적수 */}
          {renderSummaryTable('(2) 전도 재적수', helpTexts.DESC_MEMBERSHIP_STATUS_2, '증가', '감소', 'evangIncrease', 'evangDecrease', filteredMonths, getMonthlyData)}

          {/* Table (3): 출결 재적수 */}
          {renderSummaryTable('(3) 출결 재적수', helpTexts.DESC_MEMBERSHIP_STATUS_3, '증가', '감소', 'attendIncrease', 'attendDecrease', filteredMonths, getMonthlyData)}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: 월별 데이터 입력 (Input monthly data)                               */}
      {/* ========================================================================= */}
      {activeTab === 'input' && (() => {
        const curCalendarMonth = `${new Date().getMonth() + 1}월`;
        const isEditable = (selectedMonthInput === curCalendarMonth) || hasEditPermission;
        const prevMonthKey = getPreviousMonthKey(selectedMonthInput);

        return (
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '28px', boxShadow: '0 4px 14px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
              <div>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  📥 월별 내무 실적 입력 및 취합 ({selectedChurch} · {selectedMonthInput})
                </h2>
                <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
                  이전 월 데이터는 수정이 잠겨있으며, 당월({curCalendarMonth}) 실적만 직접 편집할 수 있습니다.
                </p>
              </div>

              {isEditable ? (
                <button
                  onClick={async () => {
                    try {
                      const recordsToSave = DEPARTMENTS.map(dept => {
                        const data = currentMonthInputs[dept];
                        const prev = getMonthlyData(prevMonthKey, dept);
                        const calculatedNextReg = Math.max(0, (prev.calculatedEvangReg || 0) + data.evangIncrease - data.evangDecrease);
                        return {
                          churchName: selectedChurch,
                          yearStr: selectedYear,
                          monthKey: selectedMonthInput,
                          department: dept,
                          assemblyAdmit: data.assemblyAdmit,
                          assemblyAccident: data.assemblyAccident,
                          evangIncrease: data.evangIncrease,
                          evangDecrease: data.evangDecrease,
                          attendIncrease: data.attendIncrease,
                          attendDecrease: data.attendDecrease,
                          calculatedEvangReg: calculatedNextReg,
                          updatedBy: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!).username : 'admin'
                        };
                      });
                      await api.post('/membership/records', recordsToSave);
                      logService.addAccessLog('💾 월별 내무 실적 저장 (DB 연동)', `/membership/save?church=${encodeURIComponent(selectedChurch)}&month=${selectedMonthInput}`);
                      alert(`[${selectedChurch} · ${selectedMonthInput}] 내무 데이터가 저장되었으며, 전도재적(regCount)에 실시간 반영되었습니다!`);
                      fetchDbRecords();
                      checkAccessPermission();
                      window.dispatchEvent(new Event('refreshEditRequests'));
                    } catch (e) {
                      alert('데이터베이스 저장 중 오류가 발생했습니다.');
                    }
                  }}
                  style={{
                    background: 'linear-gradient(135deg, #16a34a, #15803d)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '12px 24px',
                    fontWeight: 800,
                    fontSize: '0.95rem',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(22, 163, 74, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <CheckCircle2 size={18} /> 실적 저장하기
                </button>
              ) : (
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#64748b', padding: '10px 18px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Lock size={16} /> 수정 권한이 잠겨있습니다
                </div>
              )}
            </div>

            {/* Table layout (Comparative Last month vs Current Month) */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'center' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #cbd5e1' }}>
                    <th style={{ padding: '14px', textAlign: 'left', fontWeight: 800, color: '#334155' }}>구분 (부서)</th>
                    
                    {/* Previous Month Header */}
                    <th colSpan={6} style={{ padding: '12px', background: hasPrevEditPermission ? '#f0fdf4' : '#fef2f2', borderLeft: '2px solid ' + (hasPrevEditPermission ? '#bbf7d0' : '#fecaca'), color: hasPrevEditPermission ? '#166534' : '#991b1b', fontWeight: 800 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                        <span>{prevMonthKey} {hasPrevEditPermission ? '(이전 월 · 🔓 수정 가능)' : '(이전 월 · 🔒 잠금)'}</span>
                        {!hasPrevEditPermission && (
                          <button
                            onClick={() => {
                              setRequestMonth(prevMonthKey);
                              setIsModalOpen(true);
                            }}
                            style={{
                              background: '#ffffff',
                              border: '1px solid #fca5a5',
                              color: '#dc2626',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              boxShadow: '0 2px 6px rgba(220, 38, 38, 0.15)'
                            }}
                          >
                            <Lock size={12} /> 수정 허용 요청
                          </button>
                        )}
                      </div>
                    </th>

                    {/* Current Month Header */}
                    <th colSpan={6} style={{ padding: '12px', background: isEditable ? '#f0fdf4' : '#fef2f2', borderLeft: '2px solid ' + (isEditable ? '#bbf7d0' : '#fecaca'), color: isEditable ? '#166534' : '#991b1b', fontWeight: 800 }}>
                      {isEditable ? (
                        selectedMonthInput === curCalendarMonth ? (
                          `✨ ${selectedMonthInput} (현재 월 · ✏️ 편집 가능)`
                        ) : (
                          `🔓 ${selectedMonthInput} (이전 월 · ✏️ 수정 허용됨)`
                        )
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                          <span>{selectedMonthInput} (이전 월 · 🔒 잠금)</span>
                          <button
                            onClick={() => {
                              setRequestMonth(selectedMonthInput);
                              setIsModalOpen(true);
                            }}
                            style={{
                              background: '#ffffff',
                              border: '1px solid #fca5a5',
                              color: '#dc2626',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 800,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              boxShadow: '0 2px 6px rgba(220, 38, 38, 0.15)'
                            }}
                          >
                            <Lock size={12} /> 수정 허용 요청
                          </button>
                        </div>
                      )}
                    </th>
                  </tr>

                  {/* Sub Headers */}
                  <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', fontSize: '0.75rem', color: '#475569' }}>
                    <th></th>
                    {/* Previous Month Columns */}
                    <th style={{ padding: '6px', borderLeft: '2px solid #fecaca', background: '#fff5f5' }}>회(입)</th>
                    <th style={{ padding: '6px', background: '#fff5f5' }}>회(사)</th>
                    <th style={{ padding: '6px', background: '#fff5f5' }}>전(증)</th>
                    <th style={{ padding: '6px', background: '#fff5f5' }}>전(감)</th>
                    <th style={{ padding: '6px', background: '#fff5f5' }}>출(증)</th>
                    <th style={{ padding: '6px', background: '#fff5f5' }}>출(감)</th>

                    {/* Current Month Columns */}
                    <th style={{ padding: '6px', borderLeft: '2px solid ' + (isEditable ? '#bbf7d0' : '#fecaca'), background: isEditable ? '#f0fdf4' : '#fff5f5', color: '#2563eb' }}>회(입)</th>
                    <th style={{ padding: '6px', background: isEditable ? '#f0fdf4' : '#fff5f5', color: '#dc2626' }}>회(사)</th>
                    <th style={{ padding: '6px', background: isEditable ? '#f0fdf4' : '#fff5f5', color: '#16a34a' }}>전(증)</th>
                    <th style={{ padding: '6px', background: isEditable ? '#f0fdf4' : '#fff5f5', color: '#dc2626' }}>전(감)</th>
                    <th style={{ padding: '6px', background: isEditable ? '#f0fdf4' : '#fff5f5', color: '#7c3aed' }}>출(증)</th>
                    <th style={{ padding: '6px', background: isEditable ? '#f0fdf4' : '#fff5f5', color: '#dc2626' }}>출(감)</th>
                  </tr>
                </thead>
                <tbody>
                  {DEPARTMENTS.map(dept => {
                    const prev = getMonthlyData(prevMonthKey, dept);
                    const curr = currentMonthInputs[dept] || { assemblyAdmit: 0, assemblyAccident: 0, evangIncrease: 0, evangDecrease: 0, attendIncrease: 0, attendDecrease: 0 };

                    // Calculate real-time virtual "전도재적" count to show the user
                    const calculatedNextReg = Math.max(0, (prev.calculatedEvangReg || 0) + curr.evangIncrease - curr.evangDecrease);

                    return (
                      <tr key={dept} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 700, color: '#0f172a' }}>
                          {dept}
                          <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, marginLeft: '6px' }}>
                            ({calculatedNextReg}명)
                          </span>
                        </td>

                        {/* Readonly Previous Month Cells */}
                        <td style={{ padding: '10px 4px', borderLeft: '2px solid #fecaca', background: '#fafafa', color: '#64748b' }}>{prev.assemblyAdmit}</td>
                        <td style={{ padding: '10px 4px', background: '#fafafa', color: '#94a3b8' }}>{prev.assemblyAccident}</td>
                        <td style={{ padding: '10px 4px', background: '#fafafa', color: '#64748b' }}>{prev.evangIncrease}</td>
                        <td style={{ padding: '10px 4px', background: '#fafafa', color: '#94a3b8' }}>{prev.evangDecrease}</td>
                        <td style={{ padding: '10px 4px', background: '#fafafa', color: '#64748b' }}>{prev.attendIncrease}</td>
                        <td style={{ padding: '10px 4px', background: '#fafafa', color: '#94a3b8' }}>{prev.attendDecrease}</td>

                        {/* Editable Current Month Cells */}
                        {isEditable ? (
                          <>
                            <td style={{ padding: '8px 2px', borderLeft: '2px solid #bbf7d0', background: '#f8fafc' }}>
                              <input
                                type="number"
                                value={curr.assemblyAdmit}
                                onChange={(e) => handleInputChange(dept, 'assemblyAdmit', parseInt(e.target.value) || 0)}
                                style={{ width: '45px', padding: '6px', textAlign: 'center', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 800, color: '#2563eb' }}
                              />
                            </td>
                            <td style={{ padding: '8px 2px', background: '#f8fafc' }}>
                              <input
                                type="number"
                                value={curr.assemblyAccident}
                                onChange={(e) => handleInputChange(dept, 'assemblyAccident', parseInt(e.target.value) || 0)}
                                style={{ width: '45px', padding: '6px', textAlign: 'center', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 800, color: '#dc2626' }}
                              />
                            </td>
                            <td style={{ padding: '8px 2px', background: '#f8fafc' }}>
                              <input
                                type="number"
                                value={curr.evangIncrease}
                                onChange={(e) => handleInputChange(dept, 'evangIncrease', parseInt(e.target.value) || 0)}
                                style={{ width: '45px', padding: '6px', textAlign: 'center', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 800, color: '#16a34a' }}
                              />
                            </td>
                            <td style={{ padding: '8px 2px', background: '#f8fafc' }}>
                              <input
                                type="number"
                                value={curr.evangDecrease}
                                onChange={(e) => handleInputChange(dept, 'evangDecrease', parseInt(e.target.value) || 0)}
                                style={{ width: '45px', padding: '6px', textAlign: 'center', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 800, color: '#dc2626' }}
                              />
                            </td>
                            <td style={{ padding: '8px 2px', background: '#f8fafc' }}>
                              <input
                                type="number"
                                value={curr.attendIncrease}
                                onChange={(e) => handleInputChange(dept, 'attendIncrease', parseInt(e.target.value) || 0)}
                                style={{ width: '45px', padding: '6px', textAlign: 'center', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 800, color: '#7c3aed' }}
                              />
                            </td>
                            <td style={{ padding: '8px 2px', background: '#f8fafc' }}>
                              <input
                                type="number"
                                value={curr.attendDecrease}
                                onChange={(e) => handleInputChange(dept, 'attendDecrease', parseInt(e.target.value) || 0)}
                                style={{ width: '45px', padding: '6px', textAlign: 'center', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 800, color: '#dc2626' }}
                              />
                            </td>
                          </>
                        ) : (
                          <>
                            <td style={{ padding: '10px 4px', borderLeft: '2px solid #cbd5e1', background: '#fafafa', color: '#2563eb', fontWeight: 700 }}>{curr.assemblyAdmit}</td>
                            <td style={{ padding: '10px 4px', background: '#fafafa', color: '#dc2626', fontWeight: 700 }}>{curr.assemblyAccident}</td>
                            <td style={{ padding: '10px 4px', background: '#fafafa', color: '#16a34a', fontWeight: 700 }}>{curr.evangIncrease}</td>
                            <td style={{ padding: '10px 4px', background: '#fafafa', color: '#dc2626', fontWeight: 700 }}>{curr.evangDecrease}</td>
                            <td style={{ padding: '10px 4px', background: '#fafafa', color: '#7c3aed', fontWeight: 700 }}>{curr.attendIncrease}</td>
                            <td style={{ padding: '10px 4px', background: '#fafafa', color: '#dc2626', fontWeight: 700 }}>{curr.attendDecrease}</td>
                          </>
                        )}
                      </tr>
                    );
                  })}

                  {/* Total Row */}
                  <tr style={{ background: '#f8fafc', borderTop: '2px solid #cbd5e1', fontWeight: 900 }}>
                    <td style={{ padding: '14px', textAlign: 'left', fontWeight: 900 }}>
                      합계
                      <span style={{ fontSize: '0.78rem', color: '#475569', fontWeight: 700, marginLeft: '6px' }}>
                        ({DEPARTMENTS.reduce((sum, d) => sum + Math.max(0, (getMonthlyData(prevMonthKey, d).calculatedEvangReg || 0) + (currentMonthInputs[d]?.evangIncrease || 0) - (currentMonthInputs[d]?.evangDecrease || 0)), 0)}명)
                      </span>
                    </td>

                    {/* Previous Month Totals */}
                    <td style={{ padding: '10px 4px', borderLeft: '2px solid #fecaca' }}>{DEPARTMENTS.reduce((sum, d) => sum + getMonthlyData(prevMonthKey, d).assemblyAdmit, 0)}</td>
                    <td style={{ padding: '10px 4px' }}>{DEPARTMENTS.reduce((sum, d) => sum + getMonthlyData(prevMonthKey, d).assemblyAccident, 0)}</td>
                    <td style={{ padding: '10px 4px' }}>{DEPARTMENTS.reduce((sum, d) => sum + getMonthlyData(prevMonthKey, d).evangIncrease, 0)}</td>
                    <td style={{ padding: '10px 4px' }}>{DEPARTMENTS.reduce((sum, d) => sum + getMonthlyData(prevMonthKey, d).evangDecrease, 0)}</td>
                    <td style={{ padding: '10px 4px' }}>{DEPARTMENTS.reduce((sum, d) => sum + getMonthlyData(prevMonthKey, d).attendIncrease, 0)}</td>
                    <td style={{ padding: '10px 4px' }}>{DEPARTMENTS.reduce((sum, d) => sum + getMonthlyData(prevMonthKey, d).attendDecrease, 0)}</td>

                    {/* Current Month Totals */}
                    <td style={{ padding: '10px 4px', borderLeft: '2px solid ' + (isEditable ? '#bbf7d0' : '#fecaca'), color: '#2563eb' }}>{DEPARTMENTS.reduce((sum, d) => sum + (currentMonthInputs[d]?.assemblyAdmit || 0), 0)}</td>
                    <td style={{ padding: '10px 4px', color: '#dc2626' }}>{DEPARTMENTS.reduce((sum, d) => sum + (currentMonthInputs[d]?.assemblyAccident || 0), 0)}</td>
                    <td style={{ padding: '10px 4px', color: '#16a34a' }}>{DEPARTMENTS.reduce((sum, d) => sum + (currentMonthInputs[d]?.evangIncrease || 0), 0)}</td>
                    <td style={{ padding: '10px 4px', color: '#dc2626' }}>{DEPARTMENTS.reduce((sum, d) => sum + (currentMonthInputs[d]?.evangDecrease || 0), 0)}</td>
                    <td style={{ padding: '10px 4px', color: '#7c3aed' }}>{DEPARTMENTS.reduce((sum, d) => sum + (currentMonthInputs[d]?.attendIncrease || 0), 0)}</td>
                    <td style={{ padding: '10px 4px', color: '#dc2626' }}>{DEPARTMENTS.reduce((sum, d) => sum + (currentMonthInputs[d]?.attendDecrease || 0), 0)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* Unlock Request Modal Window (🔒 이전 월 수정 허용 요청)                    */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '540px',
            padding: '28px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
            animation: 'fadeIn 0.2s ease'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#fef2f2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Lock size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  🔒 이전 월 데이터 수정 허용 요청
                </h3>
                <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '2px 0 0 0' }}>
                  이전 월 데이터 보정을 위해 관리자 및 해외선교부 담당자에게 허용을 요청합니다.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
              {/* Target Month Field */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#334155', marginBottom: '6px' }}>
                  요청 대상 월
                </label>
                <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '10px 14px', borderRadius: '10px', fontWeight: 800, color: '#2563eb', fontSize: '0.92rem' }}>
                  {requestMonth} (잠금 상태)
                </div>
              </div>

              {/* Request Reason Field */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#334155', marginBottom: '6px' }}>
                  수정 요청 사유 <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <textarea
                  rows={3}
                  value={requestReason}
                  onChange={(e) => setRequestReason(e.target.value)}
                  placeholder="예: 6월 청년회 입교수 실적 오기입 누락건 보정 요청"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.88rem',
                    outline: 'none',
                    resize: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Admin User Target Field */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#334155', marginBottom: '6px' }}>
                  요청 대상 담당자 (해외선교부)
                </label>
                <select
                  value={requestAdminUser}
                  onChange={(e) => setRequestAdminUser(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                >
                  {adminUsers.map(u => (
                    <option key={u.username} value={u.name}>
                      {u.name} ({u.role === 'ROLE_ADMIN' ? '관리자' : '해선부 담당자'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setRequestReason('');
                }}
                style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#475569', padding: '10px 20px', borderRadius: '10px', fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer' }}
              >
                취소
              </button>
              <button
                onClick={handleSendUnlockRequest}
                style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: '#ffffff', border: 'none', padding: '10px 20px', borderRadius: '10px', fontSize: '0.88rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 10px rgba(239, 68, 68, 0.2)' }}
              >
                <Send size={14} /> 요청 전송하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Embedded Help Modal Window */}
      {activeHelpKey && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.55)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '460px',
            padding: '24px',
            boxShadow: '0 15px 40px rgba(0,0,0,0.25)'
          }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: '0 0 12px 0' }}>
              {activeHelpTitle}
            </h3>
            <p style={{ fontSize: '0.9rem', color: '#334155', lineHeight: '1.6', margin: '0 0 20px 0' }}>
              {helpTexts[activeHelpKey] || '설명글이 등록되어 있지 않습니다.'}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setActiveHelpKey(null)}
                style={{ background: '#2563eb', color: '#ffffff', border: 'none', padding: '8px 18px', borderRadius: '8px', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer' }}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper renderer for Tab 1 Summary Tables
const renderSummaryTable = (
  title: string,
  desc: string,
  col1Label: string,
  col2Label: string,
  field1: keyof DeptMembershipData,
  field2: keyof DeptMembershipData,
  months: string[],
  getMonthlyData: (month: string, dept: string) => DeptMembershipData
) => {
  return (
    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', marginBottom: '28px', boxShadow: '0 4px 14px rgba(0,0,0,0.03)' }}>
      <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span>📊 {title}</span>
      </h2>
      <p style={{ color: '#64748b', fontSize: '0.82rem', margin: '0 0 16px 0' }}>
        {desc}
      </p>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'center' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #cbd5e1', color: '#334155' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 800 }}>구분 (부서)</th>
              {months.map(m => (
                <th key={m} colSpan={2} style={{ padding: '10px', borderLeft: '1px solid #e2e8f0', fontWeight: 800 }}>
                  {m}
                </th>
              ))}
              <th colSpan={2} style={{ padding: '10px', borderLeft: '2px solid #cbd5e1', background: '#eff6ff', color: '#1e40af', fontWeight: 800 }}>
                누적 합계
              </th>
            </tr>
            <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', fontSize: '0.78rem', color: '#475569' }}>
              <th></th>
              {months.map(m => (
                <React.Fragment key={m}>
                  <th style={{ padding: '6px', borderLeft: '1px solid #e2e8f0', color: '#2563eb' }}>{col1Label}</th>
                  <th style={{ padding: '6px', color: '#dc2626' }}>{col2Label}</th>
                </React.Fragment>
              ))}
              <th style={{ padding: '6px', borderLeft: '2px solid #cbd5e1', background: '#dbeafe', color: '#1e40af' }}>{col1Label}</th>
              <th style={{ padding: '6px', background: '#dbeafe', color: '#1e40af' }}>{col2Label}</th>
            </tr>
          </thead>
          <tbody>
            {DEPARTMENTS.map(dept => {
              let sum1 = 0;
              let sum2 = 0;

              return (
                <tr key={dept} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: '#0f172a' }}>{dept}</td>
                  {months.map(m => {
                    const d = getMonthlyData(m, dept);
                    sum1 += (d[field1] as number) || 0;
                    sum2 += (d[field2] as number) || 0;
                    return (
                      <React.Fragment key={m}>
                        <td style={{ padding: '10px 6px', borderLeft: '1px solid #e2e8f0', fontWeight: 700, color: '#2563eb' }}>{d[field1]}</td>
                        <td style={{ padding: '10px 6px', fontWeight: 700, color: '#dc2626' }}>{d[field2]}</td>
                      </React.Fragment>
                    );
                  })}
                  <td style={{ padding: '10px 6px', borderLeft: '2px solid #cbd5e1', background: '#eff6ff', fontWeight: 800, color: '#1e40af' }}>{sum1}</td>
                  <td style={{ padding: '10px 6px', background: '#eff6ff', fontWeight: 800, color: '#1e40af' }}>{sum2}</td>
                </tr>
              );
            })}
            {/* Totals Row */}
            <tr style={{ background: '#f8fafc', borderTop: '2px solid #cbd5e1', fontWeight: 900, color: '#0f172a' }}>
              <td style={{ padding: '14px 16px', textAlign: 'left' }}>합계</td>
              {months.map(m => {
                const tot1 = DEPARTMENTS.reduce((acc, dept) => acc + ((getMonthlyData(m, dept)[field1] as number) || 0), 0);
                const tot2 = DEPARTMENTS.reduce((acc, dept) => acc + ((getMonthlyData(m, dept)[field2] as number) || 0), 0);
                return (
                  <React.Fragment key={m}>
                    <td style={{ padding: '12px 6px', borderLeft: '1px solid #e2e8f0', color: '#2563eb' }}>{tot1}</td>
                    <td style={{ padding: '12px 6px', color: '#dc2626' }}>{tot2}</td>
                  </React.Fragment>
                );
              })}
              <td style={{ padding: '12px 6px', borderLeft: '2px solid #cbd5e1', background: '#dbeafe', color: '#1e40af' }}>
                {DEPARTMENTS.reduce((acc, dept) => acc + months.reduce((mAcc, m) => mAcc + ((getMonthlyData(m, dept)[field1] as number) || 0), 0), 0)}
              </td>
              <td style={{ padding: '12px 6px', background: '#dbeafe', color: '#1e40af' }}>
                {DEPARTMENTS.reduce((acc, dept) => acc + months.reduce((mAcc, m) => mAcc + ((getMonthlyData(m, dept)[field2] as number) || 0), 0), 0)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
