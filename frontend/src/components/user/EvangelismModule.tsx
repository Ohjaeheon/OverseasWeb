import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { logService } from '../../services/logService';
import { adminService, UserItem } from '../../services/adminService';
import defaultChurchesData from '../../assets/defaultChurches.json';
import { Building2, Calendar, Lock, Send, CheckCircle2, BarChart3, Edit3, Sparkles, Filter } from 'lucide-react';

import api from '../../services/api';

interface DeptData {
  reg: number;       // 전도재적
  find: number;      // 찾기
  findDrop: number;  // 찾기 탈락
  gospel: number;    // 복음방
  gospelDrop: number;// 복음방 탈락
  admit: number;     // 가개강(등록)
  admitDrop: number; // 가개강 탈락
}

interface EvangelismModuleProps {
  initialTab?: 'check' | 'aggregate';
}

const DEPARTMENTS = ['교역자', '자문회', '장년회', '부녀회', '청년회'];

export const EvangelismModule: React.FC<EvangelismModuleProps> = ({ initialTab = 'check' }) => {
  const navigate = useNavigate();
  // 1. Navigation Sub-tab ('check': 교회별 데이터 확인, 'aggregate': 취합)
  const [activeTab, setActiveTab] = useState<'check' | 'aggregate'>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // 2. User Permission & Scope Guard
  const [userScope, setUserScope] = useState<string>('전체');
  const [userRole, setUserRole] = useState<string>('ROLE_ADMIN');
  const [availableChurches, setAvailableChurches] = useState<{ id: string; name: string; jipa: string }[]>([]);
  const [selectedChurch, setSelectedChurch] = useState<string>('도쿄교회');

  // 3. Date & Week Filters
  const [selectedYear, setSelectedYear] = useState<string>('2026년');
  const [selectedWeekCheck, setSelectedWeekCheck] = useState<string>('전체'); // For Tab 1
  const [selectedWeekAgg, setSelectedWeekAgg] = useState<string>('7월3주차');   // For Tab 2

  // 3-1. Current Week Data State for Aggregation Tab
  const [currentWeekInputs, setCurrentWeekInputs] = useState<Record<string, DeptData>>({
    '교역자': { reg: 0, find: 0, findDrop: 0, gospel: 0, gospelDrop: 0, admit: 0, admitDrop: 0 },
    '자문회': { reg: 0, find: 0, findDrop: 0, gospel: 0, gospelDrop: 0, admit: 0, admitDrop: 0 },
    '장년회': { reg: 0, find: 0, findDrop: 0, gospel: 0, gospelDrop: 0, admit: 0, admitDrop: 0 },
    '부녀회': { reg: 0, find: 0, findDrop: 0, gospel: 0, gospelDrop: 0, admit: 0, admitDrop: 0 },
    '청년회': { reg: 0, find: 0, findDrop: 0, gospel: 0, gospelDrop: 0, admit: 0, admitDrop: 0 },
  });

  // 4. Database Records State
  const [dbRecords, setDbRecords] = useState<Record<string, Record<string, DeptData>>>({});
  const [loadingDb, setLoadingDb] = useState<boolean>(false);

  const fetchDbRecords = async () => {
    setLoadingDb(true);
    try {
      const res = await api.get<any[]>(`/evangelism/records?church=${encodeURIComponent(selectedChurch)}&year=${selectedYear}`);
      const map: Record<string, Record<string, DeptData>> = {};
      res.data.forEach((r: any) => {
        if (!map[r.weekKey]) {
          map[r.weekKey] = {};
        }
        map[r.weekKey][r.department] = {
          reg: r.regCount || 20,
          find: r.findCount || 0,
          findDrop: r.findDropCount || 0,
          gospel: r.gospelCount || 0,
          gospelDrop: r.gospelDropCount || 0,
          admit: r.admitCount || 0,
          admitDrop: r.admitDropCount || 0
        };
      });
      setDbRecords(map);
    } catch (e) {
      console.error("Failed to fetch records from DB", e);
    } finally {
      setLoadingDb(false);
    }
  };

  useEffect(() => {
    fetchDbRecords();
  }, [selectedChurch, selectedYear]);

  // Reset selected weeks if they are invalid for the selected year
  useEffect(() => {
    const isCurrentYear = selectedYear === '2026년';
    const validWeeks = isCurrentYear ? [
      '전체', '1월', '2월', '3월', '4월', '5월', '6월', '7월',
      '1월1주차', '1월2주차', '1월3주차', '1월4주차',
      '2월1주차', '2월2주차', '2월3주차', '2월4주차',
      '3월1주차', '3월2주차', '3월3주차', '3월4주차',
      '4월1주차', '4월2주차', '4월3주차', '4월4주차',
      '5월1주차', '5월2주차', '5월3주차', '5월4주차',
      '6월1주차', '6월2주차', '6월3주차', '6월4주차',
      '7월1주차', '7월2주차', '7월3주차'
    ] : [
      '전체', '1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월',
      '1월1주차', '1월2주차', '1월3주차', '1월4주차',
      '2월1주차', '2월2주차', '2월3주차', '2월4주차',
      '3월1주차', '3월2주차', '3월3주차', '3월4주차',
      '4월1주차', '4월2주차', '4월3주차', '4월4주차',
      '5월1주차', '5월2주차', '5월3주차', '5월4주차',
      '6월1주차', '6월2주차', '6월3주차', '6월4주차',
      '7월1주차', '7월2주차', '7월3주차', '7월4주차',
      '8월1주차', '8월2주차', '8월3주차', '8월4주차',
      '9월1주차', '9월2주차', '9월3주차', '9월4주차',
      '10월1주차', '10월2주차', '10월3주차', '10월4주차',
      '11월1주차', '11월2주차', '11월3주차', '11월4주차',
      '12월1주차', '12월2주차', '12월3주차', '12월4주차'
    ];

    if (!validWeeks.includes(selectedWeekCheck)) {
      setSelectedWeekCheck('전체');
    }
    setSelectedWeekAgg(isCurrentYear ? '7월3주차' : '12월4주차');
  }, [selectedYear]);

  // 5. Admin Users list for Modal
  const [adminUsers, setAdminUsers] = useState<UserItem[]>([]);

  // 6. Unlock Request Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [requestWeek, setRequestWeek] = useState<string>('7월2주차');
  const [requestReason, setRequestReason] = useState<string>('');
  const [requestAdminUser, setRequestAdminUser] = useState<string>('');

  const [hasEditPermission, setHasEditPermission] = useState<boolean>(false);
  const [hasPrevEditPermission, setHasPrevEditPermission] = useState<boolean>(false);

  const checkAccessPermission = async () => {
    try {
      const res = await api.get(`/evangelism/edit-requests/check?church=${encodeURIComponent(selectedChurch)}&year=${encodeURIComponent(selectedYear)}&week=${encodeURIComponent(selectedWeekAgg)}`);
      setHasEditPermission(res.data?.hasAccess || false);
    } catch (e) {
      setHasEditPermission(false);
    }
  };

  const checkPrevAccessPermission = async (prevWeek: string) => {
    try {
      const res = await api.get(`/evangelism/edit-requests/check?church=${encodeURIComponent(selectedChurch)}&year=${encodeURIComponent(selectedYear)}&week=${encodeURIComponent(prevWeek)}`);
      setHasPrevEditPermission(res.data?.hasAccess || false);
    } catch (e) {
      setHasPrevEditPermission(false);
    }
  };

  useEffect(() => {
    checkAccessPermission();
    const isCurrentYear = selectedYear === '2026년';
    const ALL_WEEKS_LIST = isCurrentYear ? [
      '1월1주차', '1월2주차', '1월3주차', '1월4주차',
      '2월1주차', '2월2주차', '2월3주차', '2월4주차',
      '3월1주차', '3월2주차', '3월3주차', '3월4주차',
      '4월1주차', '4월2주차', '4월3주차', '4월4주차',
      '5월1주차', '5월2주차', '5월3주차', '5월4주차',
      '6월1주차', '6월2주차', '6월3주차', '6월4주차',
      '7월1주차', '7월2주차', '7월3주차'
    ] : [
      '1월1주차', '1월2주차', '1월3주차', '1월4주차',
      '2월1주차', '2월2주차', '2월3주차', '2월4주차',
      '3월1주차', '3월2주차', '3월3주차', '3월4주차',
      '4월1주차', '4월2주차', '4월3주차', '4월4주차',
      '5월1주차', '5월2주차', '5월3주차', '5월4주차',
      '6월1주차', '6월2주차', '6월3주차', '6월4주차',
      '7월1주차', '7월2주차', '7월3주차', '7월4주차',
      '8월1주차', '8월2주차', '8월3주차', '8월4주차',
      '9월1주차', '9월2주차', '9월3주차', '9월4주차',
      '10월1주차', '10월2주차', '10월3주차', '10월4주차',
      '11월1주차', '11월2주차', '11월3주차', '11월4주차',
      '12월1주차', '12월2주차', '12월3주차', '12월4주차'
    ];
    const selectedWeekIdx = ALL_WEEKS_LIST.indexOf(selectedWeekAgg);
    const prevWeekKey = selectedWeekIdx > 0 ? ALL_WEEKS_LIST[selectedWeekIdx - 1] : '1월1주차';
    checkPrevAccessPermission(prevWeekKey);
  }, [selectedChurch, selectedYear, selectedWeekAgg]);

  useEffect(() => {
    const handleRefresh = () => {
      checkAccessPermission();
      const isCurrentYear = selectedYear === '2026년';
      const ALL_WEEKS_LIST = isCurrentYear ? [
        '1월1주차', '1월2주차', '1월3주차', '1월4주차',
        '2월1주차', '2월2주차', '2월3주차', '2월4주차',
        '3월1주차', '3월2주차', '3월3주차', '3월4주차',
        '4월1주차', '4월2주차', '4월3주차', '4월4주차',
        '5월1주차', '5월2주차', '5월3주차', '5월4주차',
        '6월1주차', '6월2주차', '6월3주차', '6월4주차',
        '7월1주차', '7월2주차', '7월3주차'
      ] : [
        '1월1주차', '1월2주차', '1월3주차', '1월4주차',
        '2월1주차', '2월2주차', '2월3주차', '2월4주차',
        '3월1주차', '3월2주차', '3월3주차', '3월4주차',
        '4월1주차', '4월2주차', '4월3주차', '4월4주차',
        '5월1주차', '5월2주차', '5월3주차', '5월4주차',
        '6월1주차', '6월2주차', '6월3주차', '6월4주차',
        '7월1주차', '7월2주차', '7월3주차', '7월4주차',
        '8월1주차', '8월2주차', '8월3주차', '8월4주차',
        '9월1주차', '9월2주차', '9월3주차', '9월4주차',
        '10월1주차', '10월2주차', '10월3주차', '10월4주차',
        '11월1주차', '11월2주차', '11월3주차', '11월4주차',
        '12월1주차', '12월2주차', '12월3주차', '12월4주차'
      ];
      const selectedWeekIdx = ALL_WEEKS_LIST.indexOf(selectedWeekAgg);
      const prevWeekKey = selectedWeekIdx > 0 ? ALL_WEEKS_LIST[selectedWeekIdx - 1] : '1월1주차';
      checkPrevAccessPermission(prevWeekKey);
    };
    window.addEventListener('refreshEditRequests', handleRefresh);
    return () => window.removeEventListener('refreshEditRequests', handleRefresh);
  }, [selectedChurch, selectedYear, selectedWeekAgg]);

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

    // Build church options
    const list: { id: string; name: string; jipa: string }[] = [];
    defaultChurchesData.forEach((c: any) => {
      list.push({ id: c.name, name: c.name, jipa: c.jipa || '맛디아' });
    });
    setAvailableChurches(list);

    // Apply User Permission Scope Filter
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

    // Load Overseas Admin Users for Modal
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

  // Sync inputs with DB values on active week selection change
  useEffect(() => {
    const inputs: Record<string, DeptData> = {};
    DEPARTMENTS.forEach(dept => {
      inputs[dept] = getWeeklyData(selectedWeekAgg, dept);
    });
    setCurrentWeekInputs(inputs);
  }, [selectedWeekAgg, dbRecords]);

  // Helper to dynamically calculate the Sunday-to-Saturday date range of a week in a given year.
  // We determine which week belongs to which month based on where the Wednesday of that week falls.
  const getWeekDateRangeStr = (yearNum: number, monthNum: number, weekIdx: number): string => {
    const d = new Date(yearNum - 1, 11, 25);
    while (d.getDay() !== 0) {
      d.setDate(d.getDate() - 1);
    }

    const weeks: { startM: number; startD: number; endM: number; endD: number }[] = [];
    for (let i = 0; i < 54; i++) {
      const wed = new Date(d);
      wed.setDate(wed.getDate() + 3);
      if (wed.getFullYear() > yearNum) {
        break;
      }
      if (wed.getFullYear() === yearNum) {
        const m = wed.getMonth() + 1;
        if (m === monthNum) {
          const end = new Date(d);
          end.setDate(end.getDate() + 6);
          weeks.push({
            startM: d.getMonth() + 1,
            startD: d.getDate(),
            endM: end.getMonth() + 1,
            endD: end.getDate()
          });
        }
      }
      d.setDate(d.getDate() + 7);
    }

    const w = weeks[weekIdx];
    if (w) {
      return `(${w.startM}/${w.startD} ~ ${w.endM}/${w.endD})`;
    }
    return '';
  };

  // Generate Weekly Options for 1월 1주차 ~ 12월 4주차 (Dynamically calculated dates)
  const generateWeeklyOptions = (includeSummary: boolean = true) => {
    const options: { value: string; label: string; isMonthHeader?: boolean }[] = [];
    const isCurrentYear = selectedYear === '2026년';
    const yearNum = parseInt(selectedYear.replace(/[^0-9]/g, '')) || 2026;

    if (includeSummary) {
      if (isCurrentYear) {
        options.push({ value: '전체', label: '🌐 전체 (1월 1주차 ~ 현재 주차)' });
      } else {
        options.push({ value: '전체', label: '🌐 전체 (1월 1주차 ~ 12월 4주차)' });
      }
    }

    const endMonth = isCurrentYear ? 7 : 12;
    for (let m = 1; m <= endMonth; m++) {
      if (includeSummary) {
        options.push({ value: `${m}월`, label: `📅 ${m}월 (전체 주차 집계)`, isMonthHeader: true });
      }

      const endW = (isCurrentYear && m === 7) ? 3 : 4;
      for (let w = 1; w <= endW; w++) {
        const dateRange = getWeekDateRangeStr(yearNum, m, w - 1);
        const suffix = (isCurrentYear && m === 7 && w === 3) ? ' [현재주차]' : '';
        options.push({
          value: `${m}월${w}주차`,
          label: `   ㄴ ${m}월${w}주차 ${dateRange}${suffix}`
        });
      }
    }

    return options;
  };

  // Mock Weekly Data Generator with Database priority
  const getWeeklyData = (weekKey: string, dept: string): DeptData => {
    if (dbRecords[weekKey] && dbRecords[weekKey][dept]) {
      return dbRecords[weekKey][dept];
    }

    return {
      reg: 0,
      find: 0,
      findDrop: 0,
      gospel: 0,
      gospelDrop: 0,
      admit: 0,
      admitDrop: 0
    };
  };

  // Filter weeks to render based on selectedWeekCheck ('전체', '1월', '1월1주차' etc.)
  const getFilteredWeeks = () => {
    const isCurrentYear = selectedYear === '2026년';
    const allWeeks = isCurrentYear ? [
      '1월1주차', '1월2주차', '1월3주차', '1월4주차',
      '2월1주차', '2월2주차', '2월3주차', '2월4주차',
      '3월1주차', '3월2주차', '3월3주차', '3월4주차',
      '4월1주차', '4월2주차', '4월3주차', '4월4주차',
      '5월1주차', '5월2주차', '5월3주차', '5월4주차',
      '6월1주차', '6월2주차', '6월3주차', '6월4주차',
      '7월1주차', '7월2주차', '7월3주차'
    ] : [
      '1월1주차', '1월2주차', '1월3주차', '1월4주차',
      '2월1주차', '2월2주차', '2월3주차', '2월4주차',
      '3월1주차', '3월2주차', '3월3주차', '3월4주차',
      '4월1주차', '4월2주차', '4월3주차', '4월4주차',
      '5월1주차', '5월2주차', '5월3주차', '5월4주차',
      '6월1주차', '6월2주차', '6월3주차', '6월4주차',
      '7월1주차', '7월2주차', '7월3주차', '7월4주차',
      '8월1주차', '8월2주차', '8월3주차', '8월4주차',
      '9월1주차', '9월2주차', '9월3주차', '9월4주차',
      '10월1주차', '10월2주차', '10월3주차', '10월4주차',
      '11월1주차', '11월2주차', '11월3주차', '11월4주차',
      '12월1주차', '12월2주차', '12월3주차', '12월4주차'
    ];

    if (selectedWeekCheck === '전체') {
      return allWeeks;
    }
    if (selectedWeekCheck.endsWith('월')) {
      const monthNum = selectedWeekCheck.replace('월', '');
      return allWeeks.filter(w => w.startsWith(`${monthNum}월`));
    }
    return [selectedWeekCheck];
  };

  const filteredWeeks = getFilteredWeeks();

  // Compute KPI Totals for Tab 1
  const computeKpiTotals = () => {
    let totalReg = 0;
    let totalFind = 0;
    let totalGospel = 0;
    let totalAdmit = 0;

    DEPARTMENTS.forEach(dept => {
      filteredWeeks.forEach(w => {
        const d = getWeeklyData(w, dept);
        if (filteredWeeks.length === 1 || w === filteredWeeks[0]) {
          totalReg += d.reg;
        }
        totalFind += d.find;
        totalGospel += d.gospel;
        totalAdmit += d.admit;
      });
    });

    const avgReg = totalReg || 100;
    const findRate = ((totalFind / avgReg) * 100).toFixed(1);
    const gospelRate = ((totalGospel / avgReg) * 100).toFixed(1);
    const admitRate = ((totalAdmit / avgReg) * 100).toFixed(1);

    return { totalReg, totalFind, findRate, totalGospel, gospelRate, totalAdmit, admitRate };
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
      await api.post('/evangelism/edit-requests', {
        churchName: selectedChurch,
        yearStr: selectedYear,
        weekKey: requestWeek,
        reason: requestReason,
        requestedBy: username,
        requestedTo: requestAdminUser
      });
      logService.addAccessLog(
        `🔒 이전 주차 수정 요청 (${requestWeek})`,
        `/evangelism/request?week=${requestWeek}&reason=${encodeURIComponent(requestReason)}`
      );
      alert(`[${requestWeek}] 데이터 수정 요청이 ${requestAdminUser} 담당자에게 성공적으로 전송되었습니다!\n승인 후 해당 주차 수정이 활성화됩니다.`);
      setIsModalOpen(false);
      setRequestReason('');
      window.dispatchEvent(new Event('refreshEditRequests'));
    } catch (e) {
      alert('수정 요청 전송 중 오류가 발생했습니다.');
    }
  };

  // Handle Input Change for Aggregation Tab
  const handleInputChange = (dept: string, field: keyof DeptData, value: number) => {
    setCurrentWeekInputs(prev => ({
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
            <Sparkles size={14} /> 해외선교부 신앙 프로세스 1단계
          </div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0, letterSpacing: '-0.5px', color: '#f8fafc' }}>
            ① 전도 · 가개강 종합 관리 포탈
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: '6px 0 0 0' }}>
            전세계 해외교회의 주차별 찾기 · 복음방 · 가개강(등록) 실적을 실시간으로 확인하고 합산/취합합니다.
          </p>
        </div>

        {/* Sub-tab Switches */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.08)', padding: '5px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.1)' }}>
          <button
            onClick={() => navigate('/evangelism/check')}
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
            onClick={() => navigate('/evangelism/aggregate')}
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
              background: activeTab === 'aggregate' ? '#ffffff' : 'transparent',
              color: activeTab === 'aggregate' ? '#0f172a' : '#cbd5e1',
              boxShadow: activeTab === 'aggregate' ? '0 4px 14px rgba(0,0,0,0.2)' : 'none'
            }}
          >
            <Edit3 size={18} color={activeTab === 'aggregate' ? '#16a34a' : '#cbd5e1'} />
            2. 취합 및 실적 입력
          </button>
        </div>
      </div>

      {/* Global Control Bar (Church Selector + Year + Week Filter) */}
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

        {/* Right: Year & Week Filters */}
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
              <option value="2026년">2026년</option>
              <option value="2025년">2025년</option>
              <option value="2024년">2024년</option>
            </select>
          </div>

          {/* Week Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '6px 14px', borderRadius: '10px' }}>
            <Filter size={16} color="#16a34a" />
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#166534' }}>주차 선택</span>
            {activeTab === 'check' ? (
              <select
                value={selectedWeekCheck}
                onChange={(e) => setSelectedWeekCheck(e.target.value)}
                style={{ border: 'none', background: 'transparent', fontWeight: 800, color: '#16a34a', fontSize: '0.9rem', outline: 'none', cursor: 'pointer', maxWidth: '280px' }}
              >
                {generateWeeklyOptions(true).map((opt, idx) => (
                  <option key={idx} value={opt.value} style={{ fontWeight: opt.isMonthHeader ? 800 : 500, color: opt.isMonthHeader ? '#2563eb' : '#0f172a' }}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : (
              <select
                value={selectedWeekAgg}
                onChange={(e) => setSelectedWeekAgg(e.target.value)}
                style={{ border: 'none', background: 'transparent', fontWeight: 800, color: '#16a34a', fontSize: '0.9rem', outline: 'none', cursor: 'pointer', maxWidth: '280px' }}
              >
                {generateWeeklyOptions(false).filter(opt => !opt.isMonthHeader).map((opt, idx) => (
                  <option key={idx} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: 교회별 데이터 확인 (Church Data Verification)                      */}
      {/* ========================================================================= */}
      {activeTab === 'check' && (
        <div>
          {/* Top Summary Cards (총 찾기수 | 총 복음방수 | 총 가등록수) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '28px' }}>
            {/* Card 1: 총 찾기수 */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '22px 26px', boxShadow: '0 4px 14px rgba(0,0,0,0.03)' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b', marginBottom: '6px' }}>
                🔍 총 찾기수 (전도 접촉)
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                <span style={{ fontSize: '2rem', fontWeight: 900, color: '#2563eb' }}>{kpi.totalFind}명</span>
                <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0284c7', background: '#e0f2fe', padding: '2px 10px', borderRadius: '8px' }}>
                  ({kpi.findRate}%)
                </span>
              </div>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '6px' }}>
                전도재적 대비 찾기성공 비율 · 선택 기간: {selectedWeekCheck}
              </div>
            </div>

            {/* Card 2: 총 복음방수 */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '22px 26px', boxShadow: '0 4px 14px rgba(0,0,0,0.03)' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b', marginBottom: '6px' }}>
                📖 총 복음방 수강수
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                <span style={{ fontSize: '2rem', fontWeight: 900, color: '#7c3aed' }}>{kpi.totalGospel}명</span>
                <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#6d28d9', background: '#f3e8ff', padding: '2px 10px', borderRadius: '8px' }}>
                  ({kpi.gospelRate}%)
                </span>
              </div>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '6px' }}>
                전도재적 대비 복음방 수강 비율 · 선택 기간: {selectedWeekCheck}
              </div>
            </div>

            {/* Card 3: 총 가등록수 */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '22px 26px', boxShadow: '0 4px 14px rgba(0,0,0,0.03)' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b', marginBottom: '6px' }}>
                📝 총 가개강(등록) 수
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                <span style={{ fontSize: '2rem', fontWeight: 900, color: '#16a34a' }}>{kpi.totalAdmit}명</span>
                <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#15803d', background: '#dcfce7', padding: '2px 10px', borderRadius: '8px' }}>
                  ({kpi.admitRate}%)
                </span>
              </div>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '6px' }}>
                전도재적 대비 가개강 등록 비율 · 선택 기간: {selectedWeekCheck}
              </div>
            </div>
          </div>

          {/* ===================================================================== */}
          {/* Table (1): 회별 전도 현황                                             */}
          {/* ===================================================================== */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', marginBottom: '28px', boxShadow: '0 4px 14px rgba(0,0,0,0.03)' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              📊 (1) 회별 전도 현황 <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>({selectedChurch} · {selectedYear} {selectedWeekCheck})</span>
            </h2>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'center' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #cbd5e1', color: '#334155' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 800 }}>구분 (부서)</th>
                    <th style={{ padding: '12px 14px', fontWeight: 800, background: '#f1f5f9' }}>전도재적</th>
                    {filteredWeeks.map(w => (
                      <th key={w} colSpan={3} style={{ padding: '10px', borderLeft: '1px solid #e2e8f0', fontWeight: 800 }}>
                        {w}
                      </th>
                    ))}
                    <th colSpan={3} style={{ padding: '10px', borderLeft: '2px solid #cbd5e1', background: '#eff6ff', color: '#1e40af', fontWeight: 800 }}>
                      합계
                    </th>
                  </tr>
                  <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', fontSize: '0.78rem', color: '#475569' }}>
                    <th></th>
                    <th></th>
                    {filteredWeeks.map(w => (
                      <React.Fragment key={w}>
                        <th style={{ padding: '6px', borderLeft: '1px solid #e2e8f0', color: '#2563eb' }}>찾</th>
                        <th style={{ padding: '6px', color: '#7c3aed' }}>복</th>
                        <th style={{ padding: '6px', color: '#16a34a' }}>등</th>
                      </React.Fragment>
                    ))}
                    <th style={{ padding: '6px', borderLeft: '2px solid #cbd5e1', background: '#dbeafe', color: '#1e40af' }}>찾</th>
                    <th style={{ padding: '6px', background: '#dbeafe', color: '#1e40af' }}>복</th>
                    <th style={{ padding: '6px', background: '#dbeafe', color: '#1e40af' }}>등</th>
                  </tr>
                </thead>
                <tbody>
                  {DEPARTMENTS.map(dept => {
                    let sumFind = 0;
                    let sumGospel = 0;
                    let sumAdmit = 0;
                    const firstWeekData = getWeeklyData(filteredWeeks[0] || '1월1주차', dept);

                    return (
                      <tr key={dept} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: '#0f172a' }}>{dept}</td>
                        <td style={{ padding: '12px 14px', fontWeight: 700, background: '#f8fafc', color: '#475569' }}>{firstWeekData.reg}명</td>
                        {filteredWeeks.map(w => {
                          const d = getWeeklyData(w, dept);
                          sumFind += d.find;
                          sumGospel += d.gospel;
                          sumAdmit += d.admit;
                          return (
                            <React.Fragment key={w}>
                              <td style={{ padding: '10px 6px', borderLeft: '1px solid #e2e8f0', fontWeight: 700, color: '#2563eb' }}>{d.find}</td>
                              <td style={{ padding: '10px 6px', fontWeight: 700, color: '#7c3aed' }}>{d.gospel}</td>
                              <td style={{ padding: '10px 6px', fontWeight: 700, color: '#16a34a' }}>{d.admit}</td>
                            </React.Fragment>
                          );
                        })}
                        <td style={{ padding: '10px 6px', borderLeft: '2px solid #cbd5e1', background: '#eff6ff', fontWeight: 800, color: '#1e40af' }}>{sumFind}</td>
                        <td style={{ padding: '10px 6px', background: '#eff6ff', fontWeight: 800, color: '#1e40af' }}>{sumGospel}</td>
                        <td style={{ padding: '10px 6px', background: '#eff6ff', fontWeight: 800, color: '#1e40af' }}>{sumAdmit}</td>
                      </tr>
                    );
                  })}
                  {/* Totals Row */}
                  <tr style={{ background: '#f8fafc', borderTop: '2px solid #cbd5e1', fontWeight: 900, color: '#0f172a' }}>
                    <td style={{ padding: '14px 16px', textAlign: 'left' }}>합계</td>
                    <td style={{ padding: '14px' }}>{DEPARTMENTS.reduce((acc, dept) => acc + getWeeklyData(filteredWeeks[0] || '1월1주차', dept).reg, 0)}명</td>
                    {filteredWeeks.map(w => {
                      const totF = DEPARTMENTS.reduce((acc, dept) => acc + getWeeklyData(w, dept).find, 0);
                      const totG = DEPARTMENTS.reduce((acc, dept) => acc + getWeeklyData(w, dept).gospel, 0);
                      const totA = DEPARTMENTS.reduce((acc, dept) => acc + getWeeklyData(w, dept).admit, 0);
                      return (
                        <React.Fragment key={w}>
                          <td style={{ padding: '12px 6px', borderLeft: '1px solid #e2e8f0', color: '#2563eb' }}>{totF}</td>
                          <td style={{ padding: '12px 6px', color: '#7c3aed' }}>{totG}</td>
                          <td style={{ padding: '12px 6px', color: '#16a34a' }}>{totA}</td>
                        </React.Fragment>
                      );
                    })}
                    <td style={{ padding: '12px 6px', borderLeft: '2px solid #cbd5e1', background: '#dbeafe', color: '#1e40af' }}>
                      {DEPARTMENTS.reduce((acc, dept) => acc + filteredWeeks.reduce((wAcc, w) => wAcc + getWeeklyData(w, dept).find, 0), 0)}
                    </td>
                    <td style={{ padding: '12px 6px', background: '#dbeafe', color: '#1e40af' }}>
                      {DEPARTMENTS.reduce((acc, dept) => acc + filteredWeeks.reduce((wAcc, w) => wAcc + getWeeklyData(w, dept).gospel, 0), 0)}
                    </td>
                    <td style={{ padding: '12px 6px', background: '#dbeafe', color: '#1e40af' }}>
                      {DEPARTMENTS.reduce((acc, dept) => acc + filteredWeeks.reduce((wAcc, w) => wAcc + getWeeklyData(w, dept).admit, 0), 0)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Helper Render Function for (2) 찾기, (3) 복음방, (4) 가개강 상세분석 Tables */}
          {renderDetailAnalysisTable('(2) 찾기 상세분석', '주차별 찾기와 탈락수를 볼 수 있습니다.', '찾', '탈', filteredWeeks, getWeeklyData, 'find', 'findDrop')}
          {renderDetailAnalysisTable('(3) 복음방 상세분석', '주차별 복음방과 탈락수를 볼 수 있습니다.', '복', '탈', filteredWeeks, getWeeklyData, 'gospel', 'gospelDrop')}
          {renderDetailAnalysisTable('(4) 가개강 상세분석', '주차별 가개강(등록)과 탈락수를 볼 수 있습니다.', '개', '탈', filteredWeeks, getWeeklyData, 'admit', 'admitDrop')}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: 취합 및 실적 입력 (Aggregation & Input)                             */}
      {/* ========================================================================= */}
      {activeTab === 'aggregate' && (() => {
        const isCurrentYear = selectedYear === '2026년';
        const REAL_CURRENT_WEEK = isCurrentYear ? '7월3주차' : '12월4주차';
        const isEditable = (selectedWeekAgg === REAL_CURRENT_WEEK) || hasEditPermission;
        const ALL_WEEKS_LIST = isCurrentYear ? [
          '1월1주차', '1월2주차', '1월3주차', '1월4주차',
          '2월1주차', '2월2주차', '2월3주차', '2월4주차',
          '3월1주차', '3월2주차', '3월3주차', '3월4주차',
          '4월1주차', '4월2주차', '4월3주차', '4월4주차',
          '5월1주차', '5월2주차', '5월3주차', '5월4주차',
          '6월1주차', '6월2주차', '6월3주차', '6월4주차',
          '7월1주차', '7월2주차', '7월3주차'
        ] : [
          '1월1주차', '1월2주차', '1월3주차', '1월4주차',
          '2월1주차', '2월2주차', '2월3주차', '2월4주차',
          '3월1주차', '3월2주차', '3월3주차', '3월4주차',
          '4월1주차', '4월2주차', '4월3주차', '4월4주차',
          '5월1주차', '5월2주차', '5월3주차', '5월4주차',
          '6월1주차', '6월2주차', '6월3주차', '6월4주차',
          '7월1주차', '7월2주차', '7월3주차', '7월4주차',
          '8월1주차', '8월2주차', '8월3주차', '8월4주차',
          '9월1주차', '9월2주차', '9월3주차', '9월4주차',
          '10월1주차', '10월2주차', '10월3주차', '10월4주차',
          '11월1주차', '11월2주차', '11월3주차', '11월4주차',
          '12월1주차', '12월2주차', '12월3주차', '12월4주차'
        ];
        const selectedWeekIdx = ALL_WEEKS_LIST.indexOf(selectedWeekAgg);
        const prevWeekKey = selectedWeekIdx > 0 ? ALL_WEEKS_LIST[selectedWeekIdx - 1] : '1월1주차';

        return (
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '28px', boxShadow: '0 4px 14px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
              <div>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  📥 주차별 전도 실적 입력 및 취합 ({selectedChurch} · {selectedWeekAgg})
                </h2>
                <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
                  이전 주차 데이터는 수정이 잠겨있으며, 현재 주차({REAL_CURRENT_WEEK}) 실적만 편집이 가능합니다.
                </p>
              </div>

              {isEditable ? (
                <button
                  onClick={async () => {
                    try {
                      const recordsToSave = DEPARTMENTS.map(dept => {
                        const data = currentWeekInputs[dept];
                        return {
                          churchName: selectedChurch,
                          yearStr: selectedYear,
                          weekKey: selectedWeekAgg,
                          department: dept,
                          regCount: data.reg,
                          findCount: data.find,
                          findDropCount: data.findDrop,
                          gospelCount: data.gospel,
                          gospelDropCount: data.gospelDrop,
                          admitCount: data.admit,
                          admitDropCount: data.admitDrop,
                          updatedBy: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!).username : 'admin'
                        };
                      });
                      await api.post('/evangelism/records', recordsToSave);
                      logService.addAccessLog('💾 주차별 실적 저장 (DB 연동)', `/evangelism/save?church=${encodeURIComponent(selectedChurch)}&week=${selectedWeekAgg}`);
                      alert(`[${selectedChurch} · ${selectedWeekAgg}] 전도 실적이 PostgreSQL 데이터베이스에 성공적으로 저장되었습니다!`);
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

            {/* Table Container */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'center' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #cbd5e1' }}>
                    <th style={{ padding: '14px', textAlign: 'left', fontWeight: 800, color: '#334155' }}>구분</th>

                    {/* Previous Week Header (Locked + Unlock Request Button) */}
                    {/* Previous Week Header (Locked + Unlock Request Button) */}
                    <th colSpan={6} style={{ padding: '12px', background: hasPrevEditPermission ? '#f0fdf4' : '#fef2f2', borderLeft: '2px solid ' + (hasPrevEditPermission ? '#bbf7d0' : '#fecaca'), color: hasPrevEditPermission ? '#166534' : '#991b1b', fontWeight: 800 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                        <span>{prevWeekKey} {hasPrevEditPermission ? '(이전 주차 · 🔓 허용됨)' : '(이전 주차 · 🔒 잠금)'}</span>
                        {!hasPrevEditPermission && (
                          <button
                            onClick={() => {
                              setRequestWeek(prevWeekKey);
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

                    {/* Current Week Header (Active Editable or Locked) */}
                    <th colSpan={6} style={{ padding: '12px', background: isEditable ? '#f0fdf4' : '#fef2f2', borderLeft: '2px solid ' + (isEditable ? '#bbf7d0' : '#fecaca'), color: isEditable ? '#166534' : '#991b1b', fontWeight: 800 }}>
                      {isEditable ? (
                        selectedWeekAgg === REAL_CURRENT_WEEK ? (
                          `✨ ${selectedWeekAgg} (현재 주차 · ✏️ 편집 가능)`
                        ) : (
                          `🔓 ${selectedWeekAgg} (이전 주차 · ✏️ 수정 허용됨)`
                        )
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                          <span>{selectedWeekAgg} (이전 주차 · 🔒 잠금)</span>
                          <button
                            onClick={() => {
                              setRequestWeek(selectedWeekAgg);
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
                  <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', fontSize: '0.78rem', color: '#475569' }}>
                    <th></th>
                    {/* Previous Week Sub Headers */}
                    <th style={{ padding: '6px', borderLeft: '2px solid #fecaca', background: '#fff5f5' }}>찾</th>
                    <th style={{ padding: '6px', background: '#fff5f5' }}>탈</th>
                    <th style={{ padding: '6px', background: '#fff5f5' }}>복</th>
                    <th style={{ padding: '6px', background: '#fff5f5' }}>탈</th>
                    <th style={{ padding: '6px', background: '#fff5f5' }}>개</th>
                    <th style={{ padding: '6px', background: '#fff5f5' }}>탈</th>

                    {/* Current Week Sub Headers */}
                    <th style={{ padding: '6px', borderLeft: '2px solid ' + (isEditable ? '#bbf7d0' : '#fecaca'), background: isEditable ? '#f0fdf4' : '#fff5f5', color: '#2563eb' }}>찾</th>
                    <th style={{ padding: '6px', background: isEditable ? '#f0fdf4' : '#fff5f5', color: '#dc2626' }}>탈</th>
                    <th style={{ padding: '6px', background: isEditable ? '#f0fdf4' : '#fff5f5', color: '#7c3aed' }}>복</th>
                    <th style={{ padding: '6px', background: isEditable ? '#f0fdf4' : '#fff5f5', color: '#dc2626' }}>탈</th>
                    <th style={{ padding: '6px', background: isEditable ? '#f0fdf4' : '#fff5f5', color: '#16a34a' }}>개</th>
                    <th style={{ padding: '6px', background: isEditable ? '#f0fdf4' : '#fff5f5', color: '#dc2626' }}>탈</th>
                  </tr>
                </thead>
                <tbody>
                  {DEPARTMENTS.map((dept) => {
                    const curr = currentWeekInputs[dept] || { reg: 20, find: 0, findDrop: 0, gospel: 0, gospelDrop: 0, admit: 0, admitDrop: 0 };
                    const prev = getWeeklyData(prevWeekKey, dept);

                    return (
                      <tr key={dept} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 700, color: '#0f172a' }}>{dept}</td>

                        {/* Readonly Previous Week Cells */}
                        <td style={{ padding: '10px 4px', borderLeft: '2px solid #fecaca', background: '#fafafa', color: '#64748b' }}>{prev.find}</td>
                        <td style={{ padding: '10px 4px', background: '#fafafa', color: '#94a3b8' }}>{prev.findDrop}</td>
                        <td style={{ padding: '10px 4px', background: '#fafafa', color: '#64748b' }}>{prev.gospel}</td>
                        <td style={{ padding: '10px 4px', background: '#fafafa', color: '#94a3b8' }}>{prev.gospelDrop}</td>
                        <td style={{ padding: '10px 4px', background: '#fafafa', color: '#64748b' }}>{prev.admit}</td>
                        <td style={{ padding: '10px 4px', background: '#fafafa', color: '#94a3b8' }}>{prev.admitDrop}</td>

                        {/* Current Week (Selected Week) Cells - Editable or Readonly depending on isEditable */}
                        {isEditable ? (
                          <>
                            <td style={{ padding: '8px 4px', borderLeft: '2px solid #bbf7d0', background: '#f8fafc' }}>
                              <input
                                type="number"
                                value={curr.find}
                                onChange={(e) => handleInputChange(dept, 'find', parseInt(e.target.value) || 0)}
                                style={{ width: '50px', padding: '6px', textAlign: 'center', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 800, color: '#2563eb' }}
                              />
                            </td>
                            <td style={{ padding: '8px 4px', background: '#f8fafc' }}>
                              <input
                                type="number"
                                value={curr.findDrop}
                                onChange={(e) => handleInputChange(dept, 'findDrop', parseInt(e.target.value) || 0)}
                                style={{ width: '50px', padding: '6px', textAlign: 'center', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 800, color: '#dc2626' }}
                              />
                            </td>
                            <td style={{ padding: '8px 4px', background: '#f8fafc' }}>
                              <input
                                type="number"
                                value={curr.gospel}
                                onChange={(e) => handleInputChange(dept, 'gospel', parseInt(e.target.value) || 0)}
                                style={{ width: '50px', padding: '6px', textAlign: 'center', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 800, color: '#7c3aed' }}
                              />
                            </td>
                            <td style={{ padding: '8px 4px', background: '#f8fafc' }}>
                              <input
                                type="number"
                                value={curr.gospelDrop}
                                onChange={(e) => handleInputChange(dept, 'gospelDrop', parseInt(e.target.value) || 0)}
                                style={{ width: '50px', padding: '6px', textAlign: 'center', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 800, color: '#dc2626' }}
                              />
                            </td>
                            <td style={{ padding: '8px 4px', background: '#f8fafc' }}>
                              <input
                                type="number"
                                value={curr.admit}
                                onChange={(e) => handleInputChange(dept, 'admit', parseInt(e.target.value) || 0)}
                                style={{ width: '50px', padding: '6px', textAlign: 'center', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 800, color: '#16a34a' }}
                              />
                            </td>
                            <td style={{ padding: '8px 4px', background: '#f8fafc' }}>
                              <input
                                type="number"
                                value={curr.admitDrop}
                                onChange={(e) => handleInputChange(dept, 'admitDrop', parseInt(e.target.value) || 0)}
                                style={{ width: '50px', padding: '6px', textAlign: 'center', border: '1px solid #cbd5e1', borderRadius: '6px', fontWeight: 800, color: '#dc2626' }}
                              />
                            </td>
                          </>
                        ) : (
                          <>
                            <td style={{ padding: '10px 4px', borderLeft: '2px solid #cbd5e1', background: '#fafafa', color: '#2563eb', fontWeight: 700 }}>{curr.find}</td>
                            <td style={{ padding: '10px 4px', background: '#fafafa', color: '#dc2626', fontWeight: 700 }}>{curr.findDrop}</td>
                            <td style={{ padding: '10px 4px', background: '#fafafa', color: '#7c3aed', fontWeight: 700 }}>{curr.gospel}</td>
                            <td style={{ padding: '10px 4px', background: '#fafafa', color: '#dc2626', fontWeight: 700 }}>{curr.gospelDrop}</td>
                            <td style={{ padding: '10px 4px', background: '#fafafa', color: '#16a34a', fontWeight: 700 }}>{curr.admit}</td>
                            <td style={{ padding: '10px 4px', background: '#fafafa', color: '#dc2626', fontWeight: 700 }}>{curr.admitDrop}</td>
                          </>
                        )}
                      </tr>
                    );
                  })}

                  {/* Total Row */}
                  <tr style={{ background: '#f8fafc', borderTop: '2px solid #cbd5e1', fontWeight: 900 }}>
                    <td style={{ padding: '12px 14px', textAlign: 'left' }}>합계</td>

                    {/* Previous Totals */}
                    <td style={{ padding: '10px 4px', borderLeft: '2px solid #fecaca' }}>{DEPARTMENTS.reduce((sum, d) => sum + getWeeklyData(prevWeekKey, d).find, 0)}</td>
                    <td style={{ padding: '10px 4px' }}>{DEPARTMENTS.reduce((sum, d) => sum + getWeeklyData(prevWeekKey, d).findDrop, 0)}</td>
                    <td style={{ padding: '10px 4px' }}>{DEPARTMENTS.reduce((sum, d) => sum + getWeeklyData(prevWeekKey, d).gospel, 0)}</td>
                    <td style={{ padding: '10px 4px' }}>{DEPARTMENTS.reduce((sum, d) => sum + getWeeklyData(prevWeekKey, d).gospelDrop, 0)}</td>
                    <td style={{ padding: '10px 4px' }}>{DEPARTMENTS.reduce((sum, d) => sum + getWeeklyData(prevWeekKey, d).admit, 0)}</td>
                    <td style={{ padding: '10px 4px' }}>{DEPARTMENTS.reduce((sum, d) => sum + getWeeklyData(prevWeekKey, d).admitDrop, 0)}</td>

                    {/* Selected Week Totals */}
                    <td style={{ padding: '10px 4px', borderLeft: '2px solid ' + (isEditable ? '#bbf7d0' : '#fecaca'), color: '#2563eb' }}>{DEPARTMENTS.reduce((sum, d) => sum + (currentWeekInputs[d]?.find || 0), 0)}</td>
                    <td style={{ padding: '10px 4px', color: '#dc2626' }}>{DEPARTMENTS.reduce((sum, d) => sum + (currentWeekInputs[d]?.findDrop || 0), 0)}</td>
                    <td style={{ padding: '10px 4px', color: '#7c3aed' }}>{DEPARTMENTS.reduce((sum, d) => sum + (currentWeekInputs[d]?.gospel || 0), 0)}</td>
                    <td style={{ padding: '10px 4px', color: '#dc2626' }}>{DEPARTMENTS.reduce((sum, d) => sum + (currentWeekInputs[d]?.gospelDrop || 0), 0)}</td>
                    <td style={{ padding: '10px 4px', color: '#16a34a' }}>{DEPARTMENTS.reduce((sum, d) => sum + (currentWeekInputs[d]?.admit || 0), 0)}</td>
                    <td style={{ padding: '10px 4px', color: '#dc2626' }}>{DEPARTMENTS.reduce((sum, d) => sum + (currentWeekInputs[d]?.admitDrop || 0), 0)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* Unlock Request Modal Window (🔒 이전 주차 수정 허용 요청)                  */}
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
                  🔒 이전 주차 데이터 수정 허용 요청
                </h3>
                <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '2px 0 0 0' }}>
                  이전 주차 데이터 보정을 위해 관리자 및 해외선교부 담당자에게 허용을 요청합니다.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
              {/* Target Week Field */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#334155', marginBottom: '6px' }}>
                  요청 대상 주차
                </label>

                <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', padding: '10px 14px', borderRadius: '10px', fontWeight: 800, color: '#2563eb', fontSize: '0.92rem' }}>
                  {requestWeek} (잠금 상태)
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
                  placeholder="예: 7월 2주차 청년회 복음방 수강 실적 누락건 보정 요청"
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
                    color: '#0f172a',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                >
                  {adminUsers.map((u, i) => (
                    <option key={i} value={u.name}>
                      {u.name} ({u.username} · {u.role === 'ROLE_ADMIN' ? '최고 관리자' : '해외선교부 담당자'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Modal Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{
                  padding: '10px 20px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#475569',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                취소
              </button>
              <button
                onClick={handleSendUnlockRequest}
                style={{
                  padding: '10px 22px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(220, 38, 38, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Send size={16} /> 수정 허용 요청 전송
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper Function for (2) 찾기, (3) 복음방, (4) 가개강 상세분석 Tables
function renderDetailAnalysisTable(
  title: string,
  desc: string,
  valLabel: string,
  dropLabel: string,
  weeks: string[],
  getDataFn: (w: string, dept: string) => DeptData,
  valKey: 'find' | 'gospel' | 'admit',
  dropKey: 'findDrop' | 'gospelDrop' | 'admitDrop'
) {
  return (
    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', marginBottom: '28px', boxShadow: '0 4px 14px rgba(0,0,0,0.03)' }}>
      <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0' }}>
        {title}
      </h2>
      <p style={{ color: '#64748b', fontSize: '0.82rem', margin: '0 0 16px 0' }}>
        {desc}
      </p>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'center' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #cbd5e1', color: '#334155' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 800 }}>구분 (부서)</th>
              <th style={{ padding: '12px 14px', fontWeight: 800, background: '#f1f5f9' }}>전도재적</th>
              {weeks.map(w => (
                <th key={w} colSpan={2} style={{ padding: '10px', borderLeft: '1px solid #e2e8f0', fontWeight: 800 }}>
                  {w}
                </th>
              ))}
              <th colSpan={2} style={{ padding: '10px', borderLeft: '2px solid #cbd5e1', background: '#eff6ff', color: '#1e40af', fontWeight: 800 }}>
                합계
              </th>
            </tr>
            <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', fontSize: '0.78rem', color: '#475569' }}>
              <th></th>
              <th></th>
              {weeks.map(w => (
                <React.Fragment key={w}>
                  <th style={{ padding: '6px', borderLeft: '1px solid #e2e8f0', color: '#2563eb' }}>{valLabel}</th>
                  <th style={{ padding: '6px', color: '#dc2626' }}>{dropLabel}</th>
                </React.Fragment>
              ))}
              <th style={{ padding: '6px', borderLeft: '2px solid #cbd5e1', background: '#dbeafe', color: '#1e40af' }}>{valLabel}</th>
              <th style={{ padding: '6px', background: '#dbeafe', color: '#dc2626' }}>{dropLabel}</th>
            </tr>
          </thead>
          <tbody>
            {DEPARTMENTS.map(dept => {
              let sumVal = 0;
              let sumDrop = 0;
              const firstWeekData = getDataFn(weeks[0] || '1월1주차', dept);

              return (
                <tr key={dept} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: '#0f172a' }}>{dept}</td>
                  <td style={{ padding: '12px 14px', fontWeight: 700, background: '#f8fafc', color: '#475569' }}>{firstWeekData.reg}명</td>
                  {weeks.map(w => {
                    const d = getDataFn(w, dept);
                    const v = d[valKey];
                    const dr = d[dropKey];
                    sumVal += v;
                    sumDrop += dr;

                    return (
                      <React.Fragment key={w}>
                        <td style={{ padding: '10px 6px', borderLeft: '1px solid #e2e8f0', fontWeight: 700, color: '#2563eb' }}>{v}</td>
                        <td style={{ padding: '10px 6px', fontWeight: 700, color: '#dc2626' }}>{dr}</td>
                      </React.Fragment>
                    );
                  })}
                  <td style={{ padding: '10px 6px', borderLeft: '2px solid #cbd5e1', background: '#eff6ff', fontWeight: 800, color: '#1e40af' }}>{sumVal}</td>
                  <td style={{ padding: '10px 6px', background: '#eff6ff', fontWeight: 800, color: '#dc2626' }}>{sumDrop}</td>
                </tr>
              );
            })}
            {/* Totals Row */}
            <tr style={{ background: '#f8fafc', borderTop: '2px solid #cbd5e1', fontWeight: 900, color: '#0f172a' }}>
              <td style={{ padding: '14px 16px', textAlign: 'left' }}>합계</td>
              <td style={{ padding: '14px' }}>{DEPARTMENTS.reduce((acc, dept) => acc + getDataFn(weeks[0] || '1월1주차', dept).reg, 0)}명</td>
              {weeks.map(w => {
                const totV = DEPARTMENTS.reduce((acc, dept) => acc + getDataFn(w, dept)[valKey], 0);
                const totDr = DEPARTMENTS.reduce((acc, dept) => acc + getDataFn(w, dept)[dropKey], 0);
                return (
                  <React.Fragment key={w}>
                    <td style={{ padding: '12px 6px', borderLeft: '1px solid #e2e8f0', color: '#2563eb' }}>{totV}</td>
                    <td style={{ padding: '12px 6px', color: '#dc2626' }}>{totDr}</td>
                  </React.Fragment>
                );
              })}
              <td style={{ padding: '12px 6px', borderLeft: '2px solid #cbd5e1', background: '#dbeafe', color: '#1e40af' }}>
                {DEPARTMENTS.reduce((acc, dept) => acc + weeks.reduce((wAcc, w) => wAcc + getDataFn(w, dept)[valKey], 0), 0)}
              </td>
              <td style={{ padding: '12px 6px', background: '#dbeafe', color: '#dc2626' }}>
                {DEPARTMENTS.reduce((acc, dept) => acc + weeks.reduce((wAcc, w) => wAcc + getDataFn(w, dept)[dropKey], 0), 0)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
