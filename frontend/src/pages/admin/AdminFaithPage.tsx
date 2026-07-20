import React, { useState, useEffect } from 'react';
import { adminService, ChurchItem } from '../../services/adminService';
import { diagnosisService } from '../../services/diagnosisService';
import defaultChurchesData from '../../assets/defaultChurches.json';
import { Plus, Search, Edit2, Trash2, Globe, Building2, MapPin, Flag, X, Clock } from 'lucide-react';

const COUNTRY_INFO: Record<string, { lang: string; rel: string }> = {
  "일본": { lang: "일본어", rel: "신토·불교" },
  "중국": { lang: "중국어(표준)", rel: "불교·도교·무종교" },
  "필리핀": { lang: "필리핀어(타갈로그)·영어", rel: "가톨릭" },
  "인도네시아": { lang: "인도네시아어", rel: "이슬람교" },
  "대만": { lang: "중국어(만다린)", rel: "불교·도교" },
  "카자흐스탄": { lang: "카자흐어·러시아어", rel: "이슬람교(수니)" },
  "우즈베키스탄": { lang: "우즈베크어", rel: "이슬람교(수니)" },
  "네팔": { lang: "네팔어", rel: "힌두교" },
  "인도": { lang: "힌디어·영어", rel: "힌두교" },
  "파키스탄": { lang: "우르두어·영어", rel: "이슬람교" },
  "튀르키예": { lang: "튀르키예어", rel: "이슬람교(수니)" },
  "포르투갈": { lang: "포르투갈어", rel: "가톨릭" },
  "브라질": { lang: "포르투갈어", rel: "가톨릭" },
  "멕시코": { lang: "스페인어", rel: "가톨릭" },
  "미국": { lang: "영어", rel: "기독교" },
  "콩고민주공화국": { lang: "프랑스어", rel: "기독교(가톨릭)" },
  "카메룬": { lang: "프랑스어·영어", rel: "기독교·이슬람교" }
};

export function computeLocationInfo(lat?: number, lon?: number, country?: string, currentTimeDate?: Date) {
  const cLat = lat || 35.68;
  const cLon = lon || 139.76;
  const ICN = { lat: 37.46, lng: 126.44 };

  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(cLat - ICN.lat);
  const dLng = toRad(cLon - ICN.lng);
  const hav =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(ICN.lat)) * Math.cos(toRad(cLat)) * Math.sin(dLng / 2) ** 2;
  const km = Math.round(2 * 6371 * Math.asin(Math.min(1, Math.sqrt(hav))));
  const hrs = (km / 900 + 1.0).toFixed(1);

  // Timezone Offset Calculation from Longitude
  const tzo = Math.round(cLon / 15);
  const diffHours = tzo - 9; // Korea is UTC+9
  const diffLabel =
    diffHours === 0
      ? '한국과 동일'
      : diffHours > 0
      ? `한국보다 +${diffHours}시간 빠름`
      : `한국보다 ${Math.abs(diffHours)}시간 느림`;

  // Real-time current local time
  const now = currentTimeDate || new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const localDate = new Date(utc + 3600000 * tzo);

  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const month = localDate.getMonth() + 1;
  const date = localDate.getDate();
  const dayName = days[localDate.getDay()];
  const rawH = localDate.getHours();
  const ampm = rawH < 12 ? '오전' : '오후';
  const h12 = ((rawH + 11) % 12) + 1;
  const min = String(localDate.getMinutes()).padStart(2, '0');
  const sec = String(localDate.getSeconds()).padStart(2, '0');

  const currentTime = `${month}월 ${date}일 (${dayName}) ${ampm} ${h12}:${min}:${sec}`;
  const info = COUNTRY_INFO[country || ''] || { lang: '현지어·영어', rel: '기독교·이슬람교' };

  return {
    flightTime: `${hrs}시간`,
    distanceKm: km,
    timeDiff: diffLabel,
    currentTime,
    language: info.lang,
    religion: info.rel
  };
}

export const AdminFaithPage: React.FC = () => {
  const [churches, setChurches] = useState<ChurchItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterGubun, setFilterGubun] = useState<string>('전체');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [nowDate, setNowDate] = useState<Date>(new Date());

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingChurch, setEditingChurch] = useState<ChurchItem | null>(null);

  // Form State
  const [formData, setFormData] = useState<ChurchItem>({
    name: '',
    gubun: '교회',
    jipa: '맛디아',
    continent: '아시아',
    country: '',
    leaderName: '',
    flightTime: '6.3시간',
    distanceKm: 4760,
    timeDiff: '한국보다 4시간 느림',
    language: '우르두어·영어',
    religion: '이슬람교'
  });

  // Map 21 default churches from defaultChurches.json
  const defaultList: ChurchItem[] = defaultChurchesData.map((c: any, i: number) => ({
    churchId: i + 1,
    gubun: c.gubun || '교회',
    jipa: c.jipa || '맛디아',
    continent: c.continent || '아시아',
    country: c.country || '해외',
    name: c.name,
    leaderName: '담임/담당 사역자',
    lat: c.lat || 35.68,
    lon: c.lon || 139.76
  }));

  const loadChurches = async () => {
    setLoading(true);
    try {
      let data: ChurchItem[] = [];
      try {
        data = await adminService.getChurches();
      } catch (e) {
        data = await diagnosisService.getChurches();
      }

      if (data && data.length > 0) {
        setChurches(data);
      } else {
        setChurches(defaultList);
      }
    } catch (err) {
      console.warn("Failed to fetch churches from API, using default list:", err);
      setChurches(defaultList);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChurches();

    // 1-second live ticker interval for real-time local time calculation
    const timer = setInterval(() => {
      setNowDate(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Filter logic
  const filteredChurches = churches.filter((item) => {
    const matchesGubun = filterGubun === '전체' || item.gubun === filterGubun;
    const searchLow = searchTerm.toLowerCase();
    const displayName = `${item.jipa} · ${item.name}`;
    const matchesSearch =
      displayName.toLowerCase().includes(searchLow) ||
      item.country.toLowerCase().includes(searchLow) ||
      item.continent.toLowerCase().includes(searchLow) ||
      (item.leaderName && item.leaderName.toLowerCase().includes(searchLow));
    return matchesGubun && matchesSearch;
  });

  const handleOpenAddModal = () => {
    setEditingChurch(null);
    setFormData({
      name: '',
      gubun: '교회',
      jipa: '맛디아',
      continent: '아시아',
      country: '',
      leaderName: '',
      flightTime: '6.3시간',
      distanceKm: 4760,
      timeDiff: '한국보다 4시간 느림',
      language: '우르두어·영어',
      religion: '이슬람교'
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: ChurchItem) => {
    setEditingChurch(item);
    setFormData({ ...item });
    setIsModalOpen(true);
  };

  const handleDelete = async (churchId?: number) => {
    if (!churchId) return;
    if (!window.confirm("정말 이 항목을 삭제하시겠습니까?")) return;
    try {
      await adminService.deleteChurch(churchId);
      loadChurches();
    } catch (err) {
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.country.trim()) {
      alert("교회/지역명과 국가명을 입력해주세요.");
      return;
    }

    try {
      if (editingChurch && editingChurch.churchId) {
        await adminService.updateChurch(editingChurch.churchId, formData);
        alert("성공적으로 수정되었습니다.");
      } else {
        await adminService.createChurch(formData);
        alert("성공적으로 추가되었습니다.");
      }
      setIsModalOpen(false);
      loadChurches();
    } catch (err) {
      alert("저장 중 오류가 발생했습니다.");
    }
  };

  return (
    <div>
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1f2a44', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            🩺 해외교회 · 지역 · 개척지 관리 <span style={{ fontSize: '0.9rem', color: '#2563eb', fontWeight: 700 }}>({churches.length}개 대상)</span>
          </h1>
          <p style={{ color: '#6b7a99', fontSize: '0.88rem', margin: '4px 0 0 0' }}>
            진단서 및 포탈 검색 드롭다운 목록을 정의하고 시차, 실시간 현지 시각, 거리, 언어, 종교, 담임사역자 정보를 관리합니다.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          style={{
            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            padding: '10px 18px',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)'
          }}
        >
          <Plus size={18} /> 추가
        </button>
      </div>

      {/* Control Bar: Category Filter Chips & Search Bar */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e6edf8',
        borderRadius: '16px',
        padding: '16px 20px',
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        boxShadow: '0 2px 8px rgba(20, 40, 90, 0.03)'
      }}>
        {/* Chips */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {[
            { key: '전체', icon: <Globe size={16} /> },
            { key: '교회', icon: <Building2 size={16} /> },
            { key: '지역', icon: <MapPin size={16} /> },
            { key: '개척지', icon: <Flag size={16} /> }
          ].map((chip) => {
            const isSelected = filterGubun === chip.key;
            return (
              <button
                key={chip.key}
                onClick={() => setFilterGubun(chip.key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 18px',
                  borderRadius: '20px',
                  border: isSelected ? '1px solid #c7d2fe' : '1px solid #e6edf8',
                  background: isSelected ? '#e0e7ff' : '#ffffff',
                  color: isSelected ? '#2563eb' : '#6b7a99',
                  fontWeight: isSelected ? 700 : 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: isSelected ? '0 2px 6px rgba(37,99,235,0.12)' : 'none'
                }}
              >
                {chip.icon} {chip.key}
              </button>
            );
          })}
        </div>

        {/* Search Field */}
        <div style={{ position: 'relative', minWidth: '280px' }}>
          <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="교회명, 지파, 국가, 대륙 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px 10px 40px',
              background: '#ffffff',
              border: '1px solid #dbe2ef',
              borderRadius: '10px',
              color: '#1f2a44',
              fontSize: '0.88rem',
              outline: 'none'
            }}
          />
        </div>
      </div>

      {/* Main Data Table */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e6edf8',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 4px 14px rgba(20, 40, 90, 0.04)'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
              <th style={{ padding: '14px 18px', fontWeight: 700 }}>구분</th>
              <th style={{ padding: '14px 18px', fontWeight: 700 }}>포탈 검색 표시명 (지파 · 교회/지역명)</th>
              <th style={{ padding: '14px 18px', fontWeight: 700 }}>대륙 / 국가</th>
              <th style={{ padding: '14px 18px', fontWeight: 700 }}>담임 / 담당자</th>
              <th style={{ padding: '14px 18px', fontWeight: 700 }}>거리 · 실시간 현지 시각 및 시차</th>
              <th style={{ padding: '14px 18px', fontWeight: 700 }}>현지 언어 / 주요 종교</th>
              <th style={{ padding: '14px 18px', fontWeight: 700, textAlign: 'right' }}>관리</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ padding: '30px', textAlign: 'center', color: '#6b7a99' }}>
                  데이터를 불러오는 중입니다...
                </td>
              </tr>
            ) : filteredChurches.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '30px', textAlign: 'center', color: '#6b7a99' }}>
                  등록된 교회/지역 데이터가 없습니다.
                </td>
              </tr>
            ) : (
              filteredChurches.map((item) => {
                const displayName = `${item.jipa} · ${item.name}`;
                const locInfo = computeLocationInfo(item.lat, item.lon, item.country, nowDate);

                let badgeBg = '#dbeafe';
                let badgeColor = '#1d4ed8';
                if (item.gubun === '지역') {
                  badgeBg = '#d1fae5';
                  badgeColor = '#047857';
                } else if (item.gubun === '개척지') {
                  badgeBg = '#fef3c7';
                  badgeColor = '#b45309';
                }

                return (
                  <tr key={item.churchId || item.name} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s ease' }}>
                    <td style={{ padding: '14px 18px' }}>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        background: badgeBg,
                        color: badgeColor
                      }}>
                        {item.gubun}
                      </span>
                    </td>
                    <td style={{ padding: '14px 18px', fontWeight: 700, color: '#1f2a44' }}>
                      {displayName}
                    </td>
                    <td style={{ padding: '14px 18px', color: '#475569' }}>
                      {item.continent} · {item.country}
                    </td>
                    <td style={{ padding: '14px 18px', color: '#475569' }}>
                      {item.leaderName || '사역자 미지정'}
                    </td>
                    <td style={{ padding: '14px 18px', color: '#64748b', fontSize: '0.82rem' }}>
                      ✈️ 직항 약 <b>{item.flightTime || locInfo.flightTime}</b> ({item.distanceKm || locInfo.distanceKm} km)
                      <br />
                      <span style={{ color: '#0284c7', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}>
                        <Clock size={13} /> {locInfo.currentTime}
                      </span>
                      <br />
                      <span style={{ color: '#d97706', fontWeight: 600 }}>🕒 {item.timeDiff || locInfo.timeDiff}</span>
                    </td>
                    <td style={{ padding: '14px 18px', color: '#64748b', fontSize: '0.82rem' }}>
                      🗣️ {item.language || locInfo.language}
                      <br />
                      <span style={{ color: '#475569' }}>🙏 {item.religion || locInfo.religion}</span>
                    </td>
                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => handleOpenEditModal(item)}
                          style={{
                            background: '#f1f5f9',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            color: '#334155',
                            padding: '6px 12px',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Edit2 size={14} /> 수정
                        </button>
                        <button
                          onClick={() => handleDelete(item.churchId)}
                          style={{
                            background: '#fee2e2',
                            border: '1px solid #fca5a5',
                            borderRadius: '6px',
                            color: '#dc2626',
                            padding: '6px 12px',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Trash2 size={14} /> 삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Modal Dialog */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 10000,
          background: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            border: '1px solid #e6edf8',
            borderRadius: '20px',
            maxWidth: '650px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '28px',
            boxShadow: '0 25px 60px rgba(20, 40, 90, 0.2)',
            color: '#1f2a44'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #e6edf8', paddingBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#1f2a44' }}>
                {editingChurch ? '✏️ 해외교회 · 지역 정보 수정' : '➕ 신규 해외교회 · 지역 추가'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: '#64748b', marginBottom: '6px', fontWeight: 600 }}>구분</label>
                  <select
                    value={formData.gubun}
                    onChange={(e) => setFormData({ ...formData, gubun: e.target.value })}
                    style={{ width: '100%', padding: '10px', background: '#f8fafc', border: '1px solid #dbe2ef', borderRadius: '8px', color: '#1f2a44' }}
                  >
                    <option value="교회">교회</option>
                    <option value="지역">지역</option>
                    <option value="개척지">개척지</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: '#64748b', marginBottom: '6px', fontWeight: 600 }}>소속 지파</label>
                  <select
                    value={formData.jipa}
                    onChange={(e) => setFormData({ ...formData, jipa: e.target.value })}
                    style={{ width: '100%', padding: '10px', background: '#f8fafc', border: '1px solid #dbe2ef', borderRadius: '8px', color: '#1f2a44' }}
                  >
                    <option value="맛디아">맛디아</option>
                    <option value="서울">서울</option>
                    <option value="무등">무등</option>
                    <option value="베드로">베드로</option>
                    <option value="요한">요한</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: '#64748b', marginBottom: '6px', fontWeight: 600 }}>교회 / 지역 / 개척지 명</label>
                <input
                  type="text"
                  required
                  placeholder="예: 파키스탄교회, 대전교회카자흐스탄아스타나지역"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{ width: '100%', padding: '10px', background: '#f8fafc', border: '1px solid #dbe2ef', borderRadius: '8px', color: '#1f2a44' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: '#64748b', marginBottom: '6px', fontWeight: 600 }}>대륙</label>
                  <select
                    value={formData.continent}
                    onChange={(e) => setFormData({ ...formData, continent: e.target.value })}
                    style={{ width: '100%', padding: '10px', background: '#f8fafc', border: '1px solid #dbe2ef', borderRadius: '8px', color: '#1f2a44' }}
                  >
                    <option value="아시아">아시아</option>
                    <option value="유럽">유럽</option>
                    <option value="아프리카">아프리카</option>
                    <option value="북미">북미</option>
                    <option value="남미">남미</option>
                    <option value="오세아니아">오세아니아</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: '#64748b', marginBottom: '6px', fontWeight: 600 }}>국가명</label>
                  <input
                    type="text"
                    required
                    placeholder="예: 파키스탄, 카자흐스탄"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    style={{ width: '100%', padding: '10px', background: '#f8fafc', border: '1px solid #dbe2ef', borderRadius: '8px', color: '#1f2a44' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', color: '#64748b', marginBottom: '6px', fontWeight: 600 }}>담임 / 담당 사역자 이름</label>
                <input
                  type="text"
                  placeholder="예: 홍길동 담임사역자"
                  value={formData.leaderName || ''}
                  onChange={(e) => setFormData({ ...formData, leaderName: e.target.value })}
                  style={{ width: '100%', padding: '10px', background: '#f8fafc', border: '1px solid #dbe2ef', borderRadius: '8px', color: '#1f2a44' }}
                />
              </div>

              {/* Distance & Time Diff Details */}
              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e6edf8' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#2563eb', marginBottom: '10px' }}>✈️ 한국 (인천 ICN) 기준 거리 · 시차 설정</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '4px' }}>직항 소요시간</label>
                    <input
                      type="text"
                      placeholder="예: 6.3시간"
                      value={formData.flightTime || ''}
                      onChange={(e) => setFormData({ ...formData, flightTime: e.target.value })}
                      style={{ width: '100%', padding: '8px', background: '#ffffff', border: '1px solid #dbe2ef', borderRadius: '6px', color: '#1f2a44', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '4px' }}>대권거리 (km)</label>
                    <input
                      type="number"
                      placeholder="예: 4760"
                      value={formData.distanceKm || ''}
                      onChange={(e) => setFormData({ ...formData, distanceKm: parseInt(e.target.value) || 0 })}
                      style={{ width: '100%', padding: '8px', background: '#ffffff', border: '1px solid #dbe2ef', borderRadius: '6px', color: '#1f2a44', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '4px' }}>현지 시각 / 시차</label>
                    <input
                      type="text"
                      placeholder="예: 한국보다 4시간 느림"
                      value={formData.timeDiff || ''}
                      onChange={(e) => setFormData({ ...formData, timeDiff: e.target.value })}
                      style={{ width: '100%', padding: '8px', background: '#ffffff', border: '1px solid #dbe2ef', borderRadius: '6px', color: '#1f2a44', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>
              </div>

              {/* Language & Religion Details */}
              <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e6edf8' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#059669', marginBottom: '10px' }}>🌐 현지 언어 · 주요 종교 설정</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '4px' }}>현지 언어</label>
                    <input
                      type="text"
                      placeholder="예: 우르두어·영어"
                      value={formData.language || ''}
                      onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                      style={{ width: '100%', padding: '8px', background: '#ffffff', border: '1px solid #dbe2ef', borderRadius: '6px', color: '#1f2a44', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '4px' }}>주요 종교</label>
                    <input
                      type="text"
                      placeholder="예: 이슬람교"
                      value={formData.religion || ''}
                      onChange={(e) => setFormData({ ...formData, religion: e.target.value })}
                      style={{ width: '100%', padding: '8px', background: '#ffffff', border: '1px solid #dbe2ef', borderRadius: '6px', color: '#1f2a44', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>
              </div>

              {/* Modal Buttons */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{ padding: '10px 18px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#475569', cursor: 'pointer', fontWeight: 600 }}
                >
                  취소
                </button>
                <button
                  type="submit"
                  style={{ padding: '10px 22px', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer', fontWeight: 700, boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)' }}
                >
                  {editingChurch ? '수정 저장' : '신규 추가'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
