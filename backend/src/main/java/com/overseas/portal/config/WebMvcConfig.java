package com.overseas.portal.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
@RequiredArgsConstructor
public class WebMvcConfig implements WebMvcConfigurer {

    private final MenuPermissionInterceptor menuPermissionInterceptor;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(menuPermissionInterceptor)
                .addPathPatterns("/api/v1/**")
                .excludePathPatterns(
                        "/api/v1/auth/**",
                        "/api/v1/i18n/**",
                        "/api/v1/logs/access",
                        "/api/v1/diagnosis/**",
                        "/api/v1/users/**",
                        // BusinessBoardController는 이미 자체적으로 공지/작성자/참조인/관리자 기준의
                        // 세밀한 접근 제어를 구현하고 있고(글쓰기는 의도적으로 전체 로그인 사용자에게 열려 있음),
                        // 여기서 business 메뉴 write까지 요구하면 그 의도된 개방을 깨게 된다.
                        "/api/v1/business/board/**"
                );
    }
}
