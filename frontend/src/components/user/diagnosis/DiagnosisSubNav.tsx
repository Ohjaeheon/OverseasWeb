import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { groupSidebar, filterMajorsForRole, visibleChildrenFor, findActiveMajor } from './navGroups';

function getCurrentUserRole(): string {
  const userStr = localStorage.getItem('user');
  if (!userStr) return 'ROLE_USER';
  try { return JSON.parse(userStr).role || 'ROLE_USER'; } catch { return 'ROLE_USER'; }
}

/**
 * 데스크톱 전용 좌측 서브 내비게이션 — 현재 경로가 속한 대그룹에 진입했을 때만 나타나,
 * 그 대그룹의 중그룹과(있다면) 소그룹을 보여준다. 모바일 전체 메뉴(DiagnosisSidebar)와
 * 완전히 분리된 컴포넌트로, 뷰포트 폭에 따라 CSS(.subnav / .side.mobile-drawer)가 서로
 * 배타적으로 노출을 제어한다.
 */
export const DiagnosisSubNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const userRole = getCurrentUserRole();

  const { majors } = groupSidebar();
  const filteredMajors = filterMajorsForRole(majors, userRole);
  const active = findActiveMajor(filteredMajors, location.pathname);

  const [openItem, setOpenItem] = useState<string | null>(active ? active.item.s : null);

  useEffect(() => {
    if (active) setOpenItem(active.item.s);
  }, [active?.item.s]);

  if (!active) return null;

  const go = (path: string) => navigate(path);

  return (
    <nav className="subnav">
      <div className="subnav-head"><b>{active.major.label}</b></div>
      {active.major.items.map((it) => {
        const children = visibleChildrenFor(it, userRole);
        const isOn = children.length === 0 && (location.pathname === it.path || location.pathname.startsWith(it.path + '/'));
        const expanded = openItem === it.s;
        return (
          <div className="subgrp" key={it.s}>
            <div
              className={`submid ${isOn ? 'on' : ''} ${expanded && children.length > 0 ? 'expanded' : ''}`}
              onClick={() => {
                if (children.length > 0) setOpenItem(openItem === it.s ? null : it.s);
                go(it.path);
              }}
            >
              <span>{it.label}</span>
              {it.tag && <span className="tag">{it.tag}</span>}
              {children.length > 0 && <span className="subcar">▸</span>}
            </div>
            {children.length > 0 && (
              <div className={`subsub-wrap ${expanded ? 'open' : ''}`}>
                {children.map((ch) => (
                  <div
                    key={ch.path}
                    className={`subsub ${location.pathname === ch.path ? 'on' : ''}`}
                    onClick={() => go(ch.path)}
                  >
                    {ch.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
};
