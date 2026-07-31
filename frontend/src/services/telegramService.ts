export const telegramService = {
  /**
   * 텔레그램 웹앱 접속 상태 여부를 판단합니다.
   */
  isTelegramWebApp: (): boolean => {
    const tg = (window as any).Telegram?.WebApp;
    // initData가 존재하면 텔레그램 내부에서 구동된 웹앱으로 간주합니다.
    return !!(tg && tg.initData);
  },

  /**
   * Telegram WebApp 객체를 반환합니다.
   */
  getWebApp: () => {
    return (window as any).Telegram?.WebApp;
  },

  /**
   * 텔레그램 웹앱 테마 색상을 CSS 변수와 body 클래스에 바인딩합니다.
   */
  applyTheme: () => {
    const tg = telegramService.getWebApp();
    if (!tg) return;

    const theme = tg.themeParams;
    if (!theme) return;

    const root = document.documentElement;
    
    // 텔레그램 공식 테마 변수를 CSS 변수로 주입합니다.
    if (theme.bg_color) root.style.setProperty('--tg-theme-bg-color', theme.bg_color);
    if (theme.text_color) root.style.setProperty('--tg-theme-text-color', theme.text_color);
    if (theme.hint_color) root.style.setProperty('--tg-theme-hint-color', theme.hint_color);
    if (theme.link_color) root.style.setProperty('--tg-theme-link-color', theme.link_color);
    if (theme.button_color) root.style.setProperty('--tg-theme-button-color', theme.button_color);
    if (theme.button_text_color) root.style.setProperty('--tg-theme-button-text-color', theme.button_text_color);
    if (theme.secondary_bg_color) root.style.setProperty('--tg-theme-secondary-bg-color', theme.secondary_bg_color);

    document.body.classList.add('telegram-webapp-mode');
  },

  /**
   * 네이티브 Back Button의 클릭 이벤트를 연결하고 노출합니다.
   */
  setupBackButton: (onClick: () => void) => {
    const tg = telegramService.getWebApp();
    if (tg?.BackButton) {
      // 기존 리스너 제거 후 신규 지정
      tg.BackButton.offClick();
      tg.BackButton.onClick(onClick);
      tg.BackButton.show();
    }
  },

  /**
   * 네이티브 Back Button을 숨깁니다.
   */
  hideBackButton: () => {
    const tg = telegramService.getWebApp();
    if (tg?.BackButton) {
      tg.BackButton.hide();
      tg.BackButton.offClick();
    }
  },

  /**
   * 네이티브 Main Button을 구성하고 노출합니다.
   */
  setupMainButton: (text: string, onClick: () => void) => {
    const tg = telegramService.getWebApp();
    if (tg?.MainButton) {
      tg.MainButton.offClick();
      tg.MainButton.setText(text);
      tg.MainButton.onClick(onClick);
      tg.MainButton.show();
    }
  },

  /**
   * 네이티브 Main Button을 숨깁니다.
   */
  hideMainButton: () => {
    const tg = telegramService.getWebApp();
    if (tg?.MainButton) {
      tg.MainButton.hide();
      tg.MainButton.offClick();
    }
  }
};
