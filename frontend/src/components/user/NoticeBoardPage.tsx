import React, { useEffect, useState } from 'react';
import { Megaphone, Plus, Paperclip, Download, Pencil, Trash2, X, Eye } from 'lucide-react';
import api from '../../services/api';

interface NoticeAttachment {
  id: number;
  fileName: string;
  fileSize: number;
}

interface NoticePost {
  id: number;
  title: string;
  content: string;
  author: string;
  createdAt: string | null;
  viewCount: number;
  noticeType: 'MUST_READ' | 'NOTICE' | 'GENERAL';
  attachments: NoticeAttachment[];
}

const NOTICE_TYPE_LABELS: Record<NoticePost['noticeType'], string> = {
  MUST_READ: '필독', NOTICE: '공지', GENERAL: '일반',
};
const NOTICE_TYPE_COLORS: Record<NoticePost['noticeType'], { bg: string; color: string }> = {
  MUST_READ: { bg: '#fee2e2', color: '#dc2626' },
  NOTICE: { bg: '#dbeafe', color: '#2563eb' },
  GENERAL: { bg: '#f1f5f9', color: '#64748b' },
};

function getCurrentUser(): { username?: string; role?: string } {
  try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; }
}
function isAdminUser(role?: string): boolean {
  return role === 'ROLE_ADMIN' || role === 'ADMIN' || role === '관리자' || role === 'ROLE_관리자';
}
function formatDate(iso: string | null): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '-';
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

const btnPrimary: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, border: 'none',
  background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: '#fff', fontWeight: 800, fontSize: 13.5, cursor: 'pointer',
};
const btnGhost: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 9, border: '1.5px solid #e2e8f0',
  background: '#fff', color: '#475569', fontWeight: 700, fontSize: 13, cursor: 'pointer',
};

export const NoticeBoardPage: React.FC = () => {
  const currentUser = getCurrentUser();
  const isAdmin = isAdminUser(currentUser.role);

  const [posts, setPosts] = useState<NoticePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<NoticePost | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<NoticePost | null>(null);

  const [fTitle, setFTitle] = useState('');
  const [fContent, setFContent] = useState('');
  const [fType, setFType] = useState<NoticePost['noticeType']>('NOTICE');
  const [fFiles, setFFiles] = useState<File[]>([]);
  const [fDeleteAttIds, setFDeleteAttIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    api.get<NoticePost[]>('/notices')
      .then((res) => setPosts(res.data))
      .catch((e) => console.warn('공지사항 목록 조회 실패', e))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openDetail = (post: NoticePost) => {
    api.get<NoticePost>(`/notices/${post.id}`)
      .then((res) => { setSelected(res.data); load(); })
      .catch(() => setSelected(post));
  };

  const openWrite = () => {
    setEditing(null); setFTitle(''); setFContent(''); setFType('NOTICE'); setFFiles([]); setFDeleteAttIds([]);
    setIsFormOpen(true);
  };
  const openEdit = (post: NoticePost) => {
    setEditing(post); setFTitle(post.title); setFContent(post.content); setFType(post.noticeType);
    setFFiles([]); setFDeleteAttIds([]);
    setIsFormOpen(true); setSelected(null);
  };

  const handleDelete = async (post: NoticePost) => {
    if (!window.confirm(`"${post.title}" 공지사항을 삭제하시겠습니까?`)) return;
    try {
      await api.delete(`/notices/${post.id}`);
      setSelected(null);
      load();
    } catch (e) {
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  const handleSave = async () => {
    if (!fTitle.trim()) { alert('제목을 입력해 주세요.'); return; }
    if (!fContent.trim()) { alert('내용을 입력해 주세요.'); return; }
    const formData = new FormData();
    formData.append('title', fTitle.trim());
    formData.append('content', fContent);
    formData.append('noticeType', fType);
    fFiles.forEach((f) => formData.append('files', f));
    fDeleteAttIds.forEach((id) => formData.append('deleteAttachmentIds', String(id)));

    setSaving(true);
    try {
      if (editing) {
        await api.post(`/notices/${editing.id}/edit`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        await api.post('/notices/write', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      setIsFormOpen(false);
      load();
    } catch (e) {
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = (att: NoticeAttachment) => {
    api.get(`/notices/attachment/${att.id}/download`, { responseType: 'blob' })
      .then((res) => {
        const url = window.URL.createObjectURL(new Blob([res.data]));
        const link = document.createElement('a');
        link.href = url; link.setAttribute('download', att.fileName);
        document.body.appendChild(link); link.click(); link.remove();
        window.URL.revokeObjectURL(url);
      })
      .catch(() => alert('파일 다운로드 중 오류가 발생했습니다.'));
  };

  return (
    <div>
      <div className="sechead">
        <Megaphone size={22} /> 공지사항
      </div>
      <div className="secsub">해외선교부 업무포탈의 공지사항을 확인합니다.</div>

      {isAdmin && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <button style={btnPrimary} onClick={openWrite}><Plus size={15} /> 공지 작성</button>
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--muted)' }}>불러오는 중...</div>
        ) : posts.length === 0 ? (
          <div style={{ padding: '50px 0', textAlign: 'center', color: 'var(--muted)' }}>등록된 공지사항이 없습니다.</div>
        ) : (
          posts.map((p) => (
            <div
              key={p.id}
              onClick={() => openDetail(p)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px',
                borderBottom: '1px solid #f1f5f9', cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: 11.5, fontWeight: 800, padding: '3px 9px', borderRadius: 6, flexShrink: 0, background: NOTICE_TYPE_COLORS[p.noticeType].bg, color: NOTICE_TYPE_COLORS[p.noticeType].color }}>
                {NOTICE_TYPE_LABELS[p.noticeType]}
              </span>
              <div style={{ flex: 1, minWidth: 0, fontWeight: 700, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {p.title}
                {p.attachments.length > 0 && <Paperclip size={12} style={{ marginLeft: 6, verticalAlign: -1, color: 'var(--muted)' }} />}
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--muted)', flexShrink: 0 }}>{p.author}</div>
              <div style={{ fontSize: 12.5, color: 'var(--muted)', flexShrink: 0 }}>{formatDate(p.createdAt)}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 3 }}><Eye size={12} /> {p.viewCount}</div>
            </div>
          ))
        )}
      </div>

      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16 }} onClick={() => setSelected(null)}>
          <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 620, maxHeight: '85vh', overflowY: 'auto', padding: 26 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 6 }}>
              <div>
                <span style={{ fontSize: 11.5, fontWeight: 800, padding: '3px 9px', borderRadius: 6, background: NOTICE_TYPE_COLORS[selected.noticeType].bg, color: NOTICE_TYPE_COLORS[selected.noticeType].color }}>
                  {NOTICE_TYPE_LABELS[selected.noticeType]}
                </span>
                <h2 style={{ margin: '10px 0 4px', fontSize: 19, fontWeight: 800, color: 'var(--ink)' }}>{selected.title}</h2>
                <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{selected.author} · {formatDate(selected.createdAt)} · 조회 {selected.viewCount}</div>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}><X size={20} /></button>
            </div>
            <div style={{ marginTop: 16, fontSize: 14, lineHeight: 1.7, color: 'var(--txt)', whiteSpace: 'pre-wrap' }}>{selected.content}</div>

            {selected.attachments.length > 0 && (
              <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {selected.attachments.map((att) => (
                  <button key={att.id} onClick={() => handleDownload(att)} style={{ ...btnGhost, justifyContent: 'flex-start', width: '100%' }}>
                    <Paperclip size={14} /> {att.fileName} <span style={{ marginLeft: 'auto', color: 'var(--muted)', fontWeight: 600, fontSize: 12 }}>{formatFileSize(att.fileSize)}</span> <Download size={14} />
                  </button>
                ))}
              </div>
            )}

            {isAdmin && (
              <div style={{ display: 'flex', gap: 8, marginTop: 20, justifyContent: 'flex-end' }}>
                <button style={btnGhost} onClick={() => openEdit(selected)}><Pencil size={14} /> 수정</button>
                <button style={{ ...btnGhost, color: '#ef4444', borderColor: '#fecaca' }} onClick={() => handleDelete(selected)}><Trash2 size={14} /> 삭제</button>
              </div>
            )}
          </div>
        </div>
      )}

      {isFormOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16 }} onClick={() => setIsFormOpen(false)}>
          <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 560, maxHeight: '85vh', overflowY: 'auto', padding: 26 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: 'var(--ink)' }}>{editing ? '공지사항 수정' : '공지사항 작성'}</h3>
              <button onClick={() => setIsFormOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}><X size={20} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>구분</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(Object.keys(NOTICE_TYPE_LABELS) as NoticePost['noticeType'][]).map((t) => (
                    <button key={t} onClick={() => setFType(t)}
                      style={{ padding: '7px 14px', borderRadius: 8, cursor: 'pointer', border: fType === t ? 'none' : '1.5px solid #e2e8f0', background: fType === t ? NOTICE_TYPE_COLORS[t].color : '#f8fafc', color: fType === t ? '#fff' : NOTICE_TYPE_COLORS[t].color, fontWeight: 800, fontSize: 12.5 }}>
                      {NOTICE_TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>제목</label>
                <input type="text" value={fTitle} onChange={(e) => setFTitle(e.target.value)} placeholder="제목을 입력하세요"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 9, border: '1.4px solid var(--line)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>내용</label>
                <textarea value={fContent} onChange={(e) => setFContent(e.target.value)} placeholder="내용을 입력하세요" rows={8}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 9, border: '1.4px solid var(--line)', fontSize: 13.5, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', resize: 'vertical' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>첨부파일</label>
                <input type="file" multiple onChange={(e) => setFFiles(Array.from(e.target.files || []))} style={{ fontSize: 13 }} />
                {editing && editing.attachments.length > 0 && (
                  <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {editing.attachments.filter((a) => !fDeleteAttIds.includes(a.id)).map((att) => (
                      <div key={att.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--muted)' }}>
                        <Paperclip size={12} /> {att.fileName}
                        <button onClick={() => setFDeleteAttIds((prev) => [...prev, att.id])} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 12 }}>삭제</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
              <button style={btnGhost} onClick={() => setIsFormOpen(false)}>취소</button>
              <button style={btnPrimary} onClick={handleSave} disabled={saving}>{saving ? '저장 중...' : (editing ? '수정 완료' : '등록')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
