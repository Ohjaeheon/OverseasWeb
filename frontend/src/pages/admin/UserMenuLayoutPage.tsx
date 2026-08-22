import React, { useMemo, useState } from 'react';
import { Save, Check, Plus, Pencil, Trash2, GripVertical, X as XIcon } from 'lucide-react';
import { userMenuLayoutService } from '../../services/userMenuLayoutService';
import { messageService } from '../../services/messageService';
import { useMessageDictionary } from '../../contexts/MessageDictionaryContext';
import {
  USER_MENU_CATALOG,
  SidebarEntry,
  SidebarItem,
  isGroup,
  menuKeyForGroup,
  menuKeyForItem,
  menuKeyForChild
} from '../../components/user/diagnosis/userMenuCatalog';

interface EditorGroup {
  groupLabel: string; // '' = 최상단(그룹 없음) — 홈/캘린더/조직도처럼 그룹 마커 없이 앞에 오는 항목들
  items: SidebarItem[];
}

function flatToGroups(flat: SidebarEntry[]): EditorGroup[] {
  const groups: EditorGroup[] = [];
  let current: EditorGroup = { groupLabel: '', items: [] };
  for (const entry of flat) {
    if (isGroup(entry)) {
      groups.push(current);
      current = { groupLabel: entry.grp, items: [] };
    } else {
      current.items.push(entry);
    }
  }
  groups.push(current);
  return groups.filter((g) => g.groupLabel !== '' || g.items.length > 0);
}

function groupsToFlat(groups: EditorGroup[]): SidebarEntry[] {
  const flat: SidebarEntry[] = [];
  for (const g of groups) {
    if (g.groupLabel) flat.push({ grp: g.groupLabel });
    flat.push(...g.items);
  }
  return flat;
}

function moveArrayItem<T>(arr: T[], from: number, to: number): T[] {
  const copy = [...arr];
  const [moved] = copy.splice(from, 1);
  copy.splice(to, 0, moved);
  return copy;
}

type DragSource =
  | { kind: 'group'; groupIdx: number }
  | { kind: 'item'; groupIdx: number; itemIdx: number }
  | { kind: 'catalog'; item: SidebarItem }
  | { kind: 'child'; groupIdx: number; itemIdx: number; childIdx: number };

type EditingKey =
  | { kind: 'group'; groupIdx: number }
  | { kind: 'item'; groupIdx: number; itemIdx: number }
  | { kind: 'child'; groupIdx: number; itemIdx: number; childIdx: number };

const cardStyle: React.CSSProperties = {
  background: '#ffffff',
  border: '1px solid #e6edf8',
  borderRadius: '14px',
  boxShadow: '0 4px 14px rgba(20, 40, 90, 0.04)'
};

export const UserMenuLayoutPage: React.FC = () => {
  const { getMsg, reload } = useMessageDictionary();
  const [groups, setGroups] = useState<EditorGroup[]>(() => flatToGroups(userMenuLayoutService.getUserMenuLayout()));
  const [saving, setSaving] = useState(false);
  const [dragSource, setDragSource] = useState<DragSource | null>(null);
  const [dropHint, setDropHint] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditingKey | null>(null);
  const [editValue, setEditValue] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpand = (groupIdx: number, itemIdx: number) => {
    const key = `${groupIdx}:${itemIdx}`;
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const usedKeys = useMemo(() => {
    const set = new Set<string>();
    groups.forEach((g) => g.items.forEach((it) => set.add(it.s)));
    return set;
  }, [groups]);

  const catalogUnused = useMemo(
    () => USER_MENU_CATALOG.filter((e): e is SidebarItem => !isGroup(e) && !usedKeys.has(e.s)),
    [usedKeys]
  );

  const groupKeyOf = (label: string) => label.replace(/\s+/g, '');

  const startEditGroup = (groupIdx: number) => {
    const g = groups[groupIdx];
    setEditValue(getMsg(menuKeyForGroup(groupKeyOf(g.groupLabel)), g.groupLabel).replace(/^__/, ''));
    setEditing({ kind: 'group', groupIdx });
  };

  const startEditItem = (groupIdx: number, itemIdx: number) => {
    const it = groups[groupIdx].items[itemIdx];
    setEditValue(getMsg(menuKeyForItem(it), it.label).replace(/^__/, ''));
    setEditing({ kind: 'item', groupIdx, itemIdx });
  };

  const startEditChild = (groupIdx: number, itemIdx: number, childIdx: number) => {
    const ch = groups[groupIdx].items[itemIdx].children![childIdx];
    setEditValue(getMsg(menuKeyForChild(ch), ch.label).replace(/^__/, ''));
    setEditing({ kind: 'child', groupIdx, itemIdx, childIdx });
  };

  const confirmEdit = async () => {
    if (!editing) return;
    const value = editValue.trim();
    if (!value) { setEditing(null); return; }
    try {
      if (editing.kind === 'group') {
        const g = groups[editing.groupIdx];
        await messageService.upsertMessage(menuKeyForGroup(groupKeyOf(g.groupLabel)), 'ko', value, '사용자메뉴');
      } else if (editing.kind === 'item') {
        const it = groups[editing.groupIdx].items[editing.itemIdx];
        await messageService.upsertMessage(menuKeyForItem(it), 'ko', value, '사용자메뉴');
      } else {
        const ch = groups[editing.groupIdx].items[editing.itemIdx].children![editing.childIdx];
        await messageService.upsertMessage(menuKeyForChild(ch), 'ko', value, '사용자메뉴');
      }
      reload();
    } catch (e) {
      alert('이름 저장 중 오류가 발생했습니다.');
    } finally {
      setEditing(null);
    }
  };

  const removeGroup = (groupIdx: number) => {
    const g = groups[groupIdx];
    if (g.items.length > 0 && !window.confirm(`'${g.groupLabel}' 그룹을 삭제하면 안의 ${g.items.length}개 항목은 왼쪽 카탈로그로 돌아갑니다. 계속할까요?`)) return;
    setGroups((prev) => prev.filter((_, i) => i !== groupIdx));
  };

  const removeItem = (groupIdx: number, itemIdx: number) => {
    setGroups((prev) => {
      const next = prev.map((g) => ({ ...g, items: [...g.items] }));
      next[groupIdx].items.splice(itemIdx, 1);
      return next;
    });
  };

  const addGroup = () => {
    const name = window.prompt('새 그룹 이름을 입력하세요.');
    if (!name || !name.trim()) return;
    setGroups((prev) => [...prev, { groupLabel: name.trim(), items: [] }]);
  };

  const dropItemInto = (targetGroupIdx: number, targetItemIdx: number) => {
    if (!dragSource || dragSource.kind === 'group' || dragSource.kind === 'child') return;
    setGroups((prev) => {
      const next = prev.map((g) => ({ ...g, items: [...g.items] }));
      let movedItem: SidebarItem;
      let insertAt = targetItemIdx;
      if (dragSource.kind === 'item') {
        [movedItem] = next[dragSource.groupIdx].items.splice(dragSource.itemIdx, 1);
        if (dragSource.groupIdx === targetGroupIdx && dragSource.itemIdx < targetItemIdx) {
          insertAt -= 1;
        }
      } else {
        movedItem = dragSource.item;
      }
      next[targetGroupIdx].items.splice(insertAt, 0, movedItem);
      return next;
    });
    setDragSource(null);
    setDropHint(null);
  };

  // 하위 메뉴는 소속된 상위 항목과 함께만 이동하므로(상위가 바뀌면 그룹 배치와 별개의 의미가 됨),
  // 같은 상위 항목 안에서의 순서 변경만 허용한다.
  const dropChildInto = (targetGroupIdx: number, targetItemIdx: number, targetChildIdx: number) => {
    if (!dragSource || dragSource.kind !== 'child') return;
    if (dragSource.groupIdx !== targetGroupIdx || dragSource.itemIdx !== targetItemIdx) return;
    setGroups((prev) => {
      const next = prev.map((g) => ({
        ...g,
        items: g.items.map((it) => (it.children ? { ...it, children: [...it.children] } : it))
      }));
      const children = next[targetGroupIdx].items[targetItemIdx].children!;
      let insertAt = targetChildIdx;
      const [moved] = children.splice(dragSource.childIdx, 1);
      if (dragSource.childIdx < targetChildIdx) insertAt -= 1;
      children.splice(insertAt, 0, moved);
      return next;
    });
    setDragSource(null);
    setDropHint(null);
  };

  const dropGroupOnto = (targetGroupIdx: number) => {
    if (!dragSource || dragSource.kind !== 'group') return;
    setGroups((prev) => moveArrayItem(prev, dragSource.groupIdx, targetGroupIdx));
    setDragSource(null);
    setDropHint(null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await userMenuLayoutService.saveUserMenuLayout(groupsToFlat(groups));
      alert('메뉴 배치가 저장되었습니다. 다른 화면에서는 새로고침 후 반영됩니다.');
    } catch (e) {
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const rowLabelInput = (onConfirm: () => void) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }} onClick={(e) => e.stopPropagation()}>
      <input
        autoFocus
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') onConfirm(); if (e.key === 'Escape') setEditing(null); }}
        style={{ flex: 1, padding: '4px 8px', borderRadius: '6px', border: '1px solid #93c5fd', fontSize: '0.85rem' }}
      />
      <button onClick={onConfirm} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#16a34a' }}><Check size={16} /></button>
      <button onClick={() => setEditing(null)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}><XIcon size={16} /></button>
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1f2a44', margin: 0 }}>🗂️ 사용자 포탈 메뉴 배치 관리</h1>
          <p style={{ color: '#6b7a99', fontSize: '0.88rem', margin: '4px 0 0 0' }}>
            일반 사용자 진단서 포탈(상단 메뉴·좌측 서브내비·모바일 전체메뉴)의 그룹/메뉴 순서를 드래그로 바꾸고,
            이름은 항목 옆 ✏️로 바로 수정할 수 있습니다. 왼쪽 카탈로그의 페이지를 오른쪽 그룹으로 끌어다 놓으면 메뉴에 추가됩니다.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: 'white', border: 'none',
            borderRadius: '10px', padding: '10px 20px', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)'
          }}
        >
          {saving ? <Check size={18} /> : <Save size={18} />} {saving ? '저장 중...' : '배치 저장'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* 왼쪽: 카탈로그(미배치 페이지) */}
        <div style={{ ...cardStyle, width: '280px', flexShrink: 0, padding: '16px' }}>
          <div style={{ fontWeight: 800, color: '#1f2a44', marginBottom: '10px', fontSize: '0.95rem' }}>
            📦 카탈로그 (미배치 페이지) — {catalogUnused.length}개
          </div>
          <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: '10px' }}>
            이미 만들어진 사용자 포탈 페이지 중 현재 메뉴에 없는 항목입니다. 드래그해서 오른쪽 그룹에 놓으세요.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minHeight: '40px' }}>
            {catalogUnused.map((it) => (
              <div
                key={it.s}
                draggable
                onDragStart={() => setDragSource({ kind: 'catalog', item: it })}
                onDragEnd={() => { setDragSource(null); setDropHint(null); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px',
                  borderRadius: '8px', background: '#f8fafc', border: '1px dashed #cbd5e1',
                  cursor: 'grab', fontSize: '0.85rem', color: '#334155'
                }}
              >
                <GripVertical size={14} color="#94a3b8" />
                <span>{it.ico}</span>
                <span>{getMsg(menuKeyForItem(it), it.label).replace(/^__/, '')}</span>
              </div>
            ))}
            {catalogUnused.length === 0 && (
              <div style={{ fontSize: '0.8rem', color: '#cbd5e1', padding: '8px' }}>모든 페이지가 배치되어 있습니다.</div>
            )}
          </div>
        </div>

        {/* 오른쪽: 현재 배치 */}
        <div style={{ flex: 1, minWidth: '360px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {groups.map((g, groupIdx) => (
            <div
              key={groupIdx}
              style={{
                ...cardStyle,
                padding: '14px 16px',
                outline: dropHint === `group-${groupIdx}` ? '2px dashed #2563eb' : 'none'
              }}
              onDragOver={(e) => { e.preventDefault(); if (dragSource) setDropHint(`group-${groupIdx}`); }}
              onDragLeave={() => setDropHint(null)}
              onDrop={(e) => {
                e.preventDefault();
                if (dragSource?.kind === 'group') dropGroupOnto(groupIdx);
                else dropItemInto(groupIdx, g.items.length);
              }}
            >
              <div
                draggable={g.groupLabel !== ''}
                onDragStart={() => g.groupLabel !== '' && setDragSource({ kind: 'group', groupIdx })}
                onDragEnd={() => { setDragSource(null); setDropHint(null); }}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', cursor: g.groupLabel ? 'grab' : 'default' }}
              >
                {g.groupLabel && <GripVertical size={16} color="#94a3b8" />}
                {editing?.kind === 'group' && editing.groupIdx === groupIdx ? (
                  rowLabelInput(confirmEdit)
                ) : (
                  <>
                    <span style={{ fontWeight: 800, color: g.groupLabel ? '#1f2a44' : '#94a3b8', fontSize: '0.85rem', textTransform: g.groupLabel ? 'uppercase' : 'none' }}>
                      {g.groupLabel ? getMsg(menuKeyForGroup(groupKeyOf(g.groupLabel)), g.groupLabel).replace(/^__/, '') : '최상단 (그룹 없음)'}
                    </span>
                    {g.groupLabel && (
                      <>
                        <button onClick={() => startEditGroup(groupIdx)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}><Pencil size={13} /></button>
                        <button onClick={() => removeGroup(groupIdx)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444', marginLeft: 'auto' }}><Trash2 size={14} /></button>
                      </>
                    )}
                  </>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {g.items.map((it, itemIdx) => {
                  const hasChildren = !!it.children && it.children.length > 0;
                  const expandKey = `${groupIdx}:${itemIdx}`;
                  const isExpanded = expandedItems.has(expandKey);
                  return (
                    <div key={it.s || itemIdx}>
                      <div
                        draggable
                        onDragStart={() => setDragSource({ kind: 'item', groupIdx, itemIdx })}
                        onDragEnd={() => { setDragSource(null); setDropHint(null); }}
                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); if (dragSource) setDropHint(`item-${groupIdx}-${itemIdx}`); }}
                        onDrop={(e) => { e.preventDefault(); e.stopPropagation(); dropItemInto(groupIdx, itemIdx); }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px',
                          borderRadius: '8px', cursor: 'grab', fontSize: '0.87rem', color: '#334155',
                          background: dropHint === `item-${groupIdx}-${itemIdx}` ? '#eff6ff' : 'transparent',
                          border: dropHint === `item-${groupIdx}-${itemIdx}` ? '1px dashed #2563eb' : '1px solid transparent'
                        }}
                      >
                        <GripVertical size={14} color="#cbd5e1" />
                        <span>{it.ico}</span>
                        {editing?.kind === 'item' && editing.groupIdx === groupIdx && editing.itemIdx === itemIdx ? (
                          rowLabelInput(confirmEdit)
                        ) : (
                          <>
                            <span style={{ flex: 1 }}>{getMsg(menuKeyForItem(it), it.label).replace(/^__/, '')}</span>
                            {hasChildren && (
                              <button
                                onClick={() => toggleExpand(groupIdx, itemIdx)}
                                style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.72rem', color: '#2563eb', fontWeight: 700 }}
                              >
                                {isExpanded ? '▾' : '▸'} 하위 {it.children!.length}개
                              </button>
                            )}
                            <button onClick={() => startEditItem(groupIdx, itemIdx)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}><Pencil size={13} /></button>
                            <button onClick={() => removeItem(groupIdx, itemIdx)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444' }}><Trash2 size={14} /></button>
                          </>
                        )}
                      </div>

                      {hasChildren && isExpanded && (
                        <div
                          style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginLeft: '30px', marginTop: '2px' }}
                          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                          onDrop={(e) => { e.preventDefault(); e.stopPropagation(); dropChildInto(groupIdx, itemIdx, it.children!.length); }}
                        >
                          {it.children!.map((ch, childIdx) => (
                            <div
                              key={childIdx}
                              draggable
                              onDragStart={() => setDragSource({ kind: 'child', groupIdx, itemIdx, childIdx })}
                              onDragEnd={() => { setDragSource(null); setDropHint(null); }}
                              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); if (dragSource) setDropHint(`child-${groupIdx}-${itemIdx}-${childIdx}`); }}
                              onDrop={(e) => { e.preventDefault(); e.stopPropagation(); dropChildInto(groupIdx, itemIdx, childIdx); }}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px',
                                borderRadius: '8px', cursor: 'grab', fontSize: '0.82rem', color: '#475569',
                                background: dropHint === `child-${groupIdx}-${itemIdx}-${childIdx}` ? '#eff6ff' : 'transparent',
                                border: dropHint === `child-${groupIdx}-${itemIdx}-${childIdx}` ? '1px dashed #2563eb' : '1px solid transparent'
                              }}
                            >
                              <GripVertical size={12} color="#cbd5e1" />
                              {editing?.kind === 'child' && editing.groupIdx === groupIdx && editing.itemIdx === itemIdx && editing.childIdx === childIdx ? (
                                rowLabelInput(confirmEdit)
                              ) : (
                                <>
                                  <span style={{ flex: 1 }}>• {getMsg(menuKeyForChild(ch), ch.label).replace(/^__/, '')}</span>
                                  <button onClick={() => startEditChild(groupIdx, itemIdx, childIdx)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}><Pencil size={12} /></button>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
                {g.items.length === 0 && (
                  <div style={{ fontSize: '0.8rem', color: '#cbd5e1', padding: '10px', border: '1px dashed #e2e8f0', borderRadius: '8px', textAlign: 'center' }}>
                    여기로 항목을 드래그해서 놓으세요
                  </div>
                )}
              </div>
            </div>
          ))}

          <button
            onClick={addGroup}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              padding: '12px', borderRadius: '10px', border: '1px dashed #93c5fd', background: '#f8fafc',
              color: '#2563eb', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer'
            }}
          >
            <Plus size={16} /> 새 그룹 추가
          </button>
        </div>
      </div>
    </div>
  );
};
