import React, { useEffect, useState } from 'react';
import { messageService, MessageItem } from '../../services/messageService';
import { Plus, Edit2, Trash2, Search, X, ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE = 25;
const LANG_OPTIONS: { value: string; label: string }[] = [
  { value: 'ko', label: '한국어 (ko)' },
  { value: 'en', label: 'English (en)' },
];

function getCurrentUsername(): string {
  const userStr = localStorage.getItem('user');
  if (!userStr) return 'admin';
  try {
    const u = JSON.parse(userStr);
    return u.username || u.name || 'admin';
  } catch {
    return 'admin';
  }
}

export const AdminMessagePage: React.FC = () => {
  const [items, setItems] = useState<MessageItem[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);

  // Search filters (applied) vs draft inputs
  const [filters, setFilters] = useState({ messageKey: '', langCode: '', messageValue: '', useYn: '' });
  const [draft, setDraft] = useState({ messageKey: '', langCode: '', messageValue: '', useYn: '' });

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [formKey, setFormKey] = useState('');
  const [formLang, setFormLang] = useState('ko');
  const [formValue, setFormValue] = useState('');
  const [formUseYn, setFormUseYn] = useState<'Y' | 'N'>('Y');

  const [notification, setNotification] = useState('');
  const showNotification = (text: string) => {
    setNotification(text);
    setTimeout(() => setNotification(''), 3000);
  };

  const loadMessages = async (targetPage: number, appliedFilters: typeof filters) => {
    setLoading(true);
    try {
      const data = await messageService.search({
        messageKey: appliedFilters.messageKey || undefined,
        langCode: appliedFilters.langCode || undefined,
        messageValue: appliedFilters.messageValue || undefined,
        useYn: appliedFilters.useYn || undefined,
        page: targetPage,
        size: PAGE_SIZE,
      });
      setItems(data.content);
      setTotalElements(data.totalElements);
      setTotalPages(data.totalPages);
      setPage(data.number);
    } catch (e) {
      console.error(e);
      alert('메시지 목록을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages(0, filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters(draft);
    loadMessages(0, draft);
  };

  const handleResetSearch = () => {
    const cleared = { messageKey: '', langCode: '', messageValue: '', useYn: '' };
    setDraft(cleared);
    setFilters(cleared);
    loadMessages(0, cleared);
  };

  const goToPage = (target: number) => {
    if (target < 0 || target >= totalPages || target === page) return;
    loadMessages(target, filters);
  };

  const openCreateModal = () => {
    setModalMode('create');
    setSelectedId(null);
    setFormKey('');
    setFormLang('ko');
    setFormValue('');
    setFormUseYn('Y');
    setIsModalOpen(true);
  };

  const openEditModal = (item: MessageItem) => {
    setModalMode('edit');
    setSelectedId(item.dictId);
    setFormKey(item.messageKey);
    setFormLang(item.langCode);
    setFormValue(item.messageValue);
    setFormUseYn(item.useYn);
    setIsModalOpen(true);
  };

  const handleDelete = async (item: MessageItem) => {
    if (!window.confirm(`정말로 [${item.messageKey} / ${item.langCode}] 메시지를 삭제하시겠습니까?`)) return;
    try {
      await messageService.remove(item.dictId);
      showNotification('메시지가 성공적으로 삭제되었습니다.');
      loadMessages(page, filters);
    } catch (e: any) {
      alert(e.response?.data?.message || e.message || '삭제 실패');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formKey.trim()) {
      alert('메시지 코드를 입력해 주세요.');
      return;
    }
    if (!formValue.trim()) {
      alert('메시지 내용을 입력해 주세요.');
      return;
    }
    const updatedBy = getCurrentUsername();
    try {
      if (modalMode === 'create') {
        await messageService.create({
          messageKey: formKey.trim(),
          langCode: formLang,
          messageValue: formValue,
          useYn: formUseYn,
          updatedBy,
        });
        showNotification('새 메시지가 등록되었습니다.');
      } else if (selectedId != null) {
        await messageService.update(selectedId, { messageValue: formValue, useYn: formUseYn, updatedBy });
        showNotification('메시지가 성공적으로 수정되었습니다.');
      }
      setIsModalOpen(false);
      loadMessages(modalMode === 'create' ? 0 : page, filters);
    } catch (e: any) {
      alert(e.response?.data?.message || e.message || '저장 실패');
    }
  };

  return (
    <div style={{ fontFamily: '"Pretendard", sans-serif', color: '#1f2a44' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            💬 메시지 관리
          </h2>
          <p style={{ color: '#6b7a99', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
            화면에 노출되는 다국어 메시지(메뉴, 라벨 등)를 코드 단위로 등록·관리합니다.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          style={{
            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            padding: '10px 18px',
            fontSize: '0.9rem',
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(37,99,235,0.2)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Plus size={16} /> 새 메시지 추가
        </button>
      </div>

      {notification && (
        <div style={{
          background: '#d1fae5', border: '1px solid #10b981', color: '#065f46',
          padding: '12px 16px', borderRadius: '10px', marginBottom: '16px', fontWeight: 700,
          boxShadow: '0 4px 12px rgba(16,185,129,0.1)'
        }}>
          {notification}
        </div>
      )}

      {/* Search Bar */}
      <form
        onSubmit={handleSearch}
        style={{
          background: '#ffffff', border: '1px solid #e6edf8', borderRadius: '14px',
          padding: '16px 20px', marginBottom: '20px', display: 'flex', alignItems: 'flex-end',
          flexWrap: 'wrap', gap: '14px', boxShadow: '0 2px 8px rgba(20,40,90,0.02)'
        }}
      >
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>메시지 코드</label>
          <input
            type="text"
            placeholder="메시지 코드 검색"
            value={draft.messageKey}
            onChange={(e) => setDraft({ ...draft, messageKey: e.target.value })}
            style={{ padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.85rem', width: '180px', outline: 'none' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>언어</label>
          <select
            value={draft.langCode}
            onChange={(e) => setDraft({ ...draft, langCode: e.target.value })}
            style={{ padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.85rem', width: '150px', outline: 'none', background: 'white' }}
          >
            <option value="">전체</option>
            {LANG_OPTIONS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>메시지 내용</label>
          <input
            type="text"
            placeholder="메시지 내용 검색"
            value={draft.messageValue}
            onChange={(e) => setDraft({ ...draft, messageValue: e.target.value })}
            style={{ padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.85rem', width: '220px', outline: 'none' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', marginBottom: '4px' }}>사용여부</label>
          <select
            value={draft.useYn}
            onChange={(e) => setDraft({ ...draft, useYn: e.target.value })}
            style={{ padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.85rem', width: '110px', outline: 'none', background: 'white' }}
          >
            <option value="">전체</option>
            <option value="Y">Y</option>
            <option value="N">N</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="submit"
            style={{
              display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '8px',
              border: 'none', background: '#2563eb', color: 'white', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer'
            }}
          >
            <Search size={14} /> 검색
          </button>
          <button
            type="button"
            onClick={handleResetSearch}
            style={{
              padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1',
              background: 'white', color: '#475569', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer'
            }}
          >
            초기화
          </button>
        </div>
      </form>

      {/* List Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', fontSize: '0.85rem', color: '#475569', fontWeight: 700 }}>
        <span>메시지 목록</span>
        <span style={{ color: '#cbd5e1' }}>|</span>
        <span>총 <b style={{ color: '#2563eb' }}>{totalElements}</b>건</span>
        <span style={{ color: '#cbd5e1' }}>|</span>
        <span>페이지당 {PAGE_SIZE}개</span>
      </div>

      {/* Table */}
      <div style={{ background: '#ffffff', border: '1px solid #e6edf8', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(20,40,90,0.02)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #cbd5e1', color: '#475569' }}>
                <th style={{ padding: '14px 20px', fontWeight: 800 }}>메시지코드</th>
                <th style={{ padding: '14px 20px', fontWeight: 800, width: '90px' }}>언어</th>
                <th style={{ padding: '14px 20px', fontWeight: 800 }}>메시지내용</th>
                <th style={{ padding: '14px 20px', fontWeight: 800, width: '90px', textAlign: 'center' }}>사용여부</th>
                <th style={{ padding: '14px 20px', fontWeight: 800, width: '130px' }}>최종 수정자</th>
                <th style={{ padding: '14px 20px', fontWeight: 800, width: '170px' }}>최종수정일시</th>
                <th style={{ padding: '14px 20px', fontWeight: 800, textAlign: 'center', width: '110px' }}>관리</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>데이터를 불러오는 중입니다...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>등록된 메시지가 존재하지 않습니다.</td></tr>
              ) : (
                items.map((item) => (
                  <tr key={item.dictId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 20px', fontWeight: 700, color: '#0f172a' }}><code>{item.messageKey}</code></td>
                    <td style={{ padding: '14px 20px', color: '#475569' }}>{item.langCode}</td>
                    <td style={{ padding: '14px 20px', color: '#334155', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>{item.messageValue}</td>
                    <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-block', fontSize: '0.72rem', fontWeight: 800, padding: '3px 10px', borderRadius: '6px',
                        background: item.useYn === 'Y' ? '#dcfce7' : '#fee2e2',
                        color: item.useYn === 'Y' ? '#15803d' : '#b91c1c'
                      }}>
                        {item.useYn}
                      </span>
                    </td>
                    <td style={{ padding: '14px 20px', color: '#475569' }}>{item.updatedBy || '-'}</td>
                    <td style={{ padding: '14px 20px', color: '#64748b', fontSize: '0.8rem' }}>
                      {item.updatedAt ? new Date(item.updatedAt).toLocaleString('ko-KR') : '-'}
                    </td>
                    <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        <button
                          onClick={() => openEditModal(item)}
                          title="수정"
                          style={{ border: '1px solid #cbd5e1', background: 'white', color: '#475569', padding: '6px', borderRadius: '6px', cursor: 'pointer' }}
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          title="삭제"
                          style={{ border: '1px solid #fecaca', background: 'white', color: '#ef4444', padding: '6px', borderRadius: '6px', cursor: 'pointer' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '14px 20px', borderTop: '1px solid #f1f5f9' }}>
            <button
              onClick={() => goToPage(page - 1)}
              disabled={page === 0}
              style={{ border: '1px solid #cbd5e1', background: 'white', borderRadius: '6px', padding: '6px', cursor: page === 0 ? 'default' : 'pointer', opacity: page === 0 ? 0.4 : 1 }}
            >
              <ChevronLeft size={15} />
            </button>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>{page + 1} / {totalPages}</span>
            <button
              onClick={() => goToPage(page + 1)}
              disabled={page >= totalPages - 1}
              style={{ border: '1px solid #cbd5e1', background: 'white', borderRadius: '6px', padding: '6px', cursor: page >= totalPages - 1 ? 'default' : 'pointer', opacity: page >= totalPages - 1 ? 0.4 : 1 }}
            >
              <ChevronRight size={15} />
            </button>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px'
        }}>
          <div style={{ background: 'white', borderRadius: '16px', width: '100%', maxWidth: '520px', boxShadow: '0 20px 40px rgba(0,0,0,0.25)', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #e2e8f0' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                {modalMode === 'create' ? <Plus size={18} color="#2563eb" /> : <Edit2 size={18} color="#2563eb" />}
                {modalMode === 'create' ? '새 메시지 추가' : '메시지 수정'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    메시지 코드 <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    disabled={modalMode === 'edit'}
                    placeholder="예: menu.user.home"
                    value={formKey}
                    onChange={(e) => setFormKey(e.target.value)}
                    style={{
                      width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem',
                      outline: 'none', background: modalMode === 'edit' ? '#f1f5f9' : '#ffffff', color: modalMode === 'edit' ? '#64748b' : '#1f2a44', fontWeight: 700
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    언어 <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    disabled={modalMode === 'edit'}
                    value={formLang}
                    onChange={(e) => setFormLang(e.target.value)}
                    style={{
                      width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem',
                      outline: 'none', background: modalMode === 'edit' ? '#f1f5f9' : '#ffffff', color: modalMode === 'edit' ? '#64748b' : '#1f2a44'
                    }}
                  >
                    {LANG_OPTIONS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    메시지 내용 <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="화면에 표시될 메시지 내용을 입력하세요..."
                    value={formValue}
                    onChange={(e) => setFormValue(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', outline: 'none', color: '#1f2a44', fontFamily: 'inherit', resize: 'vertical' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>사용여부</label>
                  <select
                    value={formUseYn}
                    onChange={(e) => setFormUseYn(e.target.value as 'Y' | 'N')}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.9rem', outline: 'none', background: 'white', color: '#1f2a44' }}
                  >
                    <option value="Y">Y (사용)</option>
                    <option value="N">N (미사용)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '16px 24px', borderTop: '1px solid #e2e8f0' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  취소
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 18px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: '#ffffff', fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer', boxShadow: '0 2px 6px rgba(37,99,235,0.18)' }}
                >
                  저장하기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
