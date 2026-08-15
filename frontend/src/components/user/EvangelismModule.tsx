import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { logService } from '../../services/logService';
import { adminService, UserItem } from '../../services/adminService';
import { diagnosisService } from '../../services/diagnosisService';
import defaultChurchesData from '../../assets/defaultChurches.json';
import { Building2, Calendar, Lock, Send, CheckCircle2, BarChart3, Edit3, Filter, HelpCircle, Plus, Pencil, Trash2, PieChart, TrendingUp, Activity, LayoutDashboard, X, ClipboardList, FileBarChart, FileSpreadsheet } from 'lucide-react';
import { EvangelismPlanTab } from './EvangelismPlanTab';
import { EvangelismMonthlyReportTab } from './EvangelismMonthlyReportTab';
import { EvangelismMonthlyReportExportTab } from './EvangelismMonthlyReportExportTab';

import api from '../../services/api';

// ============================================================
// 그래프 대시보드 타입 & 상수
// ============================================================
const CHURCH_COLOR_PALETTE = [
  '#2563eb', '#16a34a', '#dc2626', '#9333ea', '#ea580c',
  '#0891b2', '#d97706', '#db2777', '#65a30d', '#7c3aed'
];

interface ChartConfig {
  id: string;
  title: string;
  chartType: 'bar' | 'line' | 'pie' | 'radar';
  churches: string[];           // 다중 교회 선택
  churchColors: Record<string, string>; // 교회별 색상
  dataKeys: string[];           // 데이터 항목 (reg, find, gospel, admit 등)
  weekRange: 'current' | 'month' | 'all'; // 기간
}

interface DeptData {
  reg: number;       // 전도재적
  [key: string]: number; // 동적 키 지원
}

interface ConfigItem {
  key: string;
  label: string;
  fullName?: string;
  color: string;
  isDrop: boolean;
  groupName?: string;
  groupDesc?: string;
}

interface EvangelismModuleProps {
  initialTab?: 'check' | 'aggregate' | 'plan' | 'monthly' | 'report';
}

const DEPARTMENTS = ['교역자', '자문회', '장년회', '부녀회', '청년회'];

// Helper to get all weeks and current week dynamically
const getDynamicWeekConfig = (selectedYearStr: string) => {
  const currentYearNum = new Date().getFullYear();
  const selectedYearNum = parseInt(selectedYearStr.replace(/[^0-9]/g, '')) || 2026;
  const isCurrentYear = (selectedYearNum === currentYearNum);
  
  // Calculate all weeks for selected year (starting from Sunday-to-Saturday weeks)
  const d = new Date(selectedYearNum - 1, 11, 25);
  while (d.getDay() !== 0) {
    d.setDate(d.getDate() - 1);
  }

  const weeks: { weekKey: string; rangeStr: string; month: number; weekNum: number }[] = [];
  const monthWeekCounts: Record<number, number> = {};
  
  const today = new Date();
  let detectedCurrentWeekKey = '';
  
  for (let i = 0; i < 54; i++) {
    const start = new Date(d);
    const end = new Date(d);
    end.setDate(end.getDate() + 6);
    
    // Starting Sunday determines the month of the week
    const startYear = start.getFullYear();
    const m = start.getMonth() + 1;
    
    if (startYear > selectedYearNum) {
      break;
    }
    
    if (startYear === selectedYearNum) {
      monthWeekCounts[m] = (monthWeekCounts[m] || 0) + 1;
      const weekNum = monthWeekCounts[m];
      const weekKey = `${m}월${weekNum}주차`;
      const rangeStr = `(${start.getMonth() + 1}/${start.getDate()} ~ ${end.getMonth() + 1}/${end.getDate()})`;
      
      weeks.push({
        weekKey,
        rangeStr,
        month: m,
        weekNum
      });
      
      const startCheck = new Date(start);
      startCheck.setHours(0,0,0,0);
      const endCheck = new Date(end);
      endCheck.setHours(23,59,59,999);
      
      if (today >= startCheck && today <= endCheck) {
        detectedCurrentWeekKey = weekKey;
      }
    }
    d.setDate(d.getDate() + 7);
  }
  
  // Default fallbacks if not found
  if (!detectedCurrentWeekKey && weeks.length > 0) {
    if (isCurrentYear) {
      const lastWeek = weeks[weeks.length - 1];
      detectedCurrentWeekKey = lastWeek.weekKey;
    } else {
      detectedCurrentWeekKey = '12월4주차';
    }
  }

  // Capping available weeks at current week for current year
  let allowedWeeks = [...weeks];
  if (isCurrentYear) {
    const currentWeekIdx = weeks.findIndex(w => w.weekKey === detectedCurrentWeekKey);
    if (currentWeekIdx !== -1) {
      allowedWeeks = weeks.slice(0, currentWeekIdx + 1);
    }
  }
  
  return {
    allWeeks: weeks,
    allowedWeeks: allowedWeeks,
    currentWeekKey: detectedCurrentWeekKey || (isCurrentYear ? '7월3주차' : '12월4주차')
  };
};

export const EvangelismModule: React.FC<EvangelismModuleProps> = ({ initialTab = 'check' }) => {
  const navigate = useNavigate();
  // 1. Navigation Sub-tab ('check': 교회별 데이터 확인, 'aggregate': 취합, 'plan': 계획)
  const [activeTab, setActiveTab] = useState<'check' | 'aggregate' | 'plan' | 'monthly' | 'report'>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // 2. User Permission & Scope Guard
  const [userScope, setUserScope] = useState<string>('전체');
  const [userRole, setUserRole] = useState<string>('ROLE_ADMIN');
  const [availableChurches, setAvailableChurches] = useState<{ id: string; name: string; jipa: string; country: string }[]>([]);
  const [selectedChurch, setSelectedChurch] = useState<string>('도쿄교회');

  // 3. Date & Week Filters
  const currentYearNum = new Date().getFullYear();
  const currentMonthNum = new Date().getMonth() + 1;
  const [selectedYear, setSelectedYear] = useState<string>(() => `${currentYearNum}년`);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => `${currentMonthNum}월`);
  const [selectedWeekCheck, setSelectedWeekCheck] = useState<string>('전체'); // For Tab 1
  const [selectedWeekAgg, setSelectedWeekAgg] = useState<string>(() => getDynamicWeekConfig(`${currentYearNum}년`).currentWeekKey);   // For Tab 2

  const dynamicYears: string[] = [];
  for (let y = currentYearNum; y >= 2025; y--) {
    dynamicYears.push(`${y}년`);
  }

  const selectedYearNumForMonthly = parseInt(selectedYear.replace(/[^0-9]/g, ''), 10) || currentYearNum;
  const monthsLimit = selectedYearNumForMonthly < currentYearNum ? 12 : currentMonthNum;
  const monthlyOptions = Array.from({ length: monthsLimit }, (_, i) => `${i + 1}월`);

  useEffect(() => {
    if (!monthlyOptions.includes(selectedMonth)) {
      setSelectedMonth(monthlyOptions[monthlyOptions.length - 1] || '1월');
    }
  }, [selectedYear]);

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

  // Dynamic config states
  const [itemsConfig, setItemsConfig] = useState<Record<string, ConfigItem[]>>({});
  const [activeItems, setActiveItems] = useState<ConfigItem[]>([]);

  // ── 그래프 대시보드 상태 ──────────────────────────────────
  const [chartConfigs, setChartConfigs] = useState<ChartConfig[]>([]);
  const [isChartEditMode, setIsChartEditMode] = useState<boolean>(false);
  const [isChartModalOpen, setIsChartModalOpen] = useState<boolean>(false);
  const [editingChart, setEditingChart] = useState<ChartConfig | null>(null);
  // 각 교회별로 로드된 dbRecords 캐시 (key: churchName)
  const [multiChurchRecords, setMultiChurchRecords] = useState<Record<string, Record<string, Record<string, DeptData>>>>({});
  // 모달 내부 임시 상태
  const [modalTitle, setModalTitle] = useState<string>('');
  const [modalChartType, setModalChartType] = useState<'bar' | 'line' | 'pie' | 'radar'>('bar');
  const [modalChurches, setModalChurches] = useState<string[]>([]);
  const [modalChurchColors, setModalChurchColors] = useState<Record<string, string>>({});
  const [modalDataKeys, setModalDataKeys] = useState<string[]>(['find']);
  const [modalWeekRange, setModalWeekRange] = useState<'current' | 'month' | 'all'>('all');
  const mainItems = activeItems.filter(item => !item.isDrop);

  // 5. Help Descriptions Tooltip Modal State
  const [activeHelpKey, setActiveHelpKey] = useState<string | null>(null);
  const [activeHelpTitle, setActiveHelpTitle] = useState<string>('');
  const [helpTexts, setHelpTexts] = useState<Record<string, string>>({
    DESC_EVANGELISM_STATUS_1: '선택한 교회의 주차별 전도 현황을 요약하여 한눈에 볼 수 있는 메인 대시보드 표입니다.',
    DESC_FIND_DETAIL_2: '주차별 찾기와 탈락수를 볼 수 있습니다.',
    DESC_GOSPEL_DETAIL_3: '주차별 복음방과 탈락수를 볼 수 있습니다.',
    DESC_ADMIT_DETAIL_4: '주차별 가개강(등록)과 탈락수를 볼 수 있습니다.'
  });

  // 5-1. Process Workflow States
  const [isProcessEditMode, setIsProcessEditMode] = useState<boolean>(false);
  const [tempActiveItems, setTempActiveItems] = useState<ConfigItem[]>([]);
  const [selectedStepKeys, setSelectedStepKeys] = useState<string[]>([]);

  // Step Edit Modal State
  const [isStepEditModalOpen, setIsStepEditModalOpen] = useState<boolean>(false);
  const [editingStepItem, setEditingStepItem] = useState<ConfigItem | null>(null);
  const [editStepFullName, setEditStepFullName] = useState<string>('');
  const [editStepLabel, setEditStepLabel] = useState<string>('');
  const [editStepDesc, setEditStepDesc] = useState<string>('');

  // Step View Modal State
  const [isStepViewModalOpen, setIsStepViewModalOpen] = useState<boolean>(false);
  const [viewStepItem, setViewStepItem] = useState<ConfigItem | null>(null);

  const openHelpModal = (key: string, title: string, customText?: string) => {
    setActiveHelpKey(key);
    setActiveHelpTitle(title);
    if (customText) {
      setHelpTexts(prev => ({ ...prev, [key]: customText }));
    }
  };

  const handleChevronClick = (step: ConfigItem) => {
    if (isProcessEditMode) {
      setEditingStepItem(step);
      setEditStepFullName(step.fullName || step.label);
      setEditStepLabel(step.label);
      setEditStepDesc(step.groupDesc || '');
      setIsStepEditModalOpen(true);
    } else {
      setViewStepItem(step);
      setIsStepViewModalOpen(true);
    }
  };

  const handleApplyStepEdit = () => {
    if (!editingStepItem) return;
    if (!editStepFullName.trim()) {
      alert('단계 명칭을 입력해 주세요.');
      return;
    }
    if (!editStepLabel.trim()) {
      alert('단계 약어를 입력해 주세요.');
      return;
    }

    const updated = tempActiveItems.map(item => {
      if (item.key === editingStepItem.key) {
        return {
          ...item,
          label: editStepLabel,
          fullName: editStepFullName,
          groupName: `${editStepFullName} 상세분석`,
          groupDesc: editStepDesc
        };
      }
      if (item.key === `${editingStepItem.key}Drop`) {
        return {
          ...item,
          label: '탈',
          groupName: `${editStepFullName} 상세분석`
        };
      }
      return item;
    });

    setTempActiveItems(updated);
    setIsStepEditModalOpen(false);
    setEditingStepItem(null);
  };

  const handleProcessAdd = () => {
    let insertIdx = tempActiveItems.length;
    if (selectedStepKeys.length > 0) {
      const selectedKey = selectedStepKeys[0];
      const idx = tempActiveItems.findIndex(item => item.key === selectedKey);
      if (idx !== -1) {
        insertIdx = idx + 2; // Insert after selected step & its drop item
      }
    }

    const uniqueId = Date.now();
    const newStepKey = `step_${uniqueId}`;
    const newStepDropKey = `${newStepKey}Drop`;

    const stepColors = ['#2563eb', '#7c3aed', '#059669', '#db2777', '#ea580c', '#0d9488'];
    const currentStepsCount = tempActiveItems.filter(item => !item.isDrop).length;
    const generatedColor = stepColors[currentStepsCount % stepColors.length];

    const newStep: ConfigItem = {
      key: newStepKey,
      label: '신규',
      fullName: '신규 단계',
      color: generatedColor,
      isDrop: false,
      groupName: '신규 단계 상세분석',
      groupDesc: '신규 단계의 상세 기준을 이곳에 작성하세요.'
    };

    const newStepDrop: ConfigItem = {
      key: newStepDropKey,
      label: '탈',
      color: '#dc2626',
      isDrop: true,
      groupName: '신규 단계 상세분석'
    };

    const newList = [...tempActiveItems];
    newList.splice(insertIdx, 0, newStep, newStepDrop);

    setTempActiveItems(newList);
    setSelectedStepKeys([]);

    setEditingStepItem(newStep);
    setEditStepFullName(newStep.fullName || newStep.label);
    setEditStepLabel(newStep.label);
    setEditStepDesc(newStep.groupDesc || '');
    setIsStepEditModalOpen(true);
  };

  const handleProcessDelete = () => {
    if (selectedStepKeys.length === 0) {
      alert('삭제할 단계를 선택해 주세요.');
      return;
    }

    const hasRequired = selectedStepKeys.some(key => {
      const item = tempActiveItems.find(i => i.key === key);
      if (!item) return false;
      const k = item.key.toLowerCase();
      const l = item.label.toLowerCase();
      return (
        k === 'find' || l.includes('찾') ||
        k === 'gospel' || l.includes('복음방') || l === '복' ||
        k === 'admit' || l.includes('센터') || l.includes('가개강') || l.includes('개강') || l === '개' || l === '센'
      );
    });

    if (hasRequired) {
      alert('찾기, 복음방, 개강 단계는 필수 단계이므로 삭제할 수 없습니다.');
      return;
    }

    if (!window.confirm('선택한 단계를 삭제하시겠습니까?')) {
      return;
    }

    let newList = [...tempActiveItems];
    selectedStepKeys.forEach(key => {
      newList = newList.filter(item => item.key !== key && item.key !== `${key}Drop`);
    });

    setTempActiveItems(newList);
    setSelectedStepKeys([]);
  };

  const handleProcessSave = async () => {
    const currentChurchObj = availableChurches.find(c => c.name === selectedChurch);
    const country = currentChurchObj ? currentChurchObj.country : 'default';
    if (!country) {
      alert('선택된 교회의 국가 정보를 확인할 수 없습니다.');
      return;
    }

    const todayStr = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });

    const updatedLastUpdated = {
      ...(itemsConfig.lastUpdated || {}),
      [country]: todayStr
    };

    const updatedConfig = {
      ...itemsConfig,
      [country]: tempActiveItems,
      lastUpdated: updatedLastUpdated
    };

    try {
      await api.post('/evangelism/config/items', updatedConfig);
      alert('전도 프로세스 설정이 성공적으로 저장되었습니다!');
      setIsProcessEditMode(false);
      await fetchConfigs();
    } catch (e) {
      console.error(e);
      alert('프로세스 저장 중 오류가 발생했습니다.');
    }
  };

  const fetchConfigs = async () => {
    try {
      const res = await api.get<any>('/evangelism/config/items');
      setItemsConfig(res.data || {});
    } catch (e) {
      console.error("Failed to fetch evangelism config items", e);
    }
  };

  // ── 그래프 설정 DB 저장/로드 ─────────────────────────────
  const getUsername = (): string => {
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      return u.username || 'guest';
    } catch { return 'guest'; }
  };

  const fetchChartConfigs = useCallback(async () => {
    const username = getUsername();
    try {
      const res = await api.get<any>(`/evangelism/chart-config?username=${encodeURIComponent(username)}`);
      if (Array.isArray(res.data)) {
        setChartConfigs(res.data as ChartConfig[]);
      }
    } catch (e) {
      console.warn('Failed to load chart configs', e);
    }
  }, []);

  const saveChartConfigs = async (configs: ChartConfig[]) => {
    const username = getUsername();
    try {
      await api.post(`/evangelism/chart-config?username=${encodeURIComponent(username)}`, configs);
    } catch (e) {
      console.error('Failed to save chart configs', e);
    }
  };

  // 여러 교회의 DB 데이터를 한번에 로드 (그래프용)
  const fetchMultiChurchRecords = useCallback(async (churches: string[]) => {
    const missing = churches.filter(c => !multiChurchRecords[c]);
    if (missing.length === 0) return;
    try {
      const results = await Promise.all(
        missing.map(church =>
          api.get<any[]>(`/evangelism/records?church=${encodeURIComponent(church)}&year=${selectedYear}`)
            .then(res => ({ church, data: res.data }))
            .catch(() => ({ church, data: [] }))
        )
      );
      setMultiChurchRecords(prev => {
        const updated = { ...prev };
        results.forEach(({ church, data }) => {
          const map: Record<string, Record<string, DeptData>> = {};
          (data || []).forEach((r: any) => {
            if (!map[r.weekKey]) map[r.weekKey] = {};
            let dynamicVals: Record<string, number> = {};
            try { if (r.dynamicData) dynamicVals = JSON.parse(r.dynamicData); } catch {}
            map[r.weekKey][r.department] = {
              reg: r.regCount || 0,
              find: dynamicVals.find ?? (r.findCount || 0),
              findDrop: dynamicVals.findDrop ?? (r.findDropCount || 0),
              gospel: dynamicVals.gospel ?? (r.gospelCount || 0),
              gospelDrop: dynamicVals.gospelDrop ?? (r.gospelDropCount || 0),
              admit: dynamicVals.admit ?? (r.admitCount || 0),
              admitDrop: dynamicVals.admitDrop ?? (r.admitDropCount || 0),
              ...dynamicVals
            };
          });
          updated[church] = map;
        });
        return updated;
      });
    } catch (e) {
      console.error('Failed to fetch multi-church records', e);
    }
  }, [selectedYear, multiChurchRecords]);

  const [membershipRegMap, setMembershipRegMap] = useState<Record<string, Record<string, number>>>({});

  const fetchDbRecords = async () => {
    setLoadingDb(true);
    try {
      const curYearNum = parseInt(selectedYear.replace(/[^0-9]/g, '')) || 2026;
      const prevYearStr = `${curYearNum - 1}년`;

      const [res, memRes, prevMemRes] = await Promise.all([
        api.get<any[]>(`/evangelism/records?church=${encodeURIComponent(selectedChurch)}&year=${selectedYear}`),
        api.get<any[]>(`/membership/records?church=${encodeURIComponent(selectedChurch)}&year=${selectedYear}`).catch(() => ({ data: [] })),
        api.get<any[]>(`/membership/records?church=${encodeURIComponent(selectedChurch)}&year=${prevYearStr}`).catch(() => ({ data: [] }))
      ]);

      const map: Record<string, Record<string, DeptData>> = {};
      res.data.forEach((r: any) => {
        if (!map[r.weekKey]) {
          map[r.weekKey] = {};
        }

        let dynamicVals: Record<string, number> = {};
        if (r.dynamicData) {
          try {
            dynamicVals = JSON.parse(r.dynamicData);
          } catch (e) {
            console.error("Failed to parse dynamicData", e);
          }
        }

        map[r.weekKey][r.department] = {
          reg: r.regCount || 0,
          find: dynamicVals.find !== undefined ? dynamicVals.find : (r.findCount || 0),
          findDrop: dynamicVals.findDrop !== undefined ? dynamicVals.findDrop : (r.findDropCount || 0),
          gospel: dynamicVals.gospel !== undefined ? dynamicVals.gospel : (r.gospelCount || 0),
          gospelDrop: dynamicVals.gospelDrop !== undefined ? dynamicVals.gospelDrop : (r.gospelDropCount || 0),
          admit: dynamicVals.admit !== undefined ? dynamicVals.admit : (r.admitCount || 0),
          admitDrop: dynamicVals.admitDrop !== undefined ? dynamicVals.admitDrop : (r.admitDropCount || 0),
          ...dynamicVals
        };
      });
      setDbRecords(map);

      const memRawMap: Record<string, Record<string, any>> = {};
      if (Array.isArray(memRes.data)) {
        memRes.data.forEach((r: any) => {
          if (!memRawMap[r.monthKey]) memRawMap[r.monthKey] = {};
          memRawMap[r.monthKey][r.department] = r;
        });
      }

      // 전년도 12월 말 전도재적(부서별) — DB의 calculatedEvangReg는 저장 경로에 따라 갱신이 안 돼 있을
      // 수 있어 신뢰하지 않고, 원본 증가/감소값으로 1월~12월 순서대로 직접 롤링 계산한다(내무 화면의
      // getMonthlyCumulativeData와 동일 방식). 어떤 주차를 선택하든 이 값은 그대로 고정된다.
      const prevYearDecMap: Record<string, number> = {};
      if (Array.isArray(prevMemRes.data)) {
        const byDeptMonth: Record<string, Record<number, any>> = {};
        prevMemRes.data.forEach((r: any) => {
          const m = parseInt(String(r.monthKey).replace('월', ''), 10);
          if (!m) return;
          if (!byDeptMonth[r.department]) byDeptMonth[r.department] = {};
          byDeptMonth[r.department][m] = r;
        });
        DEPARTMENTS.forEach(dept => {
          let bal = 0;
          for (let m = 1; m <= 12; m++) {
            const r = byDeptMonth[dept]?.[m];
            if (!r) continue;
            bal = Math.max(0, bal + (r.evangIncrease || 0) - (r.evangDecrease || 0));
          }
          prevYearDecMap[dept] = bal;
        });
      }

      const memMap: Record<string, Record<string, number>> = {};
      DEPARTMENTS.forEach(dept => {
        let cumEvang = prevYearDecMap[dept] || 0;
        for (let m = 1; m <= 12; m++) {
          const mKey = `${m}월`;
          if (!memMap[mKey]) memMap[mKey] = {};
          
          // Month m's base 전도재적 for evangelism activity is previous month's final calculated count!
          memMap[mKey][dept] = cumEvang;

          const r = memRawMap[mKey]?.[dept];
          const inc = r?.evangIncrease || 0;
          const dec = r?.evangDecrease || 0;
          cumEvang = Math.max(0, cumEvang + inc - dec);
        }
      });
      setMembershipRegMap(memMap);
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
    const config = getDynamicWeekConfig(selectedYear);
    const validWeeks = [
      '전체',
      ...Array.from(new Set(config.allowedWeeks.map(w => `${w.month}월`))),
      ...config.allowedWeeks.map(w => w.weekKey)
    ];

    if (!validWeeks.includes(selectedWeekCheck)) {
      setSelectedWeekCheck('전체');
    }
    setSelectedWeekAgg(config.currentWeekKey);
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
    const config = getDynamicWeekConfig(selectedYear);
    const ALL_WEEKS_LIST = config.allowedWeeks.map(w => w.weekKey);
    const selectedWeekIdx = ALL_WEEKS_LIST.indexOf(selectedWeekAgg);
    const prevWeekKey = selectedWeekIdx > 0 ? ALL_WEEKS_LIST[selectedWeekIdx - 1] : '1월1주차';
    checkPrevAccessPermission(prevWeekKey);
  }, [selectedChurch, selectedYear, selectedWeekAgg]);

  useEffect(() => {
    const handleRefresh = () => {
      checkAccessPermission();
      const config = getDynamicWeekConfig(selectedYear);
      const ALL_WEEKS_LIST = config.allowedWeeks.map(w => w.weekKey);
      const selectedWeekIdx = ALL_WEEKS_LIST.indexOf(selectedWeekAgg);
      const prevWeekKey = selectedWeekIdx > 0 ? ALL_WEEKS_LIST[selectedWeekIdx - 1] : '1월1주차';
      checkPrevAccessPermission(prevWeekKey);
    };
    window.addEventListener('refreshEditRequests', handleRefresh);
    return () => window.removeEventListener('refreshEditRequests', handleRefresh);
  }, [selectedChurch, selectedYear, selectedWeekAgg]);

  // Fetch help descriptions, items configuration, and chart configs on mount
  useEffect(() => {
    fetchConfigs();
    fetchChartConfigs();
    adminService.getConfigs().then((data) => {
      const map: Record<string, string> = {};
      data.forEach((c: any) => {
        if (c.configKey.startsWith('DESC_')) {
          map[c.configKey] = c.configValue;
        }
      });
      setHelpTexts(prev => ({ ...prev, ...map }));
    }).catch((e) => {
      console.warn("Failed to load help descriptions from DB, using defaults:", e);
    });
  }, []);

  // 그래프 카드에서 사용되는 교회 데이터를 selectedYear 변경시 갱신
  useEffect(() => {
    const allChurches = Array.from(new Set(chartConfigs.flatMap(c => c.churches)));
    if (allChurches.length > 0) {
      setMultiChurchRecords({});
    }
  }, [selectedYear]);

  // Update active items when selected church or config changes
  useEffect(() => {
    if (!selectedChurch || availableChurches.length === 0) return;
    const church = availableChurches.find(c => c.name === selectedChurch);
    const country = church ? church.country : '';

    const defaults = [
      {key: "find", label: "찾", fullName: "찾기", color: "#2563eb", isDrop: false, groupName: "찾기 상세분석", groupDesc: "주차별 찾기와 탈락수를 볼 수 있습니다."},
      {key: "findDrop", label: "탈", color: "#dc2626", isDrop: true, groupName: "찾기 상세분석"},
      {key: "gospel", label: "복", fullName: "복음방", color: "#7c3aed", isDrop: false, groupName: "복음방 상세분석", groupDesc: "주차별 복음방과 탈락수를 볼 수 있습니다."},
      {key: "gospelDrop", label: "탈", color: "#dc2626", isDrop: true, groupName: "복음방 상세분석"},
      {key: "admit", label: "개", fullName: "개강", color: "#16a34a", isDrop: false, groupName: "개강 상세분석", groupDesc: "주차별 개강과 탈락수를 볼 수 있습니다."},
      {key: "admitDrop", label: "탈", color: "#dc2626", isDrop: true, groupName: "개강 상세분석"}
    ];

    if (country && itemsConfig[country]) {
      setActiveItems(itemsConfig[country]);
    } else if (itemsConfig['default']) {
      setActiveItems(itemsConfig['default']);
    } else {
      setActiveItems(defaults);
    }
  }, [selectedChurch, availableChurches, itemsConfig]);

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

    // Build church options and load from database
    const loadAvailableChurches = async () => {
      let list: { id: string; name: string; jipa: string; country: string; sortOrder?: number }[] = [];
      // 본부/해선부는 조직도 전용 — 제외 헬퍼
      const isHq = (c: any) => c.continent === '본부' || c.jipa === '본부' || c.name === '해선부';
      try {
        const data = await diagnosisService.getChurches();
        if (data && data.length > 0) {
          list = data
            .filter((c: any) => !isHq(c))
            .map((c: any) => ({
              id: c.name,
              name: c.name,
              jipa: c.jipa || '맛디아',
              country: c.country || '',
              sortOrder: c.sortOrder
            }));
        }
      } catch (err) {
        console.warn("Failed to fetch churches from API, using default list:", err);
      }

      if (list.length === 0) {
        defaultChurchesData
          .filter((c: any) => !isHq(c))
          .forEach((c: any) => {
            list.push({ id: c.name, name: c.name, jipa: c.jipa || '맛디아', country: c.country || '', sortOrder: c.sortOrder });
          });
      }

      // Sort by sortOrder ASC, name ASC
      list.sort((a, b) => {
        const orderA = a.sortOrder !== undefined && a.sortOrder !== null ? a.sortOrder : 999999;
        const orderB = b.sortOrder !== undefined && b.sortOrder !== null ? b.sortOrder : 999999;
        if (orderA !== orderB) return orderA - orderB;
        return a.name.localeCompare(b.name, 'ko');
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
    };
    loadAvailableChurches();

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
  }, [selectedWeekAgg, dbRecords, activeItems]);

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

  // Generate Weekly Options dynamically based on date configuration
  const generateWeeklyOptions = (includeSummary: boolean = true) => {
    const options: { value: string; label: string; isMonthHeader?: boolean }[] = [];
    const config = getDynamicWeekConfig(selectedYear);

    if (includeSummary) {
      options.push({ value: '전체', label: `🌐 전체 (1월 1주차 ~ ${config.currentWeekKey})` });
    }

    const groupedByMonth: Record<number, typeof config.allowedWeeks> = {};
    config.allowedWeeks.forEach(w => {
      if (!groupedByMonth[w.month]) {
        groupedByMonth[w.month] = [];
      }
      groupedByMonth[w.month].push(w);
    });

    Object.keys(groupedByMonth).map(Number).sort((a, b) => a - b).forEach(m => {
      if (includeSummary) {
        options.push({ value: `${m}월`, label: `📅 ${m}월 (전체 주차 집계)`, isMonthHeader: true });
      }

      groupedByMonth[m].forEach(w => {
        const suffix = (w.weekKey === config.currentWeekKey) ? ' [현재주차]' : '';
        options.push({
          value: w.weekKey,
          label: `   ㄴ ${w.weekKey} ${w.rangeStr}${suffix}`
        });
      });
    });

    return options;
  };

  // Weekly Data Generator with Database & Membership Sync priority
  const getWeeklyData = (weekKey: string, dept: string): DeptData => {
    let rec: DeptData = { reg: 0 };
    if (dbRecords[weekKey] && dbRecords[weekKey][dept]) {
      rec = { ...dbRecords[weekKey][dept] };
    } else {
      activeItems.forEach(item => {
        rec[item.key] = 0;
      });
    }

    const monthMatch = weekKey.match(/^[0-9]+월/);
    if (monthMatch && monthMatch[0]) {
      const monthKey = monthMatch[0];
      if (membershipRegMap[monthKey] && membershipRegMap[monthKey][dept] !== undefined && membershipRegMap[monthKey][dept] > 0) {
        rec.reg = membershipRegMap[monthKey][dept];
      }
    }

    return rec;
  };

  // Filter weeks to render based on selectedWeekCheck ('전체', '1월', '1월1주차' etc.)
  const getFilteredWeeks = () => {
    const config = getDynamicWeekConfig(selectedYear);
    const allWeeks = config.allowedWeeks.map(w => w.weekKey);

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

    const regWeek = (selectedWeekCheck === '전체')
      ? (filteredWeeks[filteredWeeks.length - 1] || '1월1주차')
      : (filteredWeeks[0] || '1월1주차');

    DEPARTMENTS.forEach(dept => {
      const regData = getWeeklyData(regWeek, dept);
      totalReg += regData.reg;

      filteredWeeks.forEach(w => {
        const d = getWeeklyData(w, dept);
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

  const renderProcessChevrons = () => {
    const currentItems = isProcessEditMode ? tempActiveItems : activeItems;
    const steps = currentItems.filter(item => !item.isDrop);
    const currentChurchObj = availableChurches.find(c => c.name === selectedChurch);
    const country = currentChurchObj ? currentChurchObj.country : 'default';
    const lastUpdatedStr = itemsConfig.lastUpdated?.[country] || itemsConfig.lastUpdated?.['default'] || '2026년 8월 6일';

    return (
      <div style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 4px 14px rgba(0,0,0,0.03)'
      }}>
        {/* Title & Actions Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              1. 전도 프로세스 <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}>({lastUpdatedStr} 갱신)</span>
            </h3>
            <button
              onClick={() => openHelpModal('PROCESS_HELP', '전도 프로세스 안내', '국가별 전도 프로세스 흐름을 조회하고 단계별 상세 기준을 볼 수 있습니다. 수정 모드에서 단계를 추가/삭제 및 기준 변경이 가능합니다.')}
              style={{ background: 'none', border: 'none', padding: 0, display: 'inline-flex', alignItems: 'center', cursor: 'pointer', color: '#94a3b8' }}
              title="도움말"
            >
              <HelpCircle size={16} />
            </button>
          </div>

          {/* Buttons */}
          {!isProcessEditMode ? (
            <button
              onClick={() => {
                setTempActiveItems([...activeItems]);
                setSelectedStepKeys([]);
                setIsProcessEditMode(true);
              }}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#475569',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              수정
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleProcessAdd}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#22c55e',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                추가
              </button>
              <button
                onClick={handleProcessDelete}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#ef4444',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                삭제
              </button>
              <button
                onClick={handleProcessSave}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#16a34a',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                저장
              </button>
              <button
                onClick={() => setIsProcessEditMode(false)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#475569',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                취소
              </button>
            </div>
          )}
        </div>

        {/* Chevrons Row */}
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center', overflowX: 'auto', paddingBottom: '10px' }}>
          {steps.map((step, idx) => {
            const isChecked = selectedStepKeys.includes(step.key);
            const chevronColor = step.color || '#2563eb';

            return (
              <div key={step.key} style={{ minWidth: '160px', flex: 1, position: 'relative' }}>
                {/* Chevron Shape */}
                <div
                  onClick={() => handleChevronClick(step)}
                  style={{
                    width: '100%',
                    height: '52px',
                    background: chevronColor,
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    position: 'relative',
                    paddingLeft: idx > 0 ? '16px' : '8px',
                    paddingRight: '20px',
                    boxSizing: 'border-box',
                    clipPath: idx === 0 
                      ? 'polygon(0% 0%, calc(100% - 12px) 0%, 100% 50%, calc(100% - 12px) 100%, 0% 100%)'
                      : 'polygon(0% 0%, calc(100% - 12px) 0%, 100% 50%, calc(100% - 12px) 100%, 0% 100%, 12px 50%)',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.06)',
                    transition: 'transform 0.15s ease, filter 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.filter = 'brightness(1.08)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.filter = 'none';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    {isProcessEditMode && (
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedStepKeys([step.key]);
                          } else {
                            setSelectedStepKeys([]);
                          }
                        }}
                        onClick={(e) => e.stopPropagation()} // Stop propagation to prevent opening the edit modal
                        style={{ cursor: 'pointer', width: '15px', height: '15px', margin: 0 }}
                      />
                    )}
                    <span>{idx + 1}단계({step.fullName || (step.key === 'find' ? '찾기' : step.key === 'gospel' ? '복음방' : step.key === 'admit' ? '개강' : step.label)})</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '10px' }}>
          ※ 단계를 누르면 상세 기준(조회/수정) 모달창이 나옵니다.
        </div>
      </div>
    );
  };
  const getStepModalTitle = (step: ConfigItem) => {
    const nonDropItems = activeItems.filter(item => !item.isDrop);
    const idx = nonDropItems.findIndex(item => item.key === step.key);
    const stepNum = idx !== -1 ? `${idx + 1}단계` : '';
    const fullName = step.fullName || (step.key === 'find' ? '찾기' : step.key === 'gospel' ? '복음방' : step.key === 'admit' ? '개강' : step.label);
    return stepNum ? `${stepNum}(${fullName})` : fullName;
  };

  const findLabel = activeItems.find(item => item.key === 'find')?.label || '찾기';
  const gospelLabel = activeItems.find(item => item.key === 'gospel')?.label || '복음방';
  const admitLabel = activeItems.find(item => item.key === 'admit')?.label || '가개강(등록)';

  const isScopeRestricted = userRole !== 'ROLE_ADMIN' && userRole !== 'ADMIN' && userScope !== '전체';

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '20px' }}>
      <style>{`
        input[type=number]::-webkit-outer-spin-button,
        input[type=number]::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type=number] {
          -moz-appearance: textfield;
        }
      `}</style>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, letterSpacing: '-0.5px', color: '#f8fafc' }}>
            ① 전도 · 가개강 종합 관리 포탈
          </h1>
          <button
            onClick={() => openHelpModal('PORTAL_HELP', '① 전도 · 가개강 종합 관리 포탈 안내', '전세계 해외교회의 주차별 찾기 · 복음방 · 가개강(등록) 실적을 실시간으로 확인하고 합산/취합하는 종합 포탈입니다.')}
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: 'none',
              borderRadius: '50%',
              width: '24px',
              height: '24px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#ffffff',
              padding: 0,
              fontSize: '0.85rem',
              fontWeight: 'bold',
              transition: 'background 0.2s',
              outline: 'none'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
            title="포탈 설명 보기"
          >
            ?
          </button>
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
            2. 주간보고
          </button>

          <button
            onClick={() => navigate('/evangelism/plan')}
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
              background: activeTab === 'plan' ? '#ffffff' : 'transparent',
              color: activeTab === 'plan' ? '#0f172a' : '#cbd5e1',
              boxShadow: activeTab === 'plan' ? '0 4px 14px rgba(0,0,0,0.2)' : 'none'
            }}
          >
            <ClipboardList size={18} color={activeTab === 'plan' ? '#7c3aed' : '#cbd5e1'} />
            3. 계획
          </button>

          <button
            onClick={() => navigate('/evangelism/monthly')}
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
              background: activeTab === 'monthly' ? '#ffffff' : 'transparent',
              color: activeTab === 'monthly' ? '#0f172a' : '#cbd5e1',
              boxShadow: activeTab === 'monthly' ? '0 4px 14px rgba(0,0,0,0.2)' : 'none'
            }}
          >
            <FileBarChart size={18} color={activeTab === 'monthly' ? '#0891b2' : '#cbd5e1'} />
            4. 월간보고
          </button>

          <button
            onClick={() => navigate('/evangelism/report')}
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
              background: activeTab === 'report' ? '#ffffff' : 'transparent',
              color: activeTab === 'report' ? '#0f172a' : '#cbd5e1',
              boxShadow: activeTab === 'report' ? '0 4px 14px rgba(0,0,0,0.2)' : 'none'
            }}
          >
            <FileSpreadsheet size={18} color={activeTab === 'report' ? '#0891b2' : '#cbd5e1'} />
            5. 월말보고서 출력
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
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

        {/* Right: Year & Month Filters for Monthly / Report Tabs */}
        {(activeTab === 'monthly' || activeTab === 'report') && (
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
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#166534' }}>월</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                style={{ border: 'none', background: 'transparent', fontWeight: 800, color: '#16a34a', fontSize: '0.9rem', outline: 'none', cursor: 'pointer' }}
              >
                {monthlyOptions.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Right: Year & Week Filters for Check/Aggregate Tabs */}
        {activeTab !== 'plan' && activeTab !== 'monthly' && activeTab !== 'report' && (
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
        )}
      </div>

      {activeTab !== 'plan' && activeTab !== 'monthly' && activeTab !== 'report' && renderProcessChevrons()}

      {activeTab === 'plan' && <EvangelismPlanTab selectedChurch={selectedChurch} />}

      {activeTab === 'monthly' && (
        <EvangelismMonthlyReportTab
          selectedChurch={selectedChurch}
          evangRegByDept={membershipRegMap['1월'] || {}}
          selectedYear={selectedYear}
          setSelectedYear={setSelectedYear}
          selectedMonth={selectedMonth}
          setSelectedMonth={setSelectedMonth}
        />
      )}

      {activeTab === 'report' && (
        <EvangelismMonthlyReportExportTab
          selectedChurch={selectedChurch}
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
        />
      )}

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
                🔍 총 {findLabel}수
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                <span style={{ fontSize: '2rem', fontWeight: 900, color: '#2563eb' }}>{kpi.totalFind}명</span>
                <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0284c7', background: '#e0f2fe', padding: '2px 10px', borderRadius: '8px' }}>
                  ({kpi.findRate}%)
                </span>
              </div>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '6px' }}>
                전도재적 대비 {findLabel} 성공 비율 · 선택 기간: {selectedWeekCheck}
              </div>
            </div>

            {/* Card 2: 총 복음방수 */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '22px 26px', boxShadow: '0 4px 14px rgba(0,0,0,0.03)' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b', marginBottom: '6px' }}>
                📖 총 {gospelLabel}수
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                <span style={{ fontSize: '2rem', fontWeight: 900, color: '#7c3aed' }}>{kpi.totalGospel}명</span>
                <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#6d28d9', background: '#f3e8ff', padding: '2px 10px', borderRadius: '8px' }}>
                  ({kpi.gospelRate}%)
                </span>
              </div>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '6px' }}>
                전도재적 대비 {gospelLabel} 비율 · 선택 기간: {selectedWeekCheck}
              </div>
            </div>

            {/* Card 3: 총 가등록수 */}
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '22px 26px', boxShadow: '0 4px 14px rgba(0,0,0,0.03)' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b', marginBottom: '6px' }}>
                📝 총 {admitLabel}수
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                <span style={{ fontSize: '2rem', fontWeight: 900, color: '#16a34a' }}>{kpi.totalAdmit}명</span>
                <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#15803d', background: '#dcfce7', padding: '2px 10px', borderRadius: '8px' }}>
                  ({kpi.admitRate}%)
                </span>
              </div>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '6px' }}>
                전도재적 대비 {admitLabel} 비율 · 선택 기간: {selectedWeekCheck}
              </div>
            </div>
          </div>

          {/* ===================================================================== */}
          {/* Table (1): 회별 전도 현황                                             */}
          {/* ===================================================================== */}
          <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', marginBottom: '28px', boxShadow: '0 4px 14px rgba(0,0,0,0.03)' }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📊 (1) 회별 전도 현황</span>
              <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>({selectedChurch} · {selectedYear} {selectedWeekCheck})</span>
              <button
                onClick={() => openHelpModal('DESC_EVANGELISM_STATUS_1', '(1) 회별 전도 현황 안내')}
                style={{ background: 'none', border: 'none', padding: 0, display: 'inline-flex', alignItems: 'center', cursor: 'pointer', color: '#94a3b8', transition: 'color 0.15s' }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#2563eb'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
                title="설명 보기"
              >
                <HelpCircle size={16} />
              </button>
            </h2>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'center' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #cbd5e1', color: '#334155' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 800 }}>구분 (부서)</th>
                    <th style={{ padding: '12px 14px', fontWeight: 800, background: '#f1f5f9' }}>전도재적</th>
                    {filteredWeeks.map(w => (
                      <th key={w} colSpan={mainItems.length} style={{ padding: '10px', borderLeft: '1px solid #e2e8f0', fontWeight: 800 }}>
                        {w}
                      </th>
                    ))}
                    <th colSpan={mainItems.length} style={{ padding: '10px', borderLeft: '2px solid #cbd5e1', background: '#eff6ff', color: '#1e40af', fontWeight: 800 }}>
                      합계
                    </th>
                  </tr>
                  <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', fontSize: '0.78rem', color: '#475569' }}>
                    <th></th>
                    <th></th>
                    {filteredWeeks.map(w => (
                      <React.Fragment key={w}>
                        {mainItems.map((item, idx) => (
                          <th key={idx} style={{ padding: '6px', borderLeft: idx === 0 ? '1px solid #e2e8f0' : undefined, color: item.color }}>
                            {item.label}
                          </th>
                        ))}
                      </React.Fragment>
                    ))}
                    {mainItems.map((item, idx) => (
                      <th key={idx} style={{ padding: '6px', borderLeft: idx === 0 ? '2px solid #cbd5e1' : undefined, background: '#dbeafe', color: '#1e40af' }}>
                        {item.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DEPARTMENTS.map(dept => {
                    const sums: Record<string, number> = {};
                    mainItems.forEach(item => {
                      sums[item.key] = 0;
                    });
                    return (
                      <tr key={dept} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: '#0f172a' }}>{dept}</td>
                        {/* 전도재적 = 전년도 12월 말 값(고정) — 선택한 주차와 무관하게 항상 같은 값. */}
                        <td style={{ padding: '12px 14px', fontWeight: 700, background: '#f8fafc', color: '#475569' }}>{membershipRegMap['1월']?.[dept] || 0}명</td>
                        {filteredWeeks.map(w => {
                          const d = getWeeklyData(w, dept);
                          return (
                            <React.Fragment key={w}>
                              {mainItems.map((item, idx) => {
                                const val = d[item.key] || 0;
                                sums[item.key] += val;
                                return (
                                  <td key={idx} style={{ padding: '10px 6px', borderLeft: idx === 0 ? '1px solid #e2e8f0' : undefined, fontWeight: 700, color: item.color }}>
                                    {val}
                                  </td>
                                );
                              })}
                            </React.Fragment>
                          );
                        })}
                        {mainItems.map((item, idx) => (
                          <td key={idx} style={{ padding: '10px 6px', borderLeft: idx === 0 ? '2px solid #cbd5e1' : undefined, background: '#eff6ff', fontWeight: 800, color: '#1e40af' }}>
                            {sums[item.key]}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                  {/* Totals Row */}
                  <tr style={{ background: '#f8fafc', borderTop: '2px solid #cbd5e1', fontWeight: 900, color: '#0f172a' }}>
                    <td style={{ padding: '14px 16px', textAlign: 'left' }}>합계</td>
                    <td style={{ padding: '14px' }}>
                      {DEPARTMENTS.reduce((acc, dept) => acc + (membershipRegMap['1월']?.[dept] || 0), 0)}명
                    </td>
                    {filteredWeeks.map(w => {
                      return (
                        <React.Fragment key={w}>
                          {mainItems.map((item, idx) => {
                            const totVal = DEPARTMENTS.reduce((acc, dept) => acc + (getWeeklyData(w, dept)[item.key] || 0), 0);
                            return (
                              <td key={idx} style={{ padding: '12px 6px', borderLeft: idx === 0 ? '1px solid #e2e8f0' : undefined, color: item.color }}>
                                {totVal}
                              </td>
                            );
                          })}
                        </React.Fragment>
                      );
                    })}
                    {mainItems.map((item, idx) => {
                      const grandTotVal = DEPARTMENTS.reduce((acc, dept) => acc + filteredWeeks.reduce((wAcc, w) => wAcc + (getWeeklyData(w, dept)[item.key] || 0), 0), 0);
                      return (
                        <td key={idx} style={{ padding: '12px 6px', borderLeft: idx === 0 ? '2px solid #cbd5e1' : undefined, background: '#dbeafe', color: '#1e40af' }}>
                          {grandTotVal}
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Detailed analysis tables rendered dynamically based on activeItems groups */}
          {(() => {
            const detailGroups: { groupName: string; groupDesc: string; items: ConfigItem[] }[] = [];
            activeItems.forEach(item => {
              if (!item.groupName) return;
              let group = detailGroups.find(g => g.groupName === item.groupName);
              if (!group) {
                group = { groupName: item.groupName, groupDesc: item.groupDesc || '', items: [] };
                detailGroups.push(group);
              }
              group.items.push(item);
            });

            return detailGroups.map((group, idx) => {
              const tableNum = idx + 2;
              return renderDetailAnalysisTable(
                `(${tableNum}) ${group.groupName}`,
                group.groupDesc,
                group.items,
                filteredWeeks,
                getWeeklyData,
                openHelpModal,
                membershipRegMap['1월'] || {}
              );
            });
          })()}


        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: 주간보고 입력 (Aggregation & Input)                             */}
      {/* ========================================================================= */}
      {activeTab === 'aggregate' && (() => {
        const config = getDynamicWeekConfig(selectedYear);
        const REAL_CURRENT_WEEK = config.currentWeekKey;
        const isEditable = (selectedWeekAgg === REAL_CURRENT_WEEK) || hasEditPermission;
        const ALL_WEEKS_LIST = config.allowedWeeks.map(w => w.weekKey);
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

                        const dynamicDataMap: Record<string, number> = {};
                        activeItems.forEach(item => {
                          dynamicDataMap[item.key] = data[item.key] || 0;
                        });

                        return {
                          churchName: selectedChurch,
                          yearStr: selectedYear,
                          weekKey: selectedWeekAgg,
                          department: dept,
                          regCount: data.reg,
                          findCount: data.find || 0,
                          findDropCount: data.findDrop || 0,
                          gospelCount: data.gospel || 0,
                          gospelDropCount: data.gospelDrop || 0,
                          admitCount: data.admit || 0,
                          admitDropCount: data.admitDrop || 0,
                          dynamicData: JSON.stringify(dynamicDataMap),
                          updatedBy: localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!).username : 'admin'
                        };
                      });
                      await api.post('/evangelism/records', recordsToSave);
                      logService.addAccessLog('💾 주차별 실적 저장 (DB 연동)', `/evangelism/save?church=${encodeURIComponent(selectedChurch)}&week=${selectedWeekAgg}`);
                      alert(`[${selectedChurch} · ${selectedWeekAgg}] 전도 실적이 성공적으로 저장되었습니다!`);
                      fetchDbRecords();
                      checkAccessPermission();
                      window.dispatchEvent(new Event('refreshEditRequests'));
                    } catch (e) {
                      alert('저장 중 오류가 발생했습니다.');
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
                  <CheckCircle2 size={18} /> 저장하기
                </button>
              ) : (
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', color: '#64748b', padding: '10px 18px', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Lock size={16} /> 수정 권한이 잠겨있습니다
                </div>
              )}
            </div>
            <div className="desktop-table-view" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', textAlign: 'center' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #cbd5e1' }}>
                    <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 800, color: '#334155' }}>구분</th>

                    {/* Previous Week Header (Locked + Unlock Request Button) */}
                    <th colSpan={activeItems.length} style={{ padding: '12px 14px', background: hasPrevEditPermission ? '#f0fdf4' : '#f8fafc', borderLeft: '2px solid ' + (hasPrevEditPermission ? '#bbf7d0' : '#e2e8f0'), color: hasPrevEditPermission ? '#166534' : '#475569', fontWeight: 800 }}>
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
                    <th colSpan={activeItems.length} style={{ padding: '12px 14px', background: isEditable ? '#f0fdf4' : '#fef2f2', borderLeft: '2px solid ' + (isEditable ? '#bbf7d0' : '#fecaca'), color: isEditable ? '#166534' : '#991b1b', fontWeight: 800 }}>
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
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #cbd5e1', fontSize: '0.82rem', color: '#475569' }}>
                    <th></th>
                    {/* Previous Week Sub Headers */}
                    {activeItems.map((item, idx) => (
                      <th
                        key={'prev-hdr-' + idx}
                        style={{
                          padding: '8px 10px',
                          borderLeft: idx === 0 ? '2px solid #e2e8f0' : undefined,
                          background: '#f8fafc',
                          color: item.isDrop ? '#dc2626' : item.color,
                          fontWeight: 800
                        }}
                      >
                        {item.label}
                      </th>
                    ))}

                    {/* Current Week Sub Headers */}
                    {activeItems.map((item, idx) => (
                      <th
                        key={'curr-hdr-' + idx}
                        style={{
                          padding: '8px 10px',
                          borderLeft: idx === 0 ? '2px solid ' + (isEditable ? '#bbf7d0' : '#fecaca') : undefined,
                          background: isEditable ? '#f0fdf4' : '#fff5f5',
                          color: item.isDrop ? '#dc2626' : item.color,
                          fontWeight: 800
                        }}
                      >
                        {item.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {DEPARTMENTS.map((dept) => {
                    const curr = currentWeekInputs[dept] || { reg: 20 };
                    const prev = getWeeklyData(prevWeekKey, dept);

                    return (
                      <tr key={dept} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: '#0f172a' }}>{dept}</td>

                        {/* Readonly Previous Week Cells */}
                        {activeItems.map((item, idx) => {
                          const val = prev[item.key] || 0;
                          return (
                            <td
                              key={'prev-cell-' + idx}
                              style={{
                                padding: '10px 12px',
                                borderLeft: idx === 0 ? '2px solid #e2e8f0' : undefined,
                                background: '#fafcff',
                                color: item.isDrop ? '#94a3b8' : '#475569',
                                fontWeight: 700
                              }}
                            >
                              {val}
                            </td>
                          );
                        })}

                        {/* Current Week (Selected Week) Cells - Editable or Readonly depending on isEditable */}
                        {isEditable ? (
                          activeItems.map((item, idx) => {
                            const val = curr[item.key] || 0;
                            return (
                              <td
                                key={'curr-cell-edit-' + idx}
                                style={{
                                  padding: '8px 6px',
                                  borderLeft: idx === 0 ? '2px solid #bbf7d0' : undefined,
                                  background: '#f7fefb'
                                }}
                              >
                                <input
                                  type="number"
                                  min={0}
                                  value={val}
                                  onChange={(e) => handleInputChange(dept, item.key, parseInt(e.target.value) || 0)}
                                  onFocus={(e) => e.target.select()}
                                  style={{
                                    width: '70px',
                                    padding: '6px 8px',
                                    textAlign: 'center',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: '8px',
                                    fontSize: '0.88rem',
                                    fontWeight: 800,
                                    outline: 'none',
                                    color: item.isDrop ? '#dc2626' : item.color
                                  }}
                                />
                              </td>
                            );
                          })
                        ) : (
                          activeItems.map((item, idx) => {
                            const val = curr[item.key] || 0;
                            return (
                              <td
                                key={'curr-cell-readonly-' + idx}
                                style={{
                                  padding: '10px 12px',
                                  borderLeft: idx === 0 ? '2px solid #cbd5e1' : undefined,
                                  background: '#fafafa',
                                  color: item.isDrop ? '#dc2626' : item.color,
                                  fontWeight: 700
                                }}
                              >
                                {val}
                              </td>
                            );
                          })
                        )}
                      </tr>
                    );
                  })}

                  {/* Total Row */}
                  <tr style={{ background: '#f8fafc', borderTop: '2px solid #cbd5e1', fontWeight: 900, color: '#0f172a' }}>
                    <td style={{ padding: '14px 16px', textAlign: 'left' }}>합계</td>

                    {/* Previous Totals */}
                    {activeItems.map((item, idx) => {
                      const totalVal = DEPARTMENTS.reduce((sum, d) => sum + (getWeeklyData(prevWeekKey, d)[item.key] || 0), 0);
                      return (
                        <td
                          key={'prev-tot-' + idx}
                          style={{
                            padding: '14px 12px',
                            borderLeft: idx === 0 ? '2px solid #e2e8f0' : undefined,
                            background: '#f1f5f9',
                            color: '#334155',
                            fontWeight: 800
                          }}
                        >
                          {totalVal}
                        </td>
                      );
                    })}

                    {/* Selected Week Totals */}
                    {activeItems.map((item, idx) => {
                      const totalVal = DEPARTMENTS.reduce((sum, d) => sum + (currentWeekInputs[d]?.[item.key] || 0), 0);
                      return (
                        <td
                          key={'curr-tot-' + idx}
                          style={{
                            padding: '14px 12px',
                            borderLeft: idx === 0 ? '2px solid ' + (isEditable ? '#bbf7d0' : '#fecaca') : undefined,
                            background: '#eefdf6',
                            color: item.isDrop ? '#dc2626' : item.color,
                            fontWeight: 900
                          }}
                        >
                          {totalVal}
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Table Container - Mobile stacked view */}
            <div className="mobile-table-view">
              {/* Table 1: Previous Week (전주 실적) */}
              <div style={{ marginBottom: '24px', background: '#ffffff', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 14px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                  <h3 style={{ fontSize: '0.92rem', fontWeight: 800, color: hasPrevEditPermission ? '#166534' : '#991b1b', margin: 0 }}>
                    이전 주차 ({prevWeekKey}) 실적 {hasPrevEditPermission ? '🔓' : '🔒'}
                  </h3>
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
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        boxShadow: '0 2px 6px rgba(220, 38, 38, 0.12)'
                      }}
                    >
                      <Lock size={11} /> 수정 허용 요청
                    </button>
                  )}
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', textAlign: 'center', minWidth: '320px' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #cbd5e1' }}>
                        <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 800 }}>구분</th>
                        {activeItems.map((item, idx) => (
                          <th key={idx} style={{ padding: '8px 10px', color: item.isDrop ? '#dc2626' : item.color, fontWeight: 800 }}>
                            {item.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {DEPARTMENTS.map((dept) => {
                        const prev = getWeeklyData(prevWeekKey, dept);
                        return (
                          <tr key={dept} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700 }}>{dept}</td>
                            {activeItems.map((item, idx) => (
                              <td key={idx} style={{ padding: '10px 8px', color: item.isDrop ? '#94a3b8' : '#475569', fontWeight: 600 }}>
                                {prev[item.key] || 0}
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                      <tr style={{ background: '#f8fafc', borderTop: '2px solid #cbd5e1', fontWeight: 900, color: '#0f172a' }}>
                        <td style={{ padding: '12px 14px', textAlign: 'left' }}>합계</td>
                        {activeItems.map((item, idx) => {
                          const totalVal = DEPARTMENTS.reduce((sum, d) => sum + (getWeeklyData(prevWeekKey, d)[item.key] || 0), 0);
                          return (
                            <td key={idx} style={{ padding: '12px 8px', color: '#334155', fontWeight: 800 }}>
                              {totalVal}
                            </td>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Table 2: Active/Selected Week (이번주/선택주 실적) */}
              <div style={{ background: '#ffffff', padding: '20px', borderRadius: '16px', border: '1px solid ' + (isEditable ? '#bbf7d0' : '#fecaca'), boxShadow: '0 4px 14px rgba(0,0,0,0.03)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                  <h3 style={{ fontSize: '0.92rem', fontWeight: 800, color: isEditable ? '#166534' : '#991b1b', margin: 0 }}>
                    이번 주차 ({selectedWeekAgg}) 실적 {isEditable ? '✏️' : '🔒'}
                  </h3>
                  {!isEditable && (
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
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        boxShadow: '0 2px 6px rgba(220, 38, 38, 0.12)'
                      }}
                    >
                      <Lock size={11} /> 수정 허용 요청
                    </button>
                  )}
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', textAlign: 'center', minWidth: '320px' }}>
                    <thead>
                      <tr style={{ background: isEditable ? '#f0fdf4' : '#fef2f2', borderBottom: '2px solid ' + (isEditable ? '#bbf7d0' : '#fecaca') }}>
                        <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 800 }}>구분</th>
                        {activeItems.map((item, idx) => (
                          <th key={idx} style={{ padding: '8px 10px', color: item.isDrop ? '#dc2626' : item.color, fontWeight: 800 }}>
                            {item.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {DEPARTMENTS.map((dept) => {
                        const curr = currentWeekInputs[dept] || { reg: 20 };
                        return (
                          <tr key={dept} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700 }}>{dept}</td>
                            {isEditable ? (
                              activeItems.map((item, idx) => {
                                const val = curr[item.key] || 0;
                                return (
                                  <td key={idx} style={{ padding: '6px 4px' }}>
                                    <input
                                      type="number"
                                      min={0}
                                      value={val}
                                      onChange={(e) => handleInputChange(dept, item.key, parseInt(e.target.value) || 0)}
                                      onFocus={(e) => e.target.select()}
                                      style={{ width: '64px', padding: '6px 8px', textAlign: 'center', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.88rem', fontWeight: 800, outline: 'none', color: item.isDrop ? '#dc2626' : item.color }}
                                    />
                                  </td>
                                );
                              })
                            ) : (
                              activeItems.map((item, idx) => {
                                const val = curr[item.key] || 0;
                                return (
                                  <td key={idx} style={{ padding: '10px 8px', color: item.isDrop ? '#dc2626' : item.color, fontWeight: 700 }}>
                                    {val}
                                  </td>
                                );
                              })
                            )}
                          </tr>
                        );
                      })}
                      <tr style={{ background: '#f8fafc', borderTop: '2px solid #cbd5e1', fontWeight: 900 }}>
                        <td style={{ padding: '12px 14px', textAlign: 'left' }}>합계</td>
                        {activeItems.map((item, idx) => {
                          const totalVal = DEPARTMENTS.reduce((sum, d) => sum + (currentWeekInputs[d]?.[item.key] || 0), 0);
                          return (
                            <td key={idx} style={{ padding: '12px 8px', color: item.isDrop ? '#dc2626' : item.color, fontWeight: 900 }}>
                              {totalVal}
                            </td>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
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

      {/* ========================================================================= */}
      {/* Help Modal Popup Window                                                   */}
      {/* ========================================================================= */}
      {activeHelpKey && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.5)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '20px'
        }} onClick={() => setActiveHelpKey(null)}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '420px',
            padding: '24px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            animation: 'fadeIn 0.15s ease',
            border: '1px solid #e2e8f0'
          }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1f2a44', marginTop: 0, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              ℹ️ {activeHelpTitle}
            </h3>
            <p style={{ fontSize: '0.9rem', color: '#475569', lineHeight: 1.55, margin: '0 0 20px 0', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {helpTexts[activeHelpKey] || '설명이 등록되지 않았습니다.'}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setActiveHelpKey(null)}
                style={{
                  background: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(37,99,235,0.2)'
                }}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Step Edit Modal */}
      {isStepEditModalOpen && editingStepItem && (
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
          zIndex: 99999,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '480px',
            padding: '28px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
            border: '1px solid #cbd5e1'
          }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: '0 0 16px 0' }}>
              ⚙️ {getStepModalTitle(editingStepItem)} 기준 및 정보 수정
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#334155', marginBottom: '6px' }}>
                  단계 명칭 (풀네임)
                </label>
                <input
                  type="text"
                  value={editStepFullName}
                  onChange={(e) => setEditStepFullName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                    background: (editingStepItem.key === 'find' || editingStepItem.key === 'gospel' || editingStepItem.key === 'admit') ? '#f1f5f9' : '#ffffff'
                  }}
                  disabled={editingStepItem.key === 'find' || editingStepItem.key === 'gospel' || editingStepItem.key === 'admit'}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#334155', marginBottom: '6px' }}>
                  단계 약어 (테이블 표시용)
                </label>
                <input
                  type="text"
                  value={editStepLabel}
                  onChange={(e) => setEditStepLabel(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.9rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                    background: (editingStepItem.key === 'find' || editingStepItem.key === 'gospel' || editingStepItem.key === 'admit') ? '#f1f5f9' : '#ffffff'
                  }}
                  disabled={editingStepItem.key === 'find' || editingStepItem.key === 'gospel' || editingStepItem.key === 'admit'}
                />
                {(editingStepItem.key === 'find' || editingStepItem.key === 'gospel' || editingStepItem.key === 'admit') && (
                  <span style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '4px', display: 'block', fontWeight: 700 }}>
                    ※ 필수 단계(찾기, 복음방, 개강)의 명칭 및 약어는 시스템 연동을 위해 변경할 수 없습니다.
                  </span>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#334155', marginBottom: '6px' }}>
                  상세 기준 및 설명
                </label>
                <textarea
                  rows={4}
                  value={editStepDesc}
                  onChange={(e) => setEditStepDesc(e.target.value)}
                  placeholder="예: 1단계 찾기 완료 기준에 대해 한 줄씩 적어주세요."
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
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => {
                  setIsStepEditModalOpen(false);
                  setEditingStepItem(null);
                }}
                style={{
                  padding: '8px 18px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  color: '#475569',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                취소
              </button>
              <button
                onClick={handleApplyStepEdit}
                style={{
                  padding: '8px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#2563eb',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 10px rgba(37, 99, 235, 0.2)'
                }}
              >
                적용
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step View Modal */}
      {isStepViewModalOpen && viewStepItem && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.5)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '20px'
        }} onClick={() => {
          setIsStepViewModalOpen(false);
          setViewStepItem(null);
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '440px',
            padding: '24px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            border: '1px solid #e2e8f0'
          }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1f2a44', marginTop: 0, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              ℹ️ {getStepModalTitle(viewStepItem)} 기준
            </h3>
            <p style={{ fontSize: '0.9rem', color: '#475569', lineHeight: 1.6, margin: '0 0 20px 0', whiteSpace: 'pre-wrap' }}>
              {viewStepItem.groupDesc || '상세 기준이 아직 등록되지 않았습니다.'}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setIsStepViewModalOpen(false);
                  setViewStepItem(null);
                }}
                style={{
                  background: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '8px 18px',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(37,99,235,0.2)'
                }}
              >
                닫기
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
  items: ConfigItem[],
  weeks: string[],
  getDataFn: (w: string, dept: string) => DeptData,
  onHelpClick: ((key: string, title: string, customText?: string) => void) | undefined,
  evangRegByDept: Record<string, number>
) {
  const hasHelp = !!desc && !!onHelpClick;

  return (
    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', marginBottom: '28px', boxShadow: '0 4px 14px rgba(0,0,0,0.03)' }}>
      <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span>{title}</span>
        {hasHelp && (
          <button 
            onClick={() => onHelpClick(title, `${title} 안내`, desc)}
            style={{ background: 'none', border: 'none', padding: 0, display: 'inline-flex', alignItems: 'center', cursor: 'pointer', color: '#94a3b8', transition: 'color 0.15s' }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#2563eb'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
            title="설명 보기"
          >
            <HelpCircle size={15} />
          </button>
        )}
      </h2>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'center' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #cbd5e1', color: '#334155' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 800 }}>구분 (부서)</th>
              <th style={{ padding: '12px 14px', fontWeight: 800, background: '#f1f5f9' }}>전도재적</th>
              {weeks.map(w => (
                <th key={w} colSpan={items.length} style={{ padding: '10px', borderLeft: '1px solid #e2e8f0', fontWeight: 800 }}>
                  {w}
                </th>
              ))}
              <th colSpan={items.length} style={{ padding: '10px', borderLeft: '2px solid #cbd5e1', background: '#eff6ff', color: '#1e40af', fontWeight: 800 }}>
                합계
              </th>
            </tr>
            <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1', fontSize: '0.78rem', color: '#475569' }}>
              <th></th>
              <th></th>
              {weeks.map(w => (
                <React.Fragment key={w}>
                  {items.map((item, idx) => (
                    <th key={idx} style={{ padding: '6px', borderLeft: idx === 0 ? '1px solid #e2e8f0' : undefined, color: item.color }}>
                      {item.label}
                    </th>
                  ))}
                </React.Fragment>
              ))}
              {items.map((item, idx) => (
                <th key={idx} style={{ padding: '6px', borderLeft: idx === 0 ? '2px solid #cbd5e1' : undefined, background: '#dbeafe', color: item.isDrop ? '#dc2626' : '#1e40af' }}>
                  {item.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DEPARTMENTS.map(dept => {
              const sums: Record<string, number> = {};
              items.forEach(item => {
                sums[item.key] = 0;
              });
              return (
                <tr key={dept} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: '#0f172a' }}>{dept}</td>
                  {/* 전도재적 = 전년도 12월 말 값(고정) */}
                  <td style={{ padding: '12px 14px', fontWeight: 700, background: '#f8fafc', color: '#475569' }}>{evangRegByDept[dept] || 0}명</td>
                  {weeks.map(w => {
                    const d = getDataFn(w, dept);
                    return (
                      <React.Fragment key={w}>
                        {items.map((item, idx) => {
                          const val = d[item.key] || 0;
                          sums[item.key] += val;
                          return (
                            <td key={idx} style={{ padding: '10px 6px', borderLeft: idx === 0 ? '1px solid #e2e8f0' : undefined, fontWeight: 700, color: item.color }}>
                              {val}
                            </td>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                  {items.map((item, idx) => (
                    <td key={idx} style={{ padding: '10px 6px', borderLeft: idx === 0 ? '2px solid #cbd5e1' : undefined, background: '#eff6ff', fontWeight: 800, color: item.isDrop ? '#dc2626' : '#1e40af' }}>
                      {sums[item.key]}
                    </td>
                  ))}
                </tr>
              );
            })}
            {/* Totals Row */}
            <tr style={{ background: '#f8fafc', borderTop: '2px solid #cbd5e1', fontWeight: 900, color: '#0f172a' }}>
              <td style={{ padding: '14px 16px', textAlign: 'left' }}>합계</td>
              <td style={{ padding: '14px' }}>{DEPARTMENTS.reduce((acc, dept) => acc + (evangRegByDept[dept] || 0), 0)}명</td>
              {weeks.map(w => {
                return (
                  <React.Fragment key={w}>
                    {items.map((item, idx) => {
                      const totVal = DEPARTMENTS.reduce((acc, dept) => acc + (getDataFn(w, dept)[item.key] || 0), 0);
                      return (
                        <td key={idx} style={{ padding: '12px 6px', borderLeft: idx === 0 ? '1px solid #e2e8f0' : undefined, color: item.color }}>
                          {totVal}
                        </td>
                      );
                    })}
                  </React.Fragment>
                );
              })}
              {items.map((item, idx) => {
                const grandTotVal = DEPARTMENTS.reduce((acc, dept) => acc + weeks.reduce((wAcc, w) => wAcc + (getDataFn(w, dept)[item.key] || 0), 0), 0);
                return (
                  <td key={idx} style={{ padding: '12px 6px', borderLeft: idx === 0 ? '2px solid #cbd5e1' : undefined, background: '#dbeafe', color: item.isDrop ? '#dc2626' : '#1e40af' }}>
                    {grandTotVal}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
