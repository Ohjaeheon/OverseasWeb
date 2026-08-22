import React, { useEffect, useState } from 'react';
import { DiagnosisSidebar } from './DiagnosisSidebar';
import { DiagnosisSubNav } from './DiagnosisSubNav';
import { DiagnosisTopbar } from './DiagnosisTopbar';
import { IntroGate } from './IntroGate';
import { useDiagnosisData } from '../../../contexts/DiagnosisDataContext';
import { userMenuLayoutService } from '../../../services/userMenuLayoutService';

interface DiagnosisShellProps {
  showAdminBtn: boolean;
  showBackdoorBtn: boolean;
  children: React.ReactNode;
}

/**
 * 전 화면 공통 레이아웃(탑바 + 사이드바 + 인트로 게이트). 기존 diagnosisEngine.js가
 * dangerouslySetInnerHTML로 그리던 DOM 골격을 그대로 재현해 diagnosisEngine.css를 그대로 재사용한다.
 */
export const DiagnosisShell: React.FC<DiagnosisShellProps> = ({ showAdminBtn, showBackdoorBtn, children }) => {
  const { loading, lang, setLang } = useDiagnosisData();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [introVisible, setIntroVisible] = useState(true);
  const [showToTop, setShowToTop] = useState(false);
  // 관리자가 /adminsetting/user-menu-layout에서 편집한 메뉴 배치를 DB에서 받아와 반영한다.
  // navGroups.ts의 getSIDEBAR()는 호출 시점의 localStorage 캐시를 읽으므로, 조회가 끝난 뒤
  // 이 트리를 한 번 더 리렌더시켜(useState tick) 하위 내비게이션 컴포넌트들이 최신 값을 읽게 한다.
  const [, setMenuLayoutTick] = useState(0);

  useEffect(() => {
    const onScroll = () => setShowToTop(window.scrollY > 300);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    userMenuLayoutService.fetchUserMenuLayoutFromDb().then(() => {
      setMenuLayoutTick((t) => t + 1);
    });
  }, []);

  return (
    <div>
      <IntroGate visible={introVisible} onEnter={() => setIntroVisible(false)} />

      <DiagnosisTopbar
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
        onShowIntro={() => setIntroVisible(true)}
        showAdminBtn={showAdminBtn}
        showBackdoorBtn={showBackdoorBtn}
      />

      <div className="shell">
        <DiagnosisSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onShowIntro={() => setIntroVisible(true)}
          lang={lang}
          onLangChange={(l) => setLang(l as any)}
          showAdminBtn={showAdminBtn}
          showBackdoorBtn={showBackdoorBtn}
        />
        <DiagnosisSubNav />
        <main className="main">
          {loading ? (
            <div style={{ padding: 60, textAlign: 'center', color: 'var(--muted)' }}>데이터를 불러오는 중입니다...</div>
          ) : children}
        </main>
      </div>

      <div className="ovl" style={{ display: 'none' }}><div className="modal" /></div>

      <button
        id="toTop"
        className={showToTop ? 'show' : ''}
        title="맨 위로"
        aria-label="맨 위로"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      >
        ↑
      </button>
    </div>
  );
};
