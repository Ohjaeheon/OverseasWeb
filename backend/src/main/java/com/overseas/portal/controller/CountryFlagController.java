package com.overseas.portal.controller;

import com.overseas.portal.service.CountryFlagService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 관리자가 등록한 국가별 국기 이미지 API. 등록된 국가는 내장 기본 국기보다 우선한다.
 */
@Slf4j
@RestController
@RequiredArgsConstructor
public class CountryFlagController {

    private static final int MAX_DATA_URL_LENGTH = 500_000;

    private final CountryFlagService service;

    /** 일반 인증 사용자용: 등록된 국가 국기 전체 (국가명 -> data URL) */
    @GetMapping("/api/v1/country-flags")
    public ResponseEntity<Map<String, String>> getAll() {
        return ResponseEntity.ok(service.getAll());
    }

    @PutMapping("/api/v1/admin/country-flags/{country}")
    public ResponseEntity<?> upsert(
            @PathVariable String country,
            @RequestBody Map<String, String> body,
            @AuthenticationPrincipal UserDetails principal) {
        String imageDataUrl = body.get("imageDataUrl");
        if (imageDataUrl == null || imageDataUrl.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "이미지 데이터가 없습니다."));
        }
        if (imageDataUrl.length() > MAX_DATA_URL_LENGTH) {
            return ResponseEntity.badRequest().body(Map.of("message", "이미지 용량이 너무 큽니다. 더 작은 이미지를 사용해주세요."));
        }
        try {
            String username = principal != null ? principal.getUsername() : null;
            service.upsert(country, imageDataUrl, username);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            log.error("국기 이미지 저장 실패: country={}", country, e);
            return ResponseEntity.badRequest().body(Map.of("message", "저장 중 오류가 발생했습니다: " + e.getMessage()));
        }
    }

    @DeleteMapping("/api/v1/admin/country-flags/{country}")
    public ResponseEntity<?> delete(@PathVariable String country) {
        service.delete(country);
        return ResponseEntity.ok().build();
    }
}
