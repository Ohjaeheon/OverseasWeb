import React, { useState, useEffect } from 'react';
import { roleService, RoleDefinition, MenuPermission } from '../../services/roleService';
import { Save, Check, Lock, Shield, Monitor, Settings } from 'lucide-react';

export const AdminPermissionPage: React.FC = () => {
  const [roles, setRoles] = useState<RoleDefinition[]>([]);
  const [menus, setMenus] = useState<MenuPermission[]>([]);
  const [saving, setSaving] = useState<boolean>(false);

  const loadData = () => {
    const activeRoles = roleService.getRoles();
    const activePermissions = roleService.getMenuPermissions();
    setRoles(activeRoles);
    setMenus(activePermissions);
  };

  useEffect(() => {
    loadData();
  }, []);

  const togglePermission = (menuIndex: number, roleId: string, type: 'read' | 'write') => {
    // Admin always has full access
    if (roleId === 'ROLE_ADMIN') return;

    const newMenus = [...menus];
    const current = newMenus[menuIndex].permissions[roleId] || { read: false, write: false };
    const updated = { ...current, [type]: !current[type] };

    // If write is enabled, read must also be enabled
    if (type === 'write' && updated.write) {
      updated.read = true;
    }
    // If read is disabled, write must also be disabled
    if (type === 'read' && !updated.read) {
      updated.write = false;
    }

    newMenus[menuIndex].permissions[roleId] = updated;
    setMenus(newMenus);
  };

  const handleSave = () => {
    setSaving(true);
    roleService.saveMenuPermissions(menus);
    setTimeout(() => {
      setSaving(false);
      alert("권한별 메뉴 접근 설정이 성공적으로 저장되었습니다.");
    }, 400);
  };

  // Helper to distinguish Admin Portal menus from User Portal menus
  const isAdminMenu = (menu: MenuPermission) => {
    return menu.category.includes('관리자') ||
           menu.category.includes('adminsetting') ||
           menu.path.startsWith('/adminsetting') ||
           menu.menuKey.startsWith('admin_') ||
           ['users', 'roles', 'perm', 'i18n', 'sys', 'login_logs', 'access_logs'].includes(menu.menuKey);
  };

  // Group menus by User Portal vs Admin Portal
  const userPortalMenus = menus.filter(m => !isAdminMenu(m));
  const adminPortalMenus = menus.filter(m => isAdminMenu(m));

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1f2a44', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            🔑 권한별 접근 메뉴 설정 (Permission Matrix)
          </h1>
          <p style={{ color: '#6b7a99', fontSize: '0.88rem', margin: '4px 0 0 0' }}>
            일반 사용자 진단서 포탈 메뉴와 관리자 전용(adminsetting) 포탈 메뉴를 명확히 구분하여 권한별 접근 허용(조회/수정)을 설정합니다.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            padding: '10px 20px',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)'
          }}
        >
          {saving ? <Check size={18} /> : <Save size={18} />} {saving ? '저장 완료' : '설정 저장'}
        </button>
      </div>

      {/* Distinction Info Badges */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', padding: '10px 16px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Monitor size={18} color="#059669" />
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#047857' }}>
            🖥️ 일반 사용자 진단서 포탈 메뉴 ({userPortalMenus.length}개)
          </span>
        </div>

        <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', padding: '10px 16px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Settings size={18} color="#7c3aed" />
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#6d28d9' }}>
            ⚙️ 관리자 전용 (adminsetting) 포탈 메뉴 ({adminPortalMenus.length}개)
          </span>
        </div>
      </div>

      {/* Permission Matrix Table */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e6edf8',
        borderRadius: '16px',
        overflowX: 'auto',
        boxShadow: '0 4px 14px rgba(20, 40, 90, 0.04)'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '0.88rem', minWidth: '850px' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
              <th style={{ padding: '16px 20px', textAlign: 'left', fontWeight: 700, minWidth: '260px' }}>메뉴 항목 및 포탈 구분</th>
              {roles.map((r) => (
                <th key={r.roleId} style={{ padding: '16px 14px', fontWeight: 700 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', color: '#1f2a44' }}>
                    <Shield size={14} color="#2563eb" /> {r.roleName}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#2563eb', fontWeight: 600, marginTop: '2px', fontFamily: 'monospace' }}>
                    ({r.roleId})
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 500, marginTop: '2px' }}>
                    조회 · 수정
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* 1. USER PORTAL MENUS SECTION HEADER */}
            <tr style={{ background: '#ecfdf5', borderBottom: '1px solid #a7f3d0' }}>
              <td colSpan={roles.length + 1} style={{ padding: '10px 20px', textAlign: 'left', fontWeight: 800, color: '#047857', fontSize: '0.85rem' }}>
                🖥️ 일반 사용자 진단서 포탈 메뉴 목록 (http://localhost:3000/OverseasPortal)
              </td>
            </tr>

            {menus.map((menu, mIdx) => {
              if (isAdminMenu(menu)) return null;
              return (
                <tr key={menu.menuKey} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s ease' }}>
                  <td style={{ padding: '14px 20px', textAlign: 'left', fontWeight: 700, color: '#1f2a44' }}>
                    {menu.menuName}
                    <span style={{ display: 'inline-block', marginLeft: '8px', fontSize: '0.72rem', background: '#d1fae5', color: '#047857', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                      일반 사용자 포탈
                    </span>
                  </td>

                  {roles.map((r) => {
                    const perm = menu.permissions[r.roleId] || { read: false, write: false };
                    const isAdmin = r.roleId === 'ROLE_ADMIN';

                    return (
                      <td key={r.roleId} style={{ padding: '14px 12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '3px', cursor: isAdmin ? 'not-allowed' : 'pointer', fontSize: '0.78rem', color: perm.read ? '#2563eb' : '#94a3b8', fontWeight: perm.read ? 700 : 500 }}>
                            <input
                              type="checkbox"
                              disabled={isAdmin}
                              checked={perm.read}
                              onChange={() => togglePermission(mIdx, r.roleId, 'read')}
                              style={{ cursor: isAdmin ? 'not-allowed' : 'pointer', accentColor: '#2563eb' }}
                            />
                            조회
                          </label>

                          <label style={{ display: 'flex', alignItems: 'center', gap: '3px', cursor: isAdmin ? 'not-allowed' : 'pointer', fontSize: '0.78rem', color: perm.write ? '#16a34a' : '#94a3b8', fontWeight: perm.write ? 700 : 500 }}>
                            <input
                              type="checkbox"
                              disabled={isAdmin}
                              checked={perm.write}
                              onChange={() => togglePermission(mIdx, r.roleId, 'write')}
                              style={{ cursor: isAdmin ? 'not-allowed' : 'pointer', accentColor: '#16a34a' }}
                            />
                            수정
                          </label>

                          {isAdmin && <span title="관리자는 항상 전체 권한 부여"><Lock size={12} color="#94a3b8" /></span>}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}

            {/* 2. ADMINSETTING PORTAL MENUS SECTION HEADER */}
            <tr style={{ background: '#f5f3ff', borderBottom: '1px solid #ddd6fe', borderTop: '2px solid #e2e8f0' }}>
              <td colSpan={roles.length + 1} style={{ padding: '10px 20px', textAlign: 'left', fontWeight: 800, color: '#6d28d9', fontSize: '0.85rem' }}>
                ⚙️ 관리자 전용 포탈 메뉴 목록 (http://localhost:3000/OverseasPortal/adminsetting/*)
              </td>
            </tr>

            {menus.map((menu, mIdx) => {
              if (!isAdminMenu(menu)) return null;
              return (
                <tr key={menu.menuKey} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s ease' }}>
                  <td style={{ padding: '14px 20px', textAlign: 'left', fontWeight: 700, color: '#1f2a44' }}>
                    {menu.menuName}
                    <span style={{ display: 'inline-block', marginLeft: '8px', fontSize: '0.72rem', background: '#ede9fe', color: '#6d28d9', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                      adminsetting 전용
                    </span>
                  </td>

                  {roles.map((r) => {
                    const perm = menu.permissions[r.roleId] || { read: false, write: false };
                    const isAdmin = r.roleId === 'ROLE_ADMIN';

                    return (
                      <td key={r.roleId} style={{ padding: '14px 12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '3px', cursor: isAdmin ? 'not-allowed' : 'pointer', fontSize: '0.78rem', color: perm.read ? '#2563eb' : '#94a3b8', fontWeight: perm.read ? 700 : 500 }}>
                            <input
                              type="checkbox"
                              disabled={isAdmin}
                              checked={perm.read}
                              onChange={() => togglePermission(mIdx, r.roleId, 'read')}
                              style={{ cursor: isAdmin ? 'not-allowed' : 'pointer', accentColor: '#2563eb' }}
                            />
                            조회
                          </label>

                          <label style={{ display: 'flex', alignItems: 'center', gap: '3px', cursor: isAdmin ? 'not-allowed' : 'pointer', fontSize: '0.78rem', color: perm.write ? '#16a34a' : '#94a3b8', fontWeight: perm.write ? 700 : 500 }}>
                            <input
                              type="checkbox"
                              disabled={isAdmin}
                              checked={perm.write}
                              onChange={() => togglePermission(mIdx, r.roleId, 'write')}
                              style={{ cursor: isAdmin ? 'not-allowed' : 'pointer', accentColor: '#16a34a' }}
                            />
                            수정
                          </label>

                          {isAdmin && <span title="관리자는 항상 전체 권한 부여"><Lock size={12} color="#94a3b8" /></span>}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
