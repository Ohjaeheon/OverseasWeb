package com.overseas.portal.controller;

import com.overseas.portal.service.HomeDashboardService;
import com.overseas.portal.service.HomeDashboardService.OverseasBoardRowDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 홈 화면 "해외선교부 현황판" 조회 API. 일반 인증 사용자 누구나 조회 가능(관리자 가드 없음).
 */
@RestController
@RequestMapping("/api/v1/home-dashboard")
@RequiredArgsConstructor
public class HomeDashboardController {

    private final HomeDashboardService homeDashboardService;

    @GetMapping("/overseas-board")
    public ResponseEntity<List<OverseasBoardRowDTO>> getOverseasBoard(
            @RequestParam int year, @RequestParam int month) {
        return ResponseEntity.ok(homeDashboardService.getOverseasBoard(year, month));
    }
}
