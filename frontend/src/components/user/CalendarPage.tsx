import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  User, 
  Users, 
  Trash2, 
  Edit3, 
  X, 
  Info,
  Check,
  AlertTriangle
} from 'lucide-react';
import api from '../../services/api';

interface UserSimple {
  username: string;
  name: string;
}

interface CalendarEvent {
  id?: number;
  title: string;
  description: string;
  startDate: string; // ISO String or ZonedDateTime
  endDate: string; // ISO String or ZonedDateTime
  creatorUsername?: string;
  creatorName?: string;
  referencedUsernames: string; // Comma separated
  calendars: string; // Comma separated, e.g. "MAIN", "BUSINESS"
  createdAt?: string;
  updatedAt?: string;
}

interface CalendarPageProps {
  mode: 'MAIN' | 'BUSINESS';
}

export const CalendarPage: React.FC<CalendarPageProps> = ({ mode }) => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [users, setUsers] = useState<UserSimple[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(false);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // Form States
  const [formId, setFormId] = useState<number | undefined>(undefined);
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formStartDate, setFormStartDate] = useState('');
  const [formStartTime, setFormStartTime] = useState('09:00');
  const [formEndDate, setFormEndDate] = useState('');
  const [formEndTime, setFormEndTime] = useState('10:00');
  const [formCalendars, setFormCalendars] = useState<string[]>(['MAIN']);
  const [formRefs, setFormRefs] = useState<string[]>([]);
  const [searchUserKeyword, setSearchUserKeyword] = useState('');

  // Fetch Current User
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        setCurrentUser(JSON.parse(userStr));
      } catch (e) {
        console.error('Failed to parse user info', e);
      }
    }
  }, []);

  // Fetch Events and Simple User List
  const fetchEvents = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/calendar/events?type=${mode}`);
      const list = res.data || [];
      setEvents(list);
    } catch (e) {
      console.error('Failed to fetch calendar events', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users/list-simple');
      setUsers(res.data || []);
    } catch (e) {
      console.error('Failed to fetch user list', e);
    }
  };

  useEffect(() => {
    fetchEvents();
    fetchUsers();
  }, [mode]);

  // Set default calendar selections based on mode
  useEffect(() => {
    if (mode === 'BUSINESS') {
      // Financial Calendar default saves to both MAIN and BUSINESS automatically
      setFormCalendars(['MAIN', 'BUSINESS']);
    } else {
      setFormCalendars(['MAIN']);
    }
  }, [mode, isModalOpen]);

  // Calendar logic helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month, 1).getDay(); // 0 (Sun) to 6 (Sat)
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const setToday = () => {
    setCurrentDate(new Date());
  };

  // Generate calendar grid
  const daysInMonth = getDaysInMonth(currentDate);
  const firstDayIndex = getFirstDayOfMonth(currentDate);
  
  const prevMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
  const daysInPrevMonth = getDaysInMonth(prevMonthDate);

  const gridCells: { date: Date; isCurrentMonth: boolean }[] = [];

  // Trailing days from previous month
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    gridCells.push({
      date: new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, daysInPrevMonth - i),
      isCurrentMonth: false
    });
  }

  // Days of current month
  for (let i = 1; i <= daysInMonth; i++) {
    gridCells.push({
      date: new Date(currentDate.getFullYear(), currentDate.getMonth(), i),
      isCurrentMonth: true
    });
  }

  // Leading days of next month to complete 6x7 grid (42 cells)
  const remainingCells = 42 - gridCells.length;
  for (let i = 1; i <= remainingCells; i++) {
    gridCells.push({
      date: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, i),
      isCurrentMonth: false
    });
  }

  // Format date to local date string (YYYY-MM-DD)
  const formatDateString = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // Check if date is today
  const isToday = (d: Date) => {
    const today = new Date();
    return d.getFullYear() === today.getFullYear() &&
           d.getMonth() === today.getMonth() &&
           d.getDate() === today.getDate();
  };

  // Filter events for a specific cell date
  const getEventsForDate = (date: Date) => {
    const dateStr = formatDateString(date);
    return events.filter(e => {
      const start = e.startDate.split('T')[0];
      const end = e.endDate.split('T')[0];
      return dateStr >= start && dateStr <= end;
    });
  };

  // Handle Event Creation/Edit Submit
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      alert('일정 제목을 입력해 주세요.');
      return;
    }

    // Convert local start/end inputs to ISO String
    const startIso = `${formStartDate}T${formStartTime}:00+09:00`;
    const endIso = `${formEndDate}T${formEndTime}:00+09:00`;

    const payload: CalendarEvent = {
      title: formTitle,
      description: formDesc,
      startDate: startIso,
      endDate: endIso,
      calendars: formCalendars.join(','),
      referencedUsernames: formRefs.join(','),
    };

    try {
      if (formId) {
        // Edit Mode
        await api.put(`/calendar/events/${formId}`, payload);
        alert('일정이 성공적으로 수정되었습니다.');
      } else {
        // Create Mode
        await api.post('/calendar/events', payload);
        alert('일정이 성공적으로 등록되었습니다.');
      }
      setIsModalOpen(false);
      fetchEvents();
      resetForm();
    } catch (err: any) {
      console.error('Failed to save calendar event', err);
      alert(err.response?.data?.error || '일정 저장 중 오류가 발생했습니다.');
    }
  };

  const handleOpenCreateModal = (date?: Date) => {
    resetForm();
    const targetDate = date ? formatDateString(date) : formatDateString(new Date());
    setFormStartDate(targetDate);
    setFormEndDate(targetDate);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (event: CalendarEvent) => {
    setFormId(event.id);
    setFormTitle(event.title);
    setFormDesc(event.description);
    
    // Parse Dates
    if (event.startDate) {
      const startParts = event.startDate.split('T');
      setFormStartDate(startParts[0]);
      if (startParts[1]) setFormStartTime(startParts[1].substring(0, 5));
    }
    if (event.endDate) {
      const endParts = event.endDate.split('T');
      setFormEndDate(endParts[0]);
      if (endParts[1]) setFormEndTime(endParts[1].substring(0, 5));
    }

    setFormCalendars(event.calendars ? event.calendars.split(',') : []);
    setFormRefs(event.referencedUsernames ? event.referencedUsernames.split(',') : []);
    
    setIsDetailOpen(false);
    setIsModalOpen(true);
  };

  const handleDeleteEvent = async (id: number) => {
    if (!window.confirm('정말 이 일정을 삭제하시겠습니까?')) return;
    try {
      await api.delete(`/calendar/events/${id}`);
      alert('일정이 삭제되었습니다.');
      setIsDetailOpen(false);
      setSelectedEvent(null);
      fetchEvents();
    } catch (err: any) {
      console.error('Failed to delete event', err);
      alert(err.response?.data?.error || '일정 삭제 중 권한이 없거나 오류가 발생했습니다.');
    }
  };

  const resetForm = () => {
    setFormId(undefined);
    setFormTitle('');
    setFormDesc('');
    setFormStartDate(formatDateString(new Date()));
    setFormStartTime('09:00');
    setFormEndDate(formatDateString(new Date()));
    setFormEndTime('10:00');
    if (mode === 'BUSINESS') {
      setFormCalendars(['MAIN', 'BUSINESS']);
    } else {
      setFormCalendars(['MAIN']);
    }
    setFormRefs([]);
    setSearchUserKeyword('');
  };

  // Toggle calendar target checkbox
  const handleCalendarCheckboxChange = (cal: string) => {
    if (mode === 'BUSINESS') {
      // Enforce: 재정 캘린더에서는 무조건 둘 다 체크 (메인캘린더에도 자동 추가)
      return;
    }
    if (formCalendars.includes(cal)) {
      if (formCalendars.length > 1) {
        setFormCalendars(formCalendars.filter(c => c !== cal));
      }
    } else {
      setFormCalendars([...formCalendars, cal]);
    }
  };

  // Toggle referenced user selection
  const handleToggleRefUser = (username: string) => {
    if (formRefs.includes(username)) {
      setFormRefs(formRefs.filter(u => u !== username));
    } else {
      setFormRefs([...formRefs, username]);
    }
  };

  // Filter user list for reference selector
  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchUserKeyword.toLowerCase()) || 
    u.username.toLowerCase().includes(searchUserKeyword.toLowerCase())
  );

  return (
    <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid var(--line)', padding: '24px', minHeight: '80vh', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
      {/* 캘린더 상단 헤더 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: mode === 'BUSINESS' ? 'linear-gradient(135deg, #e6b455, #d9a13a)' : 'linear-gradient(135deg, #4b8bff, #2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.15)' }}>
            <CalendarIcon size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 900, color: 'var(--navy)', letterSpacing: '-0.5px' }}>
              {mode === 'BUSINESS' ? '재정 업무 캘린더' : '메인 통합 캘린더'}
            </h2>
            <p style={{ fontSize: '12.5px', color: 'var(--muted)', fontWeight: 500, marginTop: '1px' }}>
              {mode === 'BUSINESS' ? '기안 및 회의 등 재정 관련 중요 업무 일정 관리' : '해외선교부 소속 성도 전체 통합 일정 관리'}
            </p>
          </div>
        </div>

        {/* 월 이동 및 오늘 버튼 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '10px', padding: '3px' }}>
            <button 
              onClick={prevMonth}
              style={{ background: 'transparent', border: 'none', padding: '6px 10px', borderRadius: '8px', cursor: 'pointer', color: '#475569', transition: 'all 0.15s' }}
              className="hover-bg-white"
            >
              <ChevronLeft size={16} />
            </button>
            <span style={{ display: 'flex', alignItems: 'center', padding: '0 12px', fontSize: '14.5px', fontWeight: 800, color: 'var(--navy)', minWidth: '110px', justifyContent: 'center' }}>
              {currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월
            </span>
            <button 
              onClick={nextMonth}
              style={{ background: 'transparent', border: 'none', padding: '6px 10px', borderRadius: '8px', cursor: 'pointer', color: '#475569', transition: 'all 0.15s' }}
              className="hover-bg-white"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          
          <button 
            onClick={setToday}
            style={{ background: '#f1f5f9', border: 'none', borderRadius: '10px', padding: '8px 16px', fontSize: '13.5px', fontWeight: 700, color: '#475569', cursor: 'pointer', transition: 'all 0.15s' }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#e2e8f0'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#f1f5f9'}
          >
            오늘
          </button>

          <button 
            onClick={() => handleFormSubmit} // Dummy/Not used directly, triggered via button below
            style={{ display: 'none' }}
          />
          <button 
            onClick={() => handleOpenCreateModal()}
            style={{ background: mode === 'BUSINESS' ? 'linear-gradient(135deg, #e6b455, #d9a13a)' : 'linear-gradient(135deg, #4b8bff, #2563eb)', border: 'none', borderRadius: '10px', padding: '8px 16px', fontSize: '13.5px', fontWeight: 700, color: '#ffffff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 12px rgba(37,99,235,0.15)' }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            <Plus size={16} /> 일정 추가
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '24px' }}>
        {/* 캘린더 좌측 패널 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* 미니 캘린더 안내 영역 */}
          <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569', marginBottom: '8px' }}>
              <Info size={15} style={{ color: mode === 'BUSINESS' ? '#d9a13a' : '#2563eb' }} />
              <span style={{ fontSize: '13px', fontWeight: 800 }}>안내 및 도움말</span>
            </div>
            <p style={{ fontSize: '12px', color: '#64748b', lineHeight: '1.6', wordBreak: 'keep-all' }}>
              {mode === 'BUSINESS' ? (
                '재정 캘린더에서 작성한 정보는 자동으로 메인 캘린더에 연동됩니다. 단, 참조자로 선택된 계정의 사용자만 열람 가능합니다.'
              ) : (
                '메인 통합 캘린더입니다. 일정을 등록할 때 대상 캘린더(메인/재정 등)를 개별 선택하여 등록할 수 있습니다.'
              )}
            </p>
          </div>

          {/* 범례 표시 */}
          <div style={{ padding: '16px', background: '#ffffff', borderRadius: '12px', border: '1px solid var(--line)' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 800, color: 'var(--navy)', marginBottom: '12px' }}>소속 캘린더 분류</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#475569', fontWeight: 600 }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '4px', background: '#3b82f6' }}></span>
                <span>메인 업무 일정 (MAIN)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: '#475569', fontWeight: 600 }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '4px', background: '#d9a13a' }}></span>
                <span>재정 캘린더 일정 (BUSINESS)</span>
              </div>
            </div>
          </div>

          {/* 다가오는 일정 */}
          <div style={{ padding: '16px', background: '#ffffff', borderRadius: '12px', border: '1px solid var(--line)', flex: 1, minHeight: '240px' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 800, color: 'var(--navy)', marginBottom: '12px' }}>이번 달 주요 일정</h4>
            {loading ? (
              <p style={{ fontSize: '12.5px', color: 'var(--muted)', textAlign: 'center', marginTop: '20px' }}>불러오는 중...</p>
            ) : events.length === 0 ? (
              <p style={{ fontSize: '12.5px', color: 'var(--muted)', textAlign: 'center', marginTop: '20px' }}>등록된 일정이 없습니다.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '340px', overflowY: 'auto' }}>
                {events.slice(0, 10).map((ev, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => { setSelectedEvent(ev); setIsDetailOpen(true); }}
                    style={{ padding: '10px', borderRadius: '8px', background: '#f8fafc', borderLeft: `3px solid ${ev.calendars.includes('BUSINESS') ? '#d9a13a' : '#3b82f6'}`, cursor: 'pointer', transition: 'transform 0.15s' }}
                    className="hover-translate"
                  >
                    <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--navy)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {ev.title}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                      <Clock size={11} />
                      <span>{ev.startDate.split('T')[0]}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 캘린더 월간 그리드 영역 */}
        <div style={{ border: '1px solid var(--line)', borderRadius: '12px', overflow: 'hidden' }}>
          {/* 요일 헤더 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: '#f8fafc', borderBottom: '1px solid var(--line)', textAlign: 'center', fontWeight: 800, fontSize: '13px', color: '#475569' }}>
            {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
              <div key={i} style={{ padding: '12px 0', borderRight: i < 6 ? '1px solid var(--line)' : 'none', color: i === 0 ? '#ef4444' : i === 6 ? '#2563eb' : '#475569' }}>
                {d}
              </div>
            ))}
          </div>

          {/* 날짜 셀들 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridAutoRows: 'minmax(110px, 1fr)', background: '#f1f5f9', gap: '1px' }}>
            {gridCells.map((cell, idx) => {
              const dateEvents = getEventsForDate(cell.date);
              const isTodayCell = isToday(cell.date);
              return (
                <div 
                  key={idx} 
                  onClick={() => handleOpenCreateModal(cell.date)}
                  style={{
                    background: cell.isCurrentMonth ? '#ffffff' : '#f8fafc',
                    padding: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                    position: 'relative'
                  }}
                  className="hover-bg-panel2"
                >
                  {/* 날짜 표시 */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span 
                      style={{
                        fontSize: '13px',
                        fontWeight: 800,
                        color: isTodayCell ? '#ffffff' : (!cell.isCurrentMonth ? '#cbd5e1' : cell.date.getDay() === 0 ? '#ef4444' : cell.date.getDay() === 6 ? '#2563eb' : 'var(--navy)'),
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: isTodayCell ? '#2563eb' : 'transparent'
                      }}
                    >
                      {cell.date.getDate()}
                    </span>
                  </div>

                  {/* 해당 날짜 일정 리스트 */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1, overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
                    {dateEvents.map((ev, eIdx) => {
                      const isBusiness = ev.calendars.includes('BUSINESS');
                      const bg = isBusiness ? '#fef3c7' : '#dbeafe';
                      const border = isBusiness ? '3px solid #d9a13a' : '3px solid #3b82f6';
                      const color = isBusiness ? '#92400e' : '#1e40af';
                      return (
                        <div 
                          key={eIdx}
                          onClick={() => { setSelectedEvent(ev); setIsDetailOpen(true); }}
                          style={{
                            background: bg,
                            borderLeft: border,
                            color: color,
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '4px 6px',
                            borderRadius: '4px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            cursor: 'pointer',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                          }}
                          title={ev.title}
                        >
                          {ev.title}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 일정 상세 보기 모달 */}
      {isDetailOpen && selectedEvent && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', width: '90%', maxWidth: '480px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)', border: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid var(--line)', background: '#f8fafc' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '11.5px', fontWeight: 800, padding: '2px 8px', borderRadius: '6px', background: selectedEvent.calendars.includes('BUSINESS') ? '#fef3c7' : '#dbeafe', color: selectedEvent.calendars.includes('BUSINESS') ? '#b45309' : '#1d4ed8' }}>
                  {selectedEvent.calendars.includes('BUSINESS') ? '재정 일정' : '일반 일정'}
                </span>
              </div>
              <button 
                onClick={() => setIsDetailOpen(false)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>
            
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: 900, color: 'var(--navy)', marginBottom: '8px' }}>{selectedEvent.title}</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#64748b' }}>
                  <Clock size={14} />
                  <span>
                    {selectedEvent.startDate.split('T')[0]} {selectedEvent.startDate.split('T')[1]?.substring(0, 5)} ~ 
                    {selectedEvent.endDate.split('T')[0]} {selectedEvent.endDate.split('T')[1]?.substring(0, 5)}
                  </span>
                </div>
              </div>

              {selectedEvent.description && (
                <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', fontSize: '13px', color: '#475569', whiteSpace: 'pre-wrap', lineHeight: '1.6', border: '1px solid var(--line)' }}>
                  {selectedEvent.description}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12.5px', color: '#64748b', borderTop: '1px solid var(--line)', paddingTop: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <User size={13} />
                  <span>등록자: <b>{selectedEvent.creatorName}</b> ({selectedEvent.creatorUsername})</span>
                </div>
                {selectedEvent.referencedUsernames && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                    <Users size={13} style={{ marginTop: '2px' }} />
                    <div>
                      <span>참조인: </span>
                      {selectedEvent.referencedUsernames.split(',').map((username, index) => {
                        const matched = users.find(u => u.username === username);
                        return (
                          <span key={index} style={{ background: '#f1f5f9', color: '#475569', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', fontSize: '11px', marginRight: '4px' }}>
                            {matched ? matched.name : username}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div style={{ padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              {(currentUser?.role === 'ROLE_ADMIN' || currentUser?.role === 'ADMIN' || currentUser?.username === selectedEvent.creatorUsername) && (
                <>
                  <button 
                    onClick={() => handleOpenEdit(selectedEvent)}
                    style={{ background: '#ffffff', border: '1px solid var(--line)', borderRadius: '10px', padding: '8px 14px', fontSize: '13px', fontWeight: 700, color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#ffffff'}
                  >
                    <Edit3 size={14} /> 수정
                  </button>
                  <button 
                    onClick={() => handleDeleteEvent(selectedEvent.id!)}
                    style={{ background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '10px', padding: '8px 14px', fontSize: '13px', fontWeight: 700, color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#fee2e2'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#fef2f2'}
                  >
                    <Trash2 size={14} /> 삭제
                  </button>
                </>
              )}
              <button 
                onClick={() => setIsDetailOpen(false)}
                style={{ background: '#475569', border: 'none', borderRadius: '10px', padding: '8px 16px', fontSize: '13px', fontWeight: 700, color: '#ffffff', cursor: 'pointer' }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 일정 추가 / 수정 모달 */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#ffffff', borderRadius: '16px', width: '90%', maxWidth: '680px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)', border: '1px solid var(--line)' }}>
            <form onSubmit={handleFormSubmit}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: '1px solid var(--line)', background: '#f8fafc' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 900, color: 'var(--navy)' }}>
                  {formId ? '일정 수정하기' : '신규 일정 등록'}
                </h3>
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '82vh', overflowY: 'auto' }}>
                {/* 제목 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 800, color: 'var(--navy)' }}>일정 제목 *</label>
                  <input 
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="업무 일정 제목을 입력해 주세요"
                    style={{ border: '1.4px solid var(--line)', borderRadius: '9px', padding: '8px 12px', fontSize: '13.5px', outline: 'none', color: 'var(--txt)' }}
                    className="focus-border-blue"
                  />
                </div>

                {/* 시작 시간 / 종료 시간 */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 800, color: 'var(--navy)' }}>시작일 *</label>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <input 
                        type="date"
                        value={formStartDate}
                        onChange={(e) => setFormStartDate(e.target.value)}
                        style={{ border: '1.4px solid var(--line)', borderRadius: '9px', padding: '8px', fontSize: '13px', outline: 'none', flex: 2 }}
                      />
                      <input 
                        type="time"
                        value={formStartTime}
                        onChange={(e) => setFormStartTime(e.target.value)}
                        style={{ border: '1.4px solid var(--line)', borderRadius: '9px', padding: '8px', fontSize: '13px', outline: 'none', flex: 1.2 }}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 800, color: 'var(--navy)' }}>종료일 *</label>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <input 
                        type="date"
                        value={formEndDate}
                        onChange={(e) => setFormEndDate(e.target.value)}
                        style={{ border: '1.4px solid var(--line)', borderRadius: '9px', padding: '8px', fontSize: '13px', outline: 'none', flex: 2 }}
                      />
                      <input 
                        type="time"
                        value={formEndTime}
                        onChange={(e) => setFormEndTime(e.target.value)}
                        style={{ border: '1.4px solid var(--line)', borderRadius: '9px', padding: '8px', fontSize: '13px', outline: 'none', flex: 1.2 }}
                      />
                    </div>
                  </div>
                </div>

                {/* 설명 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 800, color: 'var(--navy)' }}>상세 설명</label>
                  <textarea 
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    placeholder="회의 안건 또는 지출 내역 등 상세 업무 기록을 작성하세요"
                    style={{ border: '1.4px solid var(--line)', borderRadius: '9px', padding: '8px 12px', fontSize: '13.5px', outline: 'none', minHeight: '80px', color: 'var(--txt)', resize: 'vertical' }}
                  />
                </div>

                {/* 등록 대상 캘린더 선택 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--line)', paddingTop: '12px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 800, color: 'var(--navy)' }}>등록 대상 캘린더</label>
                  {mode === 'BUSINESS' ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#fef3c7', padding: '8px 12px', borderRadius: '8px', border: '1px solid #fde68a' }}>
                      <AlertTriangle size={15} style={{ color: '#d9a13a' }} />
                      <span style={{ fontSize: '12px', color: '#92400e', fontWeight: 700 }}>
                        재정 캘린더에 저장 시 메인 캘린더에도 자동으로 함께 노출됩니다.
                      </span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '16px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: 700 }}>
                        <input 
                          type="checkbox"
                          checked={formCalendars.includes('MAIN')}
                          onChange={() => handleCalendarCheckboxChange('MAIN')}
                          style={{ accentColor: '#2563eb' }}
                        />
                        메인 캘린더
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: 700 }}>
                        <input 
                          type="checkbox"
                          checked={formCalendars.includes('BUSINESS')}
                          onChange={() => handleCalendarCheckboxChange('BUSINESS')}
                          style={{ accentColor: '#d9a13a' }}
                        />
                        재정 캘린더
                      </label>
                    </div>
                  )}
                </div>

                {/* 참조 지정 (노출 제한) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--line)', paddingTop: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '13px', fontWeight: 800, color: 'var(--navy)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>참조 사용자 (일정 노출 제한)</span>
                      <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 500 }}>(미지정 시 본인에게만 노출)</span>
                    </label>
                    {formRefs.length > 0 && (
                      <button 
                        type="button" 
                        onClick={() => setFormRefs([])} 
                        style={{ border: 'none', background: 'none', color: '#ef4444', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer' }}
                      >
                        모두 지우기
                      </button>
                    )}
                  </div>

                  {/* 선택된 사용자 칩 목록 */}
                  {formRefs.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', background: '#f8fafc', padding: '8px', borderRadius: '8px', border: '1px solid var(--line)' }}>
                      {formRefs.map((username, index) => {
                        const matched = users.find(u => u.username === username);
                        return (
                          <span key={index} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#dbeafe', color: '#1e40af', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', fontSize: '11.5px' }}>
                            <span>{matched ? matched.name : username}</span>
                            <button 
                              type="button" 
                              onClick={() => handleToggleRefUser(username)}
                              style={{ background: 'none', border: 'none', color: '#ef4444', display: 'flex', alignItems: 'center', cursor: 'pointer', padding: 0 }}
                            >
                              <X size={10} />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* 검색창 및 체크 박스 리스트 */}
                  <div style={{ border: '1.4px solid var(--line)', borderRadius: '9px', overflow: 'hidden' }}>
                    <input 
                      type="text" 
                      placeholder="이름 또는 아이디로 검색..."
                      value={searchUserKeyword}
                      onChange={(e) => setSearchUserKeyword(e.target.value)}
                      style={{ width: '100%', border: 'none', borderBottom: '1.4px solid var(--line)', padding: '8px 12px', fontSize: '12.5px', outline: 'none' }}
                    />
                    <div style={{ maxHeight: '150px', overflowY: 'auto', padding: '6px' }}>
                      {searchUserKeyword.trim() === '' ? (
                        <p style={{ fontSize: '12px', color: 'var(--muted)', textAlign: 'center', padding: '10px 0' }}>이름 또는 아이디를 검색하여 참조자를 추가하세요.</p>
                      ) : filteredUsers.length === 0 ? (
                        <p style={{ fontSize: '12px', color: 'var(--muted)', textAlign: 'center', padding: '10px 0' }}>일치하는 회원이 없습니다.</p>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                          {filteredUsers.map((u, index) => {
                            const isChecked = formRefs.includes(u.username);
                            return (
                              <div 
                                key={index} 
                                onClick={() => handleToggleRefUser(u.username)}
                                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 8px', borderRadius: '6px', background: isChecked ? '#eff6ff' : 'transparent', cursor: 'pointer', transition: 'all 0.1s' }}
                                className="hover-bg-panel2"
                              >
                                <div style={{ width: '16px', height: '16px', borderRadius: '4px', border: '1px solid #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isChecked ? '#2563eb' : '#ffffff', borderColor: isChecked ? '#2563eb' : '#cbd5e1' }}>
                                  {isChecked && <Check size={10} color="#ffffff" />}
                                </div>
                                <span style={{ fontSize: '12.5px', color: isChecked ? '#1e40af' : '#475569', fontWeight: isChecked ? 700 : 500 }}>
                                  {u.name} <span style={{ fontSize: '10.5px', color: '#94a3b8' }}>({u.username})</span>
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  style={{ background: '#ffffff', border: '1px solid var(--line)', borderRadius: '10px', padding: '8px 16px', fontSize: '13px', fontWeight: 700, color: '#475569', cursor: 'pointer' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#ffffff'}
                >
                  취소
                </button>
                <button 
                  type="submit"
                  style={{ background: mode === 'BUSINESS' ? 'linear-gradient(135deg, #e6b455, #d9a13a)' : 'linear-gradient(135deg, #4b8bff, #2563eb)', border: 'none', borderRadius: '10px', padding: '8px 18px', fontSize: '13px', fontWeight: 700, color: '#ffffff', cursor: 'pointer', boxShadow: '0 4px 12px rgba(37,99,235,0.15)' }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                >
                  {formId ? '수정 완료' : '일정 등록'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
