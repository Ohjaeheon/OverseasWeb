import React, { useEffect, useState, useCallback } from 'react';
import api from '../../services/api';
import { Edit3, Plus, Trash2, Save, X } from 'lucide-react';

interface PlanItem {
  id: number;
  title: string;
  content: string;
}

interface DraftItem {
  id?: number;
  title: string;
  content: string;
}

interface PlanResponse {
  items: PlanItem[];
  lastUpdatedAt: string | null;
  lastUpdatedBy: string | null;
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function currentUsername(): string {
  try {
    const u = localStorage.getItem('user');
    return u ? (JSON.parse(u).username || 'admin') : 'admin';
  } catch {
    return 'admin';
  }
}

export const EvangelismPlanTab: React.FC<{ selectedChurch: string }> = ({ selectedChurch }) => {
  const [items, setItems] = useState<PlanItem[]>([]);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [lastUpdatedBy, setLastUpdatedBy] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);
  const [checkedIdx, setCheckedIdx] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!selectedChurch) return;
    setLoading(true);
    try {
      const res = await api.get<PlanResponse>('/evangelism/plan', { params: { church: selectedChurch } });
      setItems(res.data.items || []);
      setLastUpdatedAt(res.data.lastUpdatedAt || null);
      setLastUpdatedBy(res.data.lastUpdatedBy || null);
    } catch (e) {
      console.error('Failed to load evangelism plan', e);
    } finally {
      setLoading(false);
    }
  }, [selectedChurch]);

  useEffect(() => {
    setIsEditMode(false);
    load();
  }, [load]);

  const enterEditMode = () => {
    setDraftItems(items.map((i) => ({ id: i.id, title: i.title, content: i.content })));
    setCheckedIdx(new Set());
    setIsEditMode(true);
  };

  const cancelEdit = () => {
    setDraftItems([]);
    setCheckedIdx(new Set());
    setIsEditMode(false);
  };

  const addBlock = () => {
    setDraftItems((prev) => [...prev, { title: '', content: '' }]);
  };

  const toggleChecked = (idx: number) => {
    setCheckedIdx((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  const deleteChecked = async () => {
    if (checkedIdx.size === 0) return;
    const idsToDelete = Array.from(checkedIdx)
      .map((idx) => draftItems[idx]?.id)
      .filter((id): id is number => id != null);

    if (idsToDelete.length > 0) {
      try {
        const res = await api.post<PlanResponse>('/evangelism/plan/delete', {
          church: selectedChurch,
          ids: idsToDelete,
          updatedBy: currentUsername(),
        });
        setItems(res.data.items || []);
        setLastUpdatedAt(res.data.lastUpdatedAt || null);
        setLastUpdatedBy(res.data.lastUpdatedBy || null);
      } catch (e) {
        console.error('Failed to delete evangelism plan items', e);
        alert('삭제 중 오류가 발생했습니다.');
        return;
      }
    }

    setDraftItems((prev) => prev.filter((_, idx) => !checkedIdx.has(idx)));
    setCheckedIdx(new Set());
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await api.post<PlanResponse>('/evangelism/plan/save', {
        church: selectedChurch,
        items: draftItems.map((d) => ({ id: d.id, title: d.title, content: d.content })),
        updatedBy: currentUsername(),
      });
      setItems(res.data.items || []);
      setLastUpdatedAt(res.data.lastUpdatedAt || null);
      setLastUpdatedBy(res.data.lastUpdatedBy || null);
      setDraftItems([]);
      setCheckedIdx(new Set());
      setIsEditMode(false);
    } catch (e) {
      console.error('Failed to save evangelism plan', e);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const cardStyle: React.CSSProperties = {
    background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '16px',
    padding: '20px 24px', marginBottom: '16px', boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
  };
  const labelStyle: React.CSSProperties = { fontSize: '0.85rem', fontWeight: 800, color: '#334155', minWidth: '48px' };
  const inputStyle: React.CSSProperties = {
    flex: 1, padding: '10px 14px', borderRadius: '10px', border: '1px solid #cbd5e1',
    fontSize: '0.92rem', outline: 'none', fontFamily: 'inherit',
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 700 }}>
          최종 수정: {lastUpdatedBy || '-'} · {formatDateTime(lastUpdatedAt)}
        </div>
        {!isEditMode ? (
          <button
            onClick={enterEditMode}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 18px', borderRadius: '10px',
              border: 'none', background: '#2563eb', color: '#ffffff', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer',
            }}
          >
            <Edit3 size={16} /> 수정
          </button>
        ) : (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={addBlock}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#1e293b', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
            >
              <Plus size={16} /> 추가
            </button>
            <button
              onClick={deleteChecked}
              disabled={checkedIdx.size === 0}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', borderRadius: '10px', border: '1px solid #fecaca', background: checkedIdx.size === 0 ? '#fef2f2' : '#fee2e2', color: '#dc2626', fontWeight: 700, fontSize: '0.85rem', cursor: checkedIdx.size === 0 ? 'not-allowed' : 'pointer', opacity: checkedIdx.size === 0 ? 0.6 : 1 }}
            >
              <Trash2 size={16} /> 삭제
            </button>
            <button
              onClick={save}
              disabled={saving}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', borderRadius: '10px', border: 'none', background: '#16a34a', color: '#ffffff', fontWeight: 700, fontSize: '0.85rem', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}
            >
              <Save size={16} /> {saving ? '저장 중...' : '저장'}
            </button>
            <button
              onClick={cancelEdit}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#475569', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
            >
              <X size={16} /> 취소
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ padding: '40px 0', textAlign: 'center', color: '#64748b' }}>불러오는 중...</div>
      ) : !isEditMode ? (
        items.length === 0 ? (
          <div style={{ ...cardStyle, textAlign: 'center', color: '#94a3b8', padding: '40px 24px' }}>
            등록된 계획이 없습니다. 우측 상단 "수정" 버튼으로 추가해 주세요.
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} style={cardStyle}>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>{item.title || '(제목 없음)'}</div>
              <div style={{ fontSize: '0.9rem', color: '#334155', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{item.content}</div>
            </div>
          ))
        )
      ) : (
        <>
          {draftItems.map((d, idx) => (
            <div key={idx} style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
                <input
                  type="checkbox"
                  checked={checkedIdx.has(idx)}
                  onChange={() => toggleChecked(idx)}
                  style={{ width: '18px', height: '18px', marginTop: '10px', cursor: 'pointer', flexShrink: 0 }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                    <span style={labelStyle}>제목</span>
                    <input
                      type="text"
                      value={d.title}
                      onChange={(e) => setDraftItems((prev) => prev.map((it, i) => i === idx ? { ...it, title: e.target.value } : it))}
                      style={inputStyle}
                      placeholder="제목을 입력하세요"
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <span style={labelStyle}>내용</span>
                    <textarea
                      value={d.content}
                      onChange={(e) => setDraftItems((prev) => prev.map((it, i) => i === idx ? { ...it, content: e.target.value } : it))}
                      style={{ ...inputStyle, minHeight: '120px', resize: 'vertical' }}
                      placeholder="내용을 입력하세요"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
          {draftItems.length === 0 && (
            <div style={{ ...cardStyle, textAlign: 'center', color: '#94a3b8', padding: '40px 24px' }}>
              "추가" 버튼을 눌러 계획 항목을 입력해 주세요.
            </div>
          )}
        </>
      )}
    </div>
  );
};
