import React, { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';
import { Save, Bot, Globe, FileCode, CalendarClock, LayoutGrid } from 'lucide-react';

export const AdminSettingsPage: React.FC = () => {
  const [configs, setConfigs] = useState<any[]>([]);
  const [botToken, setBotToken] = useState('');
  const [botName, setBotName] = useState('');
  const [msg, setMsg] = useState('');

  // JSON Config items state
  const [itemsJson, setItemsJson] = useState('');
  const [jsonMsg, setJsonMsg] = useState('');

  // 전도재적(고정값) 계산 기준 시점 — 기본값: 전년도(-1) 12월
  const [baselineOffsetYears, setBaselineOffsetYears] = useState(-1);
  const [baselineMonth, setBaselineMonth] = useState(12);
  const [baselineMsg, setBaselineMsg] = useState('');

  // 화면 표시 설정 (표 형태) — 전도 커스텀 그래프 최대 개수, 기본값 10
  const [maxChartCount, setMaxChartCount] = useState(10);
  const [displayMsg, setDisplayMsg] = useState('');

  const loadConfigs = () => {
    adminService.getConfigs().then((data) => {
      setConfigs(data);
      const tokenConfig = data.find((c: any) => c.configKey === 'TELEGRAM_BOT_TOKEN');
      if (tokenConfig) setBotToken(tokenConfig.configValue);
      const nameConfig = data.find((c: any) => c.configKey === 'TELEGRAM_BOT_USERNAME');
      if (nameConfig) setBotName(nameConfig.configValue);

      const offsetConfig = data.find((c: any) => c.configKey === 'evang_reg_baseline_offset_years');
      if (offsetConfig) setBaselineOffsetYears(parseInt(offsetConfig.configValue, 10) || -1);
      const monthConfig = data.find((c: any) => c.configKey === 'evang_reg_baseline_month');
      if (monthConfig) setBaselineMonth(parseInt(monthConfig.configValue, 10) || 12);

      const maxChartConfig = data.find((c: any) => c.configKey === 'evangelism_chart_max_count');
      if (maxChartConfig) setMaxChartCount(parseInt(maxChartConfig.configValue, 10) || 10);

      const itemsConfig = data.find((c: any) => c.configKey === 'evangelism_items_by_country');
      if (itemsConfig) {
        // Pretty print JSON config
        try {
          const parsed = JSON.parse(itemsConfig.configValue);
          setItemsJson(JSON.stringify(parsed, null, 2));
        } catch (e) {
          setItemsJson(itemsConfig.configValue);
        }
      } else {
        const defaults = {
          "default": [
            {"key": "find", "label": "찾", "color": "#2563eb", "isDrop": false, "groupName": "찾기 상세분석", "groupDesc": "주차별 찾기와 탈락수를 볼 수 있습니다."},
            {"key": "findDrop", "label": "탈", "color": "#dc2626", "isDrop": true, "groupName": "찾기 상세분석"},
            {"key": "gospel", "label": "복", "color": "#7c3aed", "isDrop": false, "groupName": "복음방 상세분석", "groupDesc": "주차별 복음방과 탈락수를 볼 수 있습니다."},
            {"key": "gospelDrop", "label": "탈", "color": "#dc2626", "isDrop": true, "groupName": "복음방 상세분석"},
            {"key": "admit", "label": "개", "color": "#16a34a", "isDrop": false, "groupName": "가개강 상세분석", "groupDesc": "주차별 가개강(등록)과 탈락수를 볼 수 있습니다."},
            {"key": "admitDrop", "label": "탈", "color": "#dc2626", "isDrop": true, "groupName": "가개강 상세분석"}
          ]
        };
        setItemsJson(JSON.stringify(defaults, null, 2));
      }
    }).catch(console.error);
  };

  useEffect(() => {
    loadConfigs();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminService.updateConfig('TELEGRAM_BOT_TOKEN', botToken);
      if (botName) await adminService.updateConfig('TELEGRAM_BOT_USERNAME', botName);
      setMsg('텔레그램 봇 API 설정이 성공적으로 저장되었습니다.');
      loadConfigs();
      setTimeout(() => setMsg(''), 2000);
    } catch (e: any) {
      alert(e.message || '저장 실패');
    }
  };

  const handleSaveJson = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const parsed = JSON.parse(itemsJson);
      if (!parsed.default || !Array.isArray(parsed.default)) {
        alert("JSON 포맷 오류: 'default' 설정이 누락되었거나 배열이 아닙니다.");
        return;
      }

      await adminService.updateConfig('evangelism_items_by_country', JSON.stringify(parsed), '국가별 전도 실적 가변 항목 설정 (JSON)');
      setJsonMsg('국가별 항목 설정이 성공적으로 저장되었습니다.');
      loadConfigs();
      setTimeout(() => setJsonMsg(''), 2000);
    } catch (e: any) {
      alert('올바른 JSON 형식이 아닙니다: ' + e.message);
    }
  };

  const handleSaveBaseline = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminService.updateConfig('evang_reg_baseline_offset_years', String(baselineOffsetYears), '전도재적(고정값) 기준 연도 오프셋 (예: -1 = 전년도, 0 = 당해년도)');
      await adminService.updateConfig('evang_reg_baseline_month', String(baselineMonth), '전도재적(고정값) 기준 월 (1-12)');
      setBaselineMsg('전도재적 기준 시점이 저장되었습니다. 전도 화면에 바로 반영됩니다.');
      loadConfigs();
      setTimeout(() => setBaselineMsg(''), 2000);
    } catch (e: any) {
      alert(e.message || '저장 실패');
    }
  };

  const handleSaveDisplaySettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminService.updateConfig('evangelism_chart_max_count', String(Math.max(1, maxChartCount)), '전도 커스텀 그래프 대시보드(/evangelism)에서 사용자가 추가할 수 있는 최대 그래프 개수');
      setDisplayMsg('화면 표시 설정이 저장되었습니다.');
      loadConfigs();
      setTimeout(() => setDisplayMsg(''), 2000);
    } catch (e: any) {
      alert(e.message || '저장 실패');
    }
  };

  const applyTemplate = (type: string) => {
    let tpl = {};
    if (type === 'jp') {
      tpl = {
        "default": [
          {"key": "find", "label": "찾", "color": "#2563eb", "isDrop": false, "groupName": "찾기 상세분석", "groupDesc": "주차별 찾기와 탈락수를 볼 수 있습니다."},
          {"key": "findDrop", "label": "탈", "color": "#dc2626", "isDrop": true, "groupName": "찾기 상세분석"},
          {"key": "gospel", "label": "복", "color": "#7c3aed", "isDrop": false, "groupName": "복음방 상세분석", "groupDesc": "주차별 복음방과 탈락수를 볼 수 있습니다."},
          {"key": "gospelDrop", "label": "탈", "color": "#dc2626", "isDrop": true, "groupName": "복음방 상세분석"},
          {"key": "admit", "label": "개", "color": "#16a34a", "isDrop": false, "groupName": "가개강 상세분석", "groupDesc": "주차별 가개강(등록)과 탈락수를 볼 수 있습니다."},
          {"key": "admitDrop", "label": "탈", "color": "#dc2626", "isDrop": true, "groupName": "가개강 상세분석"}
        ],
        "일본": [
          {"key": "find", "label": "찾", "color": "#2563eb", "isDrop": false, "groupName": "찾기 상세분석", "groupDesc": "주차별 찾기와 탈락수를 볼 수 있습니다."},
          {"key": "findDrop", "label": "탈", "color": "#dc2626", "isDrop": true, "groupName": "찾기 상세분석"},
          {"key": "gospel", "label": "복", "color": "#7c3aed", "isDrop": false, "groupName": "복음방 상세분석", "groupDesc": "주차별 복음방과 탈락수를 볼 수 있습니다."},
          {"key": "gospelDrop", "label": "탈", "color": "#dc2626", "isDrop": true, "groupName": "복음방 상세분석"},
          {"key": "admit", "label": "개", "color": "#16a34a", "isDrop": false, "groupName": "가개강 상세분석", "groupDesc": "주차별 가개강(등록)과 탈락수를 볼 수 있습니다."},
          {"key": "admitDrop", "label": "탈", "color": "#dc2626", "isDrop": true, "groupName": "가개강 상세분석"}
        ]
      };
    } else if (type === 'in') {
      tpl = {
        "default": [
          {"key": "find", "label": "찾", "color": "#2563eb", "isDrop": false, "groupName": "찾기 상세분석", "groupDesc": "주차별 찾기와 탈락수를 볼 수 있습니다."},
          {"key": "findDrop", "label": "탈", "color": "#dc2626", "isDrop": true, "groupName": "찾기 상세분석"},
          {"key": "gospel", "label": "복", "color": "#7c3aed", "isDrop": false, "groupName": "복음방 상세분석", "groupDesc": "주차별 복음방과 탈락수를 볼 수 있습니다."},
          {"key": "gospelDrop", "label": "탈", "color": "#dc2626", "isDrop": true, "groupName": "복음방 상세분석"},
          {"key": "admit", "label": "개", "color": "#16a34a", "isDrop": false, "groupName": "가개강 상세분석", "groupDesc": "주차별 가개강(등록)과 탈락수를 볼 수 있습니다."},
          {"key": "admitDrop", "label": "탈", "color": "#dc2626", "isDrop": true, "groupName": "가개강 상세분석"}
        ],
        "인도": [
          {"key": "find", "label": "찾", "color": "#2563eb", "isDrop": false, "groupName": "찾기 상세분석", "groupDesc": "주차별 찾기와 탈락수를 볼 수 있습니다."},
          {"key": "findDrop", "label": "탈", "color": "#dc2626", "isDrop": true, "groupName": "찾기 상세분석"},
          {"key": "gospel", "label": "복", "color": "#7c3aed", "isDrop": false, "groupName": "복음방 상세분석", "groupDesc": "주차별 복음방과 탈락수를 볼 수 있습니다."},
          {"key": "gospelDrop", "label": "탈", "color": "#dc2626", "isDrop": true, "groupName": "복음방 상세분석"}
        ]
      };
    } else if (type === 'us') {
      tpl = {
        "default": [
          {"key": "find", "label": "찾", "color": "#2563eb", "isDrop": false, "groupName": "찾기 상세분석", "groupDesc": "주차별 찾기와 탈락수를 볼 수 있습니다."},
          {"key": "findDrop", "label": "탈", "color": "#dc2626", "isDrop": true, "groupName": "찾기 상세분석"},
          {"key": "gospel", "label": "복", "color": "#7c3aed", "isDrop": false, "groupName": "복음방 상세분석", "groupDesc": "주차별 복음방과 탈락수를 볼 수 있습니다."},
          {"key": "gospelDrop", "label": "탈", "color": "#dc2626", "isDrop": true, "groupName": "복음방 상세분석"},
          {"key": "admit", "label": "개", "color": "#16a34a", "isDrop": false, "groupName": "가개강 상세분석", "groupDesc": "주차별 가개강(등록)과 탈락수를 볼 수 있습니다."},
          {"key": "admitDrop", "label": "탈", "color": "#dc2626", "isDrop": true, "groupName": "가개강 상세분석"}
        ],
        "미국": [
          {"key": "find", "label": "찾", "color": "#2563eb", "isDrop": false, "groupName": "찾기 상세분석", "groupDesc": "주차별 찾기와 탈락수를 볼 수 있습니다."},
          {"key": "findDrop", "label": "탈", "color": "#dc2626", "isDrop": true, "groupName": "찾기 상세분석"},
          {"key": "gospel", "label": "복", "color": "#7c3aed", "isDrop": false, "groupName": "복음방 상세분석", "groupDesc": "주차별 복음방과 탈락수를 볼 수 있습니다."},
          {"key": "gospelDrop", "label": "탈", "color": "#dc2626", "isDrop": true, "groupName": "복음방 상세분석"},
          {"key": "admit", "label": "개", "color": "#16a34a", "isDrop": false, "groupName": "가개강 상세분석", "groupDesc": "주차별 가개강(등록)과 탈락수를 볼 수 있습니다."},
          {"key": "admitDrop", "label": "탈", "color": "#dc2626", "isDrop": true, "groupName": "가개강 상세분석"},
          {"key": "grad", "label": "수료", "color": "#e39300", "isDrop": false, "groupName": "수료 상세분석", "groupDesc": "주차별 수료 및 탈락수를 볼 수 있습니다."},
          {"key": "gradDrop", "label": "탈", "color": "#dc2626", "isDrop": true, "groupName": "수료 상세분석"}
        ]
      };
    }
    setItemsJson(JSON.stringify(tpl, null, 2));
  };

  return (
    <div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '8px' }}>
        ⚙️ 시스템 설정 및 관리자 패널
      </h2>
      <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '24px' }}>
        텔레그램 API 정보 설정 및 각 국가별 전도 실적 입력 항목 세부 튜닝
      </p>

      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'stretch' }}>
        {/* Panel 1: Telegram Settings */}
        <div className="glass-panel" style={{ flex: '1 1 500px', padding: '28px', borderRadius: '12px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'white', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Bot size={22} color="#06b6d4" /> 텔레그램 봇 API 설정
          </h3>
          
          {msg && <div style={{ background: 'rgba(16,185,129,0.2)', color: '#34d399', padding: '10px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.85rem' }}>{msg}</div>}

          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '8px' }}>
                봇 토큰 (TELEGRAM_BOT_TOKEN)
              </label>
              <input
                type="text"
                required
                placeholder="예: 7894561230:AAExampleTokenForOverseasPortal"
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--navy-border)',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '0.9rem'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '8px' }}>
                텔레그램 봇 Username (TELEGRAM_BOT_USERNAME)
              </label>
              <input
                type="text"
                placeholder="예: OverseasPortal_Bot"
                value={botName}
                onChange={(e) => setBotName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--navy-border)',
                  borderRadius: '8px',
                  color: 'white',
                  fontSize: '0.9rem'
                }}
              />
            </div>

            <div style={{ marginTop: 'auto', paddingTop: '20px' }}>
              <button type="submit" className="btn-primary" style={{ width: '100%', padding: '12px', justifyContent: 'center' }}>
                <Save size={18} /> 설정 저장하기
              </button>
            </div>
          </form>
        </div>

        {/* Panel 1.5: 전도재적(고정값) 기준 시점 설정 */}
        <div className="glass-panel" style={{ flex: '1 1 400px', padding: '28px', borderRadius: '12px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'white', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CalendarClock size={22} color="#f59e0b" /> 전도재적(고정값) 기준 시점
          </h3>
          <p style={{ color: '#94a3b8', fontSize: '0.78rem', marginBottom: '16px' }}>
            ①전도 상세표의 "전도재적"은 내무 증감 데이터를 특정 시점까지 롤링해 고정한 값입니다.
            기본값은 <b>전년도 12월</b>이며, 필요 시 기준 연도·월을 바꿀 수 있습니다.
          </p>

          {baselineMsg && <div style={{ background: 'rgba(16,185,129,0.2)', color: '#34d399', padding: '10px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.85rem' }}>{baselineMsg}</div>}

          <form onSubmit={handleSaveBaseline} style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '8px' }}>
                기준 연도 오프셋 (예: -1 = 전년도, 0 = 당해년도, -2 = 재작년)
              </label>
              <input
                type="number"
                value={baselineOffsetYears}
                onChange={(e) => setBaselineOffsetYears(parseInt(e.target.value, 10) || 0)}
                style={{
                  width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--navy-border)', borderRadius: '8px', color: 'white', fontSize: '0.9rem',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '8px' }}>
                기준 월 (1-12)
              </label>
              <input
                type="number" min={1} max={12}
                value={baselineMonth}
                onChange={(e) => setBaselineMonth(Math.min(12, Math.max(1, parseInt(e.target.value, 10) || 12)))}
                style={{
                  width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--navy-border)', borderRadius: '8px', color: 'white', fontSize: '0.9rem',
                }}
              />
            </div>

            <div style={{ marginTop: 'auto', paddingTop: '20px' }}>
              <button type="submit" className="btn-primary" style={{ width: '100%', padding: '12px', justifyContent: 'center' }}>
                <Save size={18} /> 기준 시점 저장하기
              </button>
            </div>
          </form>
        </div>

        {/* Panel 1.7: 화면 표시 설정 (표 형태) */}
        <div className="glass-panel" style={{ flex: '1 1 480px', padding: '28px', borderRadius: '12px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'white', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <LayoutGrid size={22} color="#a855f7" /> 화면 표시 설정
          </h3>
          <p style={{ color: '#94a3b8', fontSize: '0.78rem', marginBottom: '16px' }}>
            사용자 화면의 표시 개수 등을 제어하는 설정입니다.
          </p>

          {displayMsg && <div style={{ background: 'rgba(16,185,129,0.2)', color: '#34d399', padding: '10px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.85rem' }}>{displayMsg}</div>}

          <form onSubmit={handleSaveDisplaySettings} style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
            <div style={{ overflowX: 'auto', border: '1px solid var(--navy-border)', borderRadius: '8px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <th style={{ textAlign: 'left', padding: '10px 12px', color: '#cbd5e1', fontWeight: 700 }}>설정 항목</th>
                    <th style={{ textAlign: 'left', padding: '10px 12px', color: '#cbd5e1', fontWeight: 700 }}>설명</th>
                    <th style={{ textAlign: 'left', padding: '10px 12px', color: '#cbd5e1', fontWeight: 700, width: '110px' }}>값</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: '10px 12px', color: 'white', fontWeight: 600, borderTop: '1px solid var(--navy-border)' }}>전도 커스텀 그래프 최대 개수</td>
                    <td style={{ padding: '10px 12px', color: '#94a3b8', borderTop: '1px solid var(--navy-border)' }}>/evangelism 커스텀 그래프 대시보드에서 추가할 수 있는 최대 그래프 개수</td>
                    <td style={{ padding: '10px 12px', borderTop: '1px solid var(--navy-border)' }}>
                      <input
                        type="number" min={1} max={50}
                        value={maxChartCount}
                        onChange={(e) => setMaxChartCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        style={{
                          width: '100%', padding: '8px', background: 'rgba(255,255,255,0.05)',
                          border: '1px solid var(--navy-border)', borderRadius: '6px', color: 'white', fontSize: '0.9rem',
                        }}
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: 'auto', paddingTop: '4px' }}>
              <button type="submit" className="btn-primary" style={{ width: '100%', padding: '12px', justifyContent: 'center' }}>
                <Save size={18} /> 표시 설정 저장하기
              </button>
            </div>
          </form>
        </div>

        {/* Panel 2: Country Items JSON Editor */}
        <div className="glass-panel" style={{ flex: '1 1 600px', padding: '28px', borderRadius: '12px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'white', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Globe size={22} color="#10b981" /> 🌍 국가별 전도 실적 항목 설정
          </h3>
          <p style={{ color: '#94a3b8', fontSize: '0.78rem', marginBottom: '16px' }}>
            각 국가별 전도 그리드 및 상세 분석 테이블 항목을 JSON 규격으로 커스터마이징합니다.
          </p>

          {jsonMsg && <div style={{ background: 'rgba(16,185,129,0.2)', color: '#34d399', padding: '10px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.85rem' }}>{jsonMsg}</div>}

          {/* Template presets */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b', alignSelf: 'center' }}>프리셋 템플릿:</span>
            <button type="button" onClick={() => applyTemplate('jp')} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#e2e8f0', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer' }}>
              🇯🇵 일본교회 (기존 6개 유지)
            </button>
            <button type="button" onClick={() => applyTemplate('in')} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#e2e8f0', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer' }}>
              🇮🇳 인도교회 (4개 항목 축소)
            </button>
            <button type="button" onClick={() => applyTemplate('us')} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#e2e8f0', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer' }}>
              🇺🇸 미국교회 (8개 항목 확장)
            </button>
          </div>

          <form onSubmit={handleSaveJson} style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
            <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '8px' }}>
                <FileCode size={16} /> JSON 설정 코드
              </label>
              <textarea
                value={itemsJson}
                onChange={(e) => setItemsJson(e.target.value)}
                style={{
                  width: '100%',
                  minHeight: '300px',
                  flex: 1,
                  fontFamily: 'Consolas, Monaco, monospace',
                  fontSize: '0.82rem',
                  padding: '14px',
                  background: '#0f172a',
                  border: '1px solid var(--navy-border)',
                  borderRadius: '8px',
                  color: '#34d399',
                  lineHeight: '1.5',
                  resize: 'vertical'
                }}
                spellCheck={false}
              />
            </div>

            <div>
              <button type="submit" className="btn-primary" style={{ width: '100%', padding: '12px', justifyContent: 'center', background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                <Save size={18} /> JSON 설정 저장하기
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
