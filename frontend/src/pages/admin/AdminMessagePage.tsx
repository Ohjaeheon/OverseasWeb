import React, { useEffect, useState } from 'react';
import { adminService } from '../../services/adminService';
import { Save, Plus, Edit2, Trash2, Search, X, HelpCircle, FileText, Settings } from 'lucide-react';

interface ConfigItem {
  configId: number;
  configKey: string;
  configValue: string;
  description: string;
  updatedAt?: string;
}

export const AdminMessagePage: React.FC = () => {
  const [configs, setConfigs] = useState<ConfigItem[]>([]);
  const [filteredConfigs, setFilteredConfigs] = useState<ConfigItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlyHelp, setShowOnlyHelp] = useState(true);

  // Modal controls
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  
  // Form states
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [formKey, setFormKey] = useState('');
  const [formValue, setFormValue] = useState('');
  const [formDesc, setFormDesc] = useState('');

  const [notification, setNotification] = useState('');

  const showNotification = (text: string) => {
    setNotification(text);
    setTimeout(() => setNotification(''), 3000);
  };

  const loadConfigs = async () => {
    setLoading(true);
    try {
      const data = await adminService.getConfigs();
      setConfigs(data);
    } catch (e: any) {
      console.error(e);
      alert('설정 데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfigs();
  }, []);

  useEffect(() => {
    let result = configs;
    if (showOnlyHelp) {
      result = result.filter(c => c.configKey.startsWith('DESC_'));
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c => 
        c.configKey.toLowerCase().includes(q) || 
        (c.description && c.description.toLowerCase().includes(q)) || 
        (c.configValue && c.configValue.toLowerCase().includes(q))
      );
    }
    setFilteredConfigs(result);
  }, [configs, showOnlyHelp, searchQuery]);

  const openCreateModal = () => {
    setModalMode('create');
    setSelectedId(null);
    setFormKey('DESC_');
    setFormValue('');
    setFormDesc('');
    setIsModalOpen(true);
  };

  const openEditModal = (item: ConfigItem) => {
    setModalMode('edit');
    setSelectedId(item.configId);
    setFormKey(item.configKey);
    setFormValue(item.configValue);
    setFormDesc(item.description || '');
    setIsModalOpen(true);
  };

  const handleDelete = async (item: ConfigItem) => {
    if (!window.confirm(`정말로 [${item.configKey}] 설정을 삭제하시겠습니까?`)) return;
    try {
      await adminService.deleteConfig(item.configId);
      showNotification('설정이 성공적으로 삭제되었습니다.');
      loadConfigs();
    } catch (e: any) {
      alert(e.message || '삭제 실패');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formKey.trim()) {
      alert('코드 키를 입력해 주세요.');
      return;
    }
    try {
      await adminService.updateConfig(formKey.trim(), formValue, formDesc.trim());
      showNotification(modalMode === 'create' ? '새 설정이 추가되었습니다.' : '설정이 성공적으로 수정되었습니다.');
      setIsModalOpen(false);
      loadConfigs();
    } catch (e: any) {
      alert(e.message || '저장 실패');
    }
  };

  return (
    <div style={{ fontFamily: '"Pretendard", sans-serif', color: '#1f2a44' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            💬 시스템 메세지 및 도움말 관리
          </h2>
          <p style={{ color: '#6b7a99', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
            도움말 설명(?) 메시지 코드 및 일반 시스템 설정을 테이블로 한눈에 보고 유연하게 추가/수정합니다.
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
            transition: 'transform 0.15s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
        >
          <Plus size={16} /> 새 메세지 설정 추가
        </button>
      </div>

      {notification && (
        <div style={{
          background: '#d1fae5',
          border: '1px solid #10b981',
          color: '#065f46',
          padding: '12px 16px',
          borderRadius: '10px',
          marginBottom: '16px',
          fontWeight: 700,
          boxShadow: '0 4px 12px rgba(16,185,129,0.1)'
        }}>
          {notification}
        </div>
      )}

      {/* Filter / Search Bar */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e6edf8',
        borderRadius: '14px',
        padding: '16px 20px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        boxShadow: '0 2px 8px rgba(20,40,90,0.02)'
      }}>
        {/* Toggle options */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setShowOnlyHelp(true)}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: showOnlyHelp ? 'none' : '1px solid #cbd5e1',
              background: showOnlyHelp ? '#eef3ff' : '#ffffff',
              color: showOnlyHelp ? '#2563eb' : '#64748b',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            ℹ️ 도움말 메시지만 보기 (DESC_*)
          </button>
          <button
            onClick={() => setShowOnlyHelp(false)}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: !showOnlyHelp ? 'none' : '1px solid #cbd5e1',
              background: !showOnlyHelp ? '#eef3ff' : '#ffffff',
              color: !showOnlyHelp ? '#2563eb' : '#64748b',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            ⚙️ 전체 시스템 설정 보기
          </button>
        </div>

        {/* Search Input */}
        <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '6px 12px', width: '280px' }}>
          <Search size={16} color="#94a3b8" style={{ marginRight: '8px' }} />
          <input
            type="text"
            placeholder="코드(Key), 설명, 내용 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.85rem', width: '100%', color: '#1f2a44' }}
          />
          {searchQuery && (
            <X size={15} color="#94a3b8" style={{ cursor: 'pointer' }} onClick={() => setSearchQuery('')} />
          )}
        </div>
      </div>

      {/* Config Grid Table */}
      <div style={{ background: '#ffffff', border: '1px solid #e6edf8', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(20,40,90,0.02)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #cbd5e1', color: '#475569' }}>
                <th style={{ padding: '14px 20px', fontWeight: 800 }}>구분</th>
                <th style={{ padding: '14px 20px', fontWeight: 800 }}>코드 (Key)</th>
                <th style={{ padding: '14px 20px', fontWeight: 800 }}>설명</th>
                <th style={{ padding: '14px 20px', fontWeight: 800, width: '40%' }}>내용 (Value)</th>
                <th style={{ padding: '14px 20px', fontWeight: 800, textAlign: 'center', width: '130px' }}>관리</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                    데이터를 불러오는 중입니다...
                  </td>
                </tr>
              ) : filteredConfigs.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                    등록된 메세지/설정이 존재하지 않습니다.
                  </td>
                </tr>
              ) : (
                filteredConfigs.map((item) => {
                  const isHelp = item.configKey.startsWith('DESC_');
                  return (
                    <tr key={item.configId} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.1s' }} onMouseEnter={(e) => e.currentTarget.style.background = '#fcfdfe'} onMouseLeave={(e) => e.currentTarget.style.background = 'none'}>
                      <td style={{ padding: '14px 20px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: isHelp ? '#eff6ff' : '#f1f5f9',
                          color: isHelp ? '#1e40af' : '#475569'
                        }}>
                          {isHelp ? <HelpCircle size={11} /> : <Settings size={11} />}
                          {isHelp ? '도움말' : '시스템'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px', fontWeight: 700, color: '#0f172a' }}>
                        <code>{item.configKey}</code>
                      </td>
                      <td style={{ padding: '14px 20px', color: '#475569', fontWeight: 500 }}>
                        {item.description || <span style={{ color: '#cbd5e1' }}>설명 없음</span>}
                      </td>
                      <td style={{ padding: '14px 20px', color: '#334155', whiteSpace: 'pre-wrap', wordBreak: 'break-all', lineHeight: 1.45 }}>
                        {item.configValue}
                      </td>
                      <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          <button
                            onClick={() => openEditModal(item)}
                            title="수정"
                            style={{
                              border: '1px solid #cbd5e1',
                              background: 'white',
                              color: '#475569',
                              padding: '6px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.15s'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#2563eb'; e.currentTarget.style.color = '#2563eb'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#475569'; }}
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
                            title="삭제"
                            style={{
                              border: '1px solid #fecaca',
                              background: 'white',
                              color: '#ef4444',
                              padding: '6px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.15s'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = '#fef2f2'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'white'; }}
                          >
                            <Trash2 size={13} />
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
      </div>

      {/* Create / Edit Modal Dialog */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '520px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
            border: '1px solid #e2e8f0',
            animation: 'fadeIn 0.15s ease'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', borderBottom: '1px solid #e2e8f0' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                {modalMode === 'create' ? <Plus size={18} color="#2563eb" /> : <Edit2 size={18} color="#2563eb" />}
                {modalMode === 'create' ? '새 설정 메세지 추가' : '설정 메세지 수정'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit}>
              <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    설정 코드 Key <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    disabled={modalMode === 'edit'}
                    placeholder="예: DESC_NEW_MESSAGE"
                    value={formKey}
                    onChange={(e) => setFormKey(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      fontSize: '0.9rem',
                      outline: 'none',
                      background: modalMode === 'edit' ? '#f1f5f9' : '#ffffff',
                      color: modalMode === 'edit' ? '#64748b' : '#1f2a44',
                      fontWeight: 700
                    }}
                  />
                  {modalMode === 'create' && (
                    <p style={{ fontSize: '0.72rem', color: '#6b7a99', margin: '4px 0 0 0' }}>
                      도움말 안내용 키인 경우 반드시 <strong>DESC_</strong>로 시작해야 합니다.
                    </p>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    설명 (Description) <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="예: (2) 찾기 상세분석 도움말 설명"
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      fontSize: '0.9rem',
                      outline: 'none',
                      color: '#1f2a44'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    내용 (Value) <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="메시지 내용이나 설정값을 입력하세요..."
                    value={formValue}
                    onChange={(e) => setFormValue(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      fontSize: '0.9rem',
                      outline: 'none',
                      color: '#1f2a44',
                      fontFamily: 'inherit',
                      resize: 'vertical'
                    }}
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '16px 24px', borderTop: '1px solid #e2e8f0' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#475569',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  취소
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 18px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                    color: '#ffffff',
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(37,99,235,0.18)'
                  }}
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
