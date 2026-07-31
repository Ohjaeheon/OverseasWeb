import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { telegramService } from '../services/telegramService';

export const TelegramLifecycleHandler: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // 텔레그램 웹앱 접속 환경이 아니라면 아무 동작도 하지 않습니다.
    if (!telegramService.isTelegramWebApp()) {
      return;
    }

    const tg = telegramService.getWebApp();
    if (!tg) return;

    // 웹앱 준비 완료 전송 및 화면 확장
    tg.ready();
    tg.expand();

    // 테마 연동 실행
    telegramService.applyTheme();
  }, []);

  useEffect(() => {
    if (!telegramService.isTelegramWebApp()) {
      return;
    }

    const tg = telegramService.getWebApp();
    if (!tg) return;

    // 현재 진입한 페이지 경로에 따른 Back Button 제어 분기
    // 인트로화면(/), 로그인화면(/login)에서는 뒤로가기 버튼을 보이지 않게 합니다.
    const isRootOrLogin = location.pathname === '/' || location.pathname === '/login' || location.pathname === '/OverseasPortal' || location.pathname === '/OverseasPortal/';

    if (isRootOrLogin) {
      telegramService.hideBackButton();
    } else {
      telegramService.setupBackButton(() => {
        // 이전 히스토리가 있으면 이전으로 가고, 없으면 홈(/)으로 보냅니다.
        if (window.history.length > 1) {
          navigate(-1);
        } else {
          navigate('/');
        }
      });
    }

    return () => {
      // 컴포넌트 언마운트 또는 경로 이동 시 백버튼 숨김 처리
      telegramService.hideBackButton();
    };
  }, [location.pathname, navigate]);

  return null;
};
