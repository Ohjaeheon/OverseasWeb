import React, { useState, useEffect } from 'react';
import { adminService, UserItem, ChurchItem } from '../../services/adminService';
import { roleService, RoleDefinition } from '../../services/roleService';
import { organizationStructureService, Department, Team } from '../../services/organizationStructureService';
import defaultChurchesData from '../../assets/defaultChurches.json';
import { UserPlus, Edit2, RotateCcw, Trash2, KeyRound, Globe, X, CheckCircle, XCircle, Building2, Users2, Search } from 'lucide-react';

export const AdminUserPage: React.FC = () => {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [locations, setLocations] = useState<{ id: string; name: string; displayName: string }[]>([]);
  const [availableRoles, setAvailableRoles] = useState<RoleDefinition[]>([]);
  const [orgDepartments, setOrgDepartments] = useState<Department[]>([]);
  const [orgTeams, setOrgTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterRole, setFilterRole] = useState<string>('전체');
  const [filterStatus, setFilterStatus] = useState<string>('전체');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);

  // Form State
  const [formData, setFormData] = useState<UserItem>({
    username: '',
    name: '',
    role: 'ROLE_USER',
    assignedCountry: '전체',
    telegramId: '',
    telegramChatId: '',
    isActive: true,
    isOtpExempt: false,
    isWorshipPermitted: false
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const rolesList = roleService.getRoles();
      setAvailableRoles(rolesList);

      const userList = await adminService.getUsers();
      setUsers(userList || []);

      // Load church/region/pioneer names from churches
      const churchList: ChurchItem[] = await adminService.getChurches();
      const locList: { id: string; name: string; displayName: string }[] = [];
      locList.push({ id: '전체', name: '전체', displayName: '전체 (모든 해외교회 · 지역 접근)' });

      if (churchList && churchList.length > 0) {
        churchList.forEach(c => {
          locList.push({
            id: c.name,
            name: c.name,
            displayName: `${c.jipa} · ${c.name} (${c.country})`
          });
        });
      } else {
        defaultChurchesData.forEach((c: any) => {
          locList.push({
            id: c.name,
            name: c.name,
            displayName: `${c.jipa} · ${c.name} (${c.country})`
          });
        });
      }
      setLocations(locList);

      // 조직 관리(국가/부서/팀)에서 배정된 소속 정보 - 조회 실패해도 나머지 화면은 정상 동작해야 하므로 별도로 처리
      try {
        const directory = await organizationStructureService.getDirectory();
        setOrgDepartments(directory.departments || []);
        setOrgTeams(directory.teams || []);
      } catch (orgErr) {
        console.warn("조직 소속 정보 로드 실패:", orgErr);
        setOrgDepartments([]);
        setOrgTeams([]);
      }
    } catch (err) {
      console.warn("API load failed, using client fallback:", err);
      setAvailableRoles(roleService.getRoles());
      setUsers([
        { userId: 1, username: 'admin', name: '관리자', role: 'ROLE_ADMIN', assignedCountry: '전체', telegramId: '@overseas_admin', telegramChatId: '123456789', isActive: true },
        { userId: 2, username: 'user', name: '해외선교부 담당자', role: 'ROLE_USER', assignedCountry: '도쿄교회', telegramId: '@overseas_user', telegramChatId: '987654321', isActive: true }
      ]);
      const locList: { id: string; name: string; displayName: string }[] = [];
      locList.push({ id: '전체', name: '전체', displayName: '전체 (모든 해외교회 · 지역 접근)' });
      defaultChurchesData.forEach((c: any) => {
        locList.push({
          id: c.name,
          name: c.name,
          displayName: `${c.jipa} · ${c.name} (${c.country})`
        });
      });
      setLocations(locList);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAddModal = () => {
    const rolesList = roleService.getRoles();
    setAvailableRoles(rolesList);
    setEditingUser(null);
    setFormData({
      username: '',
      name: '',
      role: rolesList.length > 0 ? rolesList[0].roleId : 'ROLE_USER',
      assignedCountry: '전체',
      telegramId: '',
      telegramChatId: '',
      isActive: true,
      isOtpExempt: false,
      isWorshipPermitted: false
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (user: UserItem) => {
    const rolesList = roleService.getRoles();
    setAvailableRoles(rolesList);
    setEditingUser(user);

    let matchedRoleId = user.role;
    const found = rolesList.find(r => r.roleId === user.role || r.roleName === user.role);
    if (found) {
      matchedRoleId = found.roleId;
    } else if (user.role === '관리자') {
      matchedRoleId = 'ROLE_ADMIN';
    } else if (user.role === '일반 사용자' || user.role === '해외선교부 담당자') {
      matchedRoleId = 'ROLE_USER';
    }

    setFormData({
      ...user,
      role: matchedRoleId,
      assignedCountry: user.assignedCountry || '전체',
      isOtpExempt: user.isOtpExempt || false,
      isWorshipPermitted: user.isWorshipPermitted || false
    });
    setIsModalOpen(true);
  };

  const handleResetPassword = async (user: UserItem) => {
    if (!user.userId) return;
    if (!window.confirm(`'${user.name} (${user.username})' 계정의 비밀번호를 초기 비밀번호('gotjsqn')로 재설정하시겠습니까?`)) return;

    try {
      await adminService.resetUserPassword(user.userId);
      alert(`비밀번호가 초기비밀번호('gotjsqn')로 성공적으로 재설정되었습니다.\n해당 사용자는 다음 로그인 시 비밀번호 변경을 요청받게 됩니다.`);
      loadData();
    } catch (err) {
      alert("비밀번호 재설정 중 오류가 발생했습니다.");
    }
  };

  const handleDeleteUser = async (userId?: number) => {
    if (!userId) return;
    if (!window.confirm("정말 이 사용자를 삭제하시겠습니까?")) return;
    try {
      await adminService.deleteUser(userId);
      alert("사용자가 삭제되었습니다.");
      loadData();
    } catch (err) {
      alert("사용자 삭제 중 오류가 발생했습니다.");
    }
  };

  const handleToggleWorshipPermission = async (user: UserItem) => {
    if (!user.userId) return;
    try {
      const updatedUser = { ...user, isWorshipPermitted: !user.isWorshipPermitted };
      await adminService.updateUser(user.userId, updatedUser);
      loadData();
    } catch (err) {
      alert("권한 설정을 변경하는 동안 오류가 발생했습니다.");
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username.trim() || !formData.name.trim()) {
      alert("아이디와 이름은 필수 입력 항목입니다.");
      return;
    }

    try {
      if (editingUser && editingUser.userId) {
        await adminService.updateUser(editingUser.userId, formData);
        alert("사용자 정보가 성공적으로 수정되었습니다.");
      } else {
        await adminService.createUser(formData);
        alert("신규 사용자가 등록되었습니다.\n초기 비밀번호는 'gotjsqn'입니다.");
      }
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || "저장 중 오류가 발생했습니다.");
    }
  };

  const getRoleDisplayName = (rawRole: string) => {
    const matched = availableRoles.find(r => r.roleId === rawRole || r.roleName === rawRole);
    if (matched) return matched.roleName;
    if (rawRole === 'ROLE_ADMIN' || rawRole === 'ADMIN') return '관리자';
    if (rawRole === 'ROLE_USER' || rawRole === 'USER') return '해외선교부 담당자';
    return rawRole;
  };

  const getOrgLabel = (user: UserItem): string => {
    if (!user.departmentId) return '미배정';
    const dept = orgDepartments.find(d => d.id === user.departmentId);
    const deptName = dept?.name || '(삭제된 부서)';
    if (!user.teamId) return `${deptName} (팀 미배정)`;
    const team = orgTeams.find(t => t.id === user.teamId);
    return `${deptName} · ${team?.name || '(삭제된 팀)'}`;
  };

  const filteredUsers = users.filter((user) => {
    const displayRole = getRoleDisplayName(user.role);
    const matchesRole = filterRole === '전체' || displayRole === filterRole;
    const matchesStatus =
      filterStatus === '전체' ||
      (filterStatus === '정상' && user.isActive !== false) ||
      (filterStatus === '정지' && user.isActive === false);

    const searchLow = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !searchLow ||
      user.name.toLowerCase().includes(searchLow) ||
      user.username.toLowerCase().includes(searchLow) ||
      (user.assignedCountry || '').toLowerCase().includes(searchLow) ||
      getOrgLabel(user).toLowerCase().includes(searchLow) ||
      (user.telegramId || '').toLowerCase().includes(searchLow);

    return matchesRole && matchesStatus && matchesSearch;
  });

  return (
    <div>
      {/* Header Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1f2a44', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            🌍 회원 및 텔레그램 연동 관리
          </h1>
          <p style={{ color: '#6b7a99', fontSize: '0.88rem', margin: '4px 0 0 0' }}>
            시스템 회원 권한, 담당 해외교회 · 지역 · 개척지 접근 범위(데이터 접근 통제), 텔레그램 연동 정보 및 비밀번호를 통합 관리합니다.
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
          <UserPlus size={18} /> 사용자 추가
        </button>
      </div>

      {/* Control Bar: Filter Chips & Search Bar */}
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
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Status Chips */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {['전체', '정상', '정지'].map((s) => {
              const isSelected = filterStatus === s;
              return (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
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
                  {s}
                </button>
              );
            })}
          </div>

          {/* Role Filter */}
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            style={{
              padding: '9px 14px',
              border: '1px solid #e6edf8',
              borderRadius: '10px',
              color: '#334155',
              fontWeight: 600,
              fontSize: '0.86rem',
              background: '#ffffff',
              cursor: 'pointer'
            }}
          >
            <option value="전체">권한 전체</option>
            {availableRoles.map((r) => (
              <option key={r.roleId} value={r.roleName}>{r.roleName}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 600, whiteSpace: 'nowrap' }}>
            {filteredUsers.length}명 표시 중 (전체 {users.length}명)
          </span>

          {/* Search Field */}
          <div style={{ position: 'relative', minWidth: '280px' }}>
            <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="이름, 아이디, 담당 범위, 소속 검색..."
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
      </div>

      {/* Main Table */}
      <div style={{
        background: '#ffffff',
        border: '1px solid #e6edf8',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 4px 14px rgba(20, 40, 90, 0.04)'
      }}>
        <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', minWidth: '1360px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
              <th style={{ padding: '14px 18px', fontWeight: 700, whiteSpace: 'nowrap' }}>ID</th>
              <th style={{ padding: '14px 18px', fontWeight: 700, whiteSpace: 'nowrap' }}>로그인 아이디</th>
              <th style={{ padding: '14px 18px', fontWeight: 700, whiteSpace: 'nowrap' }}>이름</th>
              <th style={{ padding: '14px 18px', fontWeight: 700, whiteSpace: 'nowrap' }}>권한</th>
              <th style={{ padding: '14px 18px', fontWeight: 700, whiteSpace: 'nowrap' }}>담당 교회 · 지역 · 개척지 (접근 범위)</th>
              <th style={{ padding: '14px 18px', fontWeight: 700, whiteSpace: 'nowrap' }}>소속 (부서 · 팀)</th>
              <th style={{ padding: '14px 18px', fontWeight: 700, whiteSpace: 'nowrap' }}>Telegram ID (@username)</th>
              <th style={{ padding: '14px 18px', fontWeight: 700, whiteSpace: 'nowrap' }}>Telegram Chat ID</th>
              <th style={{ padding: '14px 18px', fontWeight: 700, whiteSpace: 'nowrap' }}>상태</th>
              <th style={{ padding: '14px 18px', fontWeight: 700, whiteSpace: 'nowrap' }}>OTP 예외</th>
              <th style={{ padding: '14px 18px', fontWeight: 700, whiteSpace: 'nowrap' }}>예배 취합</th>
              <th style={{ padding: '14px 18px', fontWeight: 700, textAlign: 'right', whiteSpace: 'nowrap' }}>관리</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={11} style={{ padding: '30px', textAlign: 'center', color: '#6b7a99' }}>
                  사용자 목록을 불러오는 중입니다...
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={11} style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                  검색/필터 조건에 맞는 회원이 없습니다.
                </td>
              </tr>
            ) : filteredUsers.map((user) => {
              const displayRole = getRoleDisplayName(user.role);
              const isAdmin = displayRole === '관리자' || user.role === 'ROLE_ADMIN';

              return (
                <tr key={user.userId || user.username} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s ease' }}>
                  <td style={{ padding: '14px 18px', fontWeight: 700, color: '#1f2a44' }}>
                    {user.userId}
                  </td>
                  <td style={{ padding: '14px 18px', fontWeight: 700, color: '#1f2a44' }}>
                    {user.username}
                  </td>
                  <td style={{ padding: '14px 18px', color: '#334155', fontWeight: 600 }}>
                    {user.name}
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      background: isAdmin ? '#dbeafe' : '#f1f5f9',
                      color: isAdmin ? '#1d4ed8' : '#475569'
                    }}>
                      {displayRole}
                    </span>
                  </td>
                  <td style={{ padding: '14px 18px', color: '#2563eb', fontWeight: 700, whiteSpace: 'nowrap' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Building2 size={14} /> {user.assignedCountry || '전체'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 18px', color: user.departmentId ? '#7c3aed' : '#94a3b8', fontWeight: user.departmentId ? 700 : 500, whiteSpace: 'nowrap' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <Users2 size={14} /> {getOrgLabel(user)}
                    </span>
                  </td>
                  <td style={{ padding: '14px 18px', color: '#475569' }}>
                    {user.telegramId || '-'}
                  </td>
                  <td style={{ padding: '14px 18px', color: '#475569' }}>
                    {user.telegramChatId || '-'}
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    {user.isActive ? (
                      <span style={{ color: '#16a34a', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle size={14} /> 정상
                      </span>
                    ) : (
                      <span style={{ color: '#dc2626', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <XCircle size={14} /> 정지
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    {user.isOtpExempt ? (
                      <span style={{ color: '#f59e0b', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(245, 158, 11, 0.08)', padding: '2px 8px', borderRadius: '6px' }}>
                        예외(OTP제외)
                      </span>
                    ) : (
                      <span style={{ color: '#64748b', fontWeight: 600 }}>
                        적용대상
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={user.isWorshipPermitted || false}
                      onChange={() => handleToggleWorshipPermission(user)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      title="클릭하여 즉시 권한 토글"
                    />
                  </td>
                  <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => handleOpenEditModal(user)}
                        title="수정"
                        style={{
                          background: '#f1f5f9',
                          border: '1px solid #e2e8f0',
                          borderRadius: '6px',
                          color: '#334155',
                          padding: '6px 10px',
                          cursor: 'pointer',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Edit2 size={13} /> 수정
                      </button>
                      <button
                        onClick={() => handleResetPassword(user)}
                        title="비밀번호 초기화 (gotjsqn)"
                        style={{
                          background: '#fef3c7',
                          border: '1px solid #fde68a',
                          borderRadius: '6px',
                          color: '#b45309',
                          padding: '6px 10px',
                          cursor: 'pointer',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <KeyRound size={13} /> 초기화
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.userId)}
                        title="삭제"
                        style={{
                          background: '#fee2e2',
                          border: '1px solid #fca5a5',
                          borderRadius: '6px',
                          color: '#dc2626',
                          padding: '6px 8px',
                          cursor: 'pointer',
                          fontSize: '0.78rem'
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>

      {/* Add / Edit User Modal */}
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
            maxWidth: '560px',
            width: '100%',
            padding: '28px',
            boxShadow: '0 25px 60px rgba(20, 40, 90, 0.2)',
            color: '#1f2a44'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #e6edf8', paddingBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#1f2a44' }}>
                {editingUser ? '✏️ 회원 정보 수정' : '➕ 신규 회원 등록'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: '#64748b', marginBottom: '6px', fontWeight: 600 }}>로그인 아이디</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingUser}
                    placeholder="예: user01"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px',
                      background: editingUser ? '#f1f5f9' : '#ffffff',
                      border: '1px solid #dbe2ef',
                      borderRadius: '8px',
                      color: '#1f2a44'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: '#64748b', marginBottom: '6px', fontWeight: 600 }}>사용자 성명</label>
                  <input
                    type="text"
                    required
                    placeholder="예: 홍길동"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    style={{ width: '100%', padding: '10px', background: '#ffffff', border: '1px solid #dbe2ef', borderRadius: '8px', color: '#1f2a44' }}
                  />
                </div>
              </div>

              {!editingUser && (
                <div style={{ background: '#fef3c7', padding: '10px 14px', borderRadius: '8px', border: '1px solid #fde68a', fontSize: '0.82rem', color: '#b45309', fontWeight: 600 }}>
                  🔑 신규 생성 시 초기 비밀번호는 <b>gotjsqn</b> 으로 자동 설정됩니다.
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: '#64748b', marginBottom: '6px', fontWeight: 600 }}>권한 설정</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    style={{ width: '100%', padding: '10px', background: '#ffffff', border: '1px solid #dbe2ef', borderRadius: '8px', color: '#1f2a44', fontWeight: 700 }}
                  >
                    {availableRoles.map((r) => (
                      <option key={r.roleId} value={r.roleId}>
                        {r.roleName} ({r.roleId})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: '#64748b', marginBottom: '6px', fontWeight: 600 }}>담당 교회 · 지역 · 개척지 범위</label>
                  <select
                    value={formData.assignedCountry}
                    onChange={(e) => setFormData({ ...formData, assignedCountry: e.target.value })}
                    style={{ width: '100%', padding: '10px', background: '#ffffff', border: '1px solid #dbe2ef', borderRadius: '8px', color: '#1f2a44', fontWeight: 700 }}
                  >
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.name}>
                        {loc.displayName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: '#64748b', marginBottom: '6px', fontWeight: 600 }}>Telegram ID</label>
                  <input
                    type="text"
                    placeholder="예: @username"
                    value={formData.telegramId || ''}
                    onChange={(e) => setFormData({ ...formData, telegramId: e.target.value })}
                    style={{ width: '100%', padding: '10px', background: '#ffffff', border: '1px solid #dbe2ef', borderRadius: '8px', color: '#1f2a44' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', color: '#64748b', marginBottom: '6px', fontWeight: 600 }}>Telegram Chat ID</label>
                  <input
                    type="text"
                    placeholder="예: 123456789"
                    value={formData.telegramChatId || ''}
                    onChange={(e) => setFormData({ ...formData, telegramChatId: e.target.value })}
                    style={{ width: '100%', padding: '10px', background: '#ffffff', border: '1px solid #dbe2ef', borderRadius: '8px', color: '#1f2a44' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#475569', fontWeight: 600, cursor: 'pointer', background: 'rgba(245, 158, 11, 0.04)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.15)' }}>
                  <input
                    type="checkbox"
                    checked={formData.isOtpExempt || false}
                    onChange={(e) => setFormData({ ...formData, isOtpExempt: e.target.checked })}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <div>
                    <span style={{ display: 'block', fontWeight: 700, color: '#d97706' }}>OTP 2차 인증 예외 (테스트 계정)</span>
                    <span style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500, marginTop: '2px' }}>체크 시 로그인할 때 텔레그램 2차 OTP 인증 단계를 요구하지 않고 즉시 로그인됩니다.</span>
                  </div>
                </label>
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#475569', fontWeight: 600, cursor: 'pointer', background: 'rgba(37, 99, 235, 0.04)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(37, 99, 235, 0.15)' }}>
                  <input
                    type="checkbox"
                    checked={formData.isWorshipPermitted || false}
                    onChange={(e) => setFormData({ ...formData, isWorshipPermitted: e.target.checked })}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <div>
                    <span style={{ display: 'block', fontWeight: 700, color: '#2563eb' }}>텔레그램 주간예배 취합 권한 허용</span>
                    <span style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500, marginTop: '2px' }}>체크 시 해당 사용자가 텔레그램 봇으로 주간예배 출결 ZIP 파일 취합 작업을 수행할 수 있습니다.</span>
                  </div>
                </label>
              </div>

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
                  {editingUser ? '수정 저장' : '등록'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
