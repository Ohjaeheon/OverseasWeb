package com.overseas.portal.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.overseas.portal.domain.Church;
import com.overseas.portal.domain.User;
import com.overseas.portal.domain.WeeklyReportSchema;
import com.overseas.portal.domain.WeeklyReportSubmission;
import com.overseas.portal.repository.ChurchRepository;
import com.overseas.portal.repository.UserRepository;
import com.overseas.portal.repository.WeeklyReportSchemaRepository;
import com.overseas.portal.repository.WeeklyReportSubmissionRepository;
import com.overseas.portal.util.WeekUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional
public class WeeklyReportSubmissionService {

    private final WeeklyReportSubmissionRepository submissionRepository;
    private final WeeklyReportSchemaRepository schemaRepository;
    private final UserRepository userRepository;
    private final ChurchRepository churchRepository;
    private final ObjectMapper objectMapper;

    /**
     * 현재 로그인 사용자가 접근할 수 있는 교회 목록 반환.
     * - assignedCountry = "전체" 또는 ROLE_ADMIN : 모든 활성 교회
     * - 그 외 : assignedCountry 값이 교회명 / 국가명 / "지파 · 교회명" 중 하나와 일치하는 교회만
     *   (관리자가 회원관리 화면에서 실제로 지정하는 값은 대부분 특정 교회명이므로, 프론트
     *   DiagnosisDataContext.filterByAssignedLocation()과 동일한 매칭 규칙을 따른다)
     */
    @Transactional(readOnly = true)
    public List<Church> getAccessibleChurches() {
        User user = getCurrentUser();
        String assigned = user.getAssignedCountry() == null ? "전체" : user.getAssignedCountry();

        if (isAdmin(user) || assigned.equals("전체")) {
            return churchRepository.findByIsActiveTrueOrderBySortOrderAscNameAsc();
        }

        return churchRepository.findByIsActiveTrueOrderBySortOrderAscNameAsc().stream()
                .filter(c -> matchesAssignedLocation(c, assigned))
                .toList();
    }

    /**
     * 보고 데이터 제출 (신규 또는 재제출)
     * - 요청자의 assignedCountry가 제출 대상 교회를 포함하는지 검증
     * - 서버가 직접 계산한 "현재 주차"와 대상 주차가 다르면 거부 (지난 주차는 결재 없이 수정 불가 — 다음 체크포인트에서 정정결재 연동 예정)
     */
    public WeeklyReportSubmission submitReport(Integer reportYear, Integer reportMonth, Integer reportWeekOfMonth,
                                                Long churchId, String submitDataJson, String photoPaths) {
        User user = getCurrentUser();
        validateChurchAccess(user, churchId);

        WeekUtil.Week target = new WeekUtil.Week(reportYear, reportMonth, reportWeekOfMonth);
        WeekUtil.Week current = WeekUtil.currentWeek();
        if (target.sortKey() != current.sortKey()) {
            throw new SecurityException("지난 주차는 수정할 수 없습니다. (현재 주차: " + current.label() + ")");
        }

        WeeklyReportSchema schema = schemaRepository.findAllByIsEnabledTrue().stream()
                .filter(s -> s.sortKey() <= target.sortKey())
                .max((a, b) -> Integer.compare(a.sortKey(), b.sortKey()))
                .orElseThrow(() -> new IllegalStateException("해당 주차에 적용할 주간보고 양식이 없습니다."));

        Church church = churchRepository.findById(churchId)
                .orElseThrow(() -> new IllegalArgumentException("교회를 찾을 수 없습니다. ID: " + churchId));

        String username = user.getUsername();
        Optional<WeeklyReportSubmission> existing = submissionRepository
                .findByReportYearAndReportMonthAndReportWeekOfMonthAndChurchId(reportYear, reportMonth, reportWeekOfMonth, churchId);

        if (existing.isPresent()) {
            WeeklyReportSubmission sub = existing.get();
            sub.setSchema(schema);
            sub.setSubmitDataJson(submitDataJson);
            if (photoPaths != null) sub.setPhotoPaths(photoPaths);
            sub.setStatus("REVISED");
            sub.setSubmittedBy(username);
            return submissionRepository.save(sub);
        }

        WeeklyReportSubmission submission = WeeklyReportSubmission.builder()
                .schema(schema)
                .reportYear(reportYear)
                .reportMonth(reportMonth)
                .reportWeekOfMonth(reportWeekOfMonth)
                .churchId(churchId)
                .churchName(church.getName())
                .submittedBy(username)
                .submitDataJson(submitDataJson)
                .photoPaths(photoPaths)
                .status("SUBMITTED")
                .build();

        return submissionRepository.save(submission);
    }

    /** 특정 주차의 전체 제출 현황 (관리자용) */
    @Transactional(readOnly = true)
    public List<WeeklyReportSubmission> getSubmissionsByWeek(Integer year, Integer month, Integer weekOfMonth) {
        return submissionRepository.findByReportYearAndReportMonthAndReportWeekOfMonthOrderBySubmittedAtDesc(year, month, weekOfMonth);
    }

    /** 전체 제출 현황 (관리자용) */
    @Transactional(readOnly = true)
    public List<WeeklyReportSubmission> getAllSubmissions() {
        return submissionRepository.findAllByOrderBySubmittedAtDesc();
    }

    /** 제출 상세 조회 */
    @Transactional(readOnly = true)
    public WeeklyReportSubmission getSubmission(Long submissionId) {
        return submissionRepository.findByIdWithSchema(submissionId)
                .orElseThrow(() -> new IllegalArgumentException("제출 데이터를 찾을 수 없습니다. ID: " + submissionId));
    }

    /** 특정 교회의 모든 제출 이력 (주차 선택기에서 제출 여부 표시용) */
    @Transactional(readOnly = true)
    public List<WeeklyReportSubmission> getMySubmissions(Long churchId) {
        return submissionRepository.findByChurchIdOrderByReportYearDescReportMonthDescReportWeekOfMonthDesc(churchId);
    }

    /** 내 교회의 특정 주차 제출 여부 확인 (사용자용) */
    @Transactional(readOnly = true)
    public Optional<WeeklyReportSubmission> getMySubmission(Integer year, Integer month, Integer weekOfMonth, Long churchId) {
        return submissionRepository.findByReportYearAndReportMonthAndReportWeekOfMonthAndChurchId(year, month, weekOfMonth, churchId);
    }

    /** 제출 삭제 (관리자용) */
    public void deleteSubmission(Long submissionId) {
        WeeklyReportSubmission sub = getSubmission(submissionId);
        submissionRepository.delete(sub);
    }

    /**
     * 교회별 주간보고 "발표 보기" 노출 설정 저장 (관리자용)
     * - visible: 발표 보기 목록에 표시할지 여부
     * - displayName: 발표용으로 대신 표시할 이름 (null/빈 문자열이면 원래 name 사용)
     * - hiddenSectionIds: 이 교회에서만 숨길 섹션 sectionId 목록
     */
    public Church updateWeeklyReportPresentationSettings(Long churchId, Boolean visible, String displayName, List<String> hiddenSectionIds) {
        Church church = churchRepository.findById(churchId)
                .orElseThrow(() -> new IllegalArgumentException("교회를 찾을 수 없습니다. ID: " + churchId));

        if (visible != null) church.setWeeklyReportVisible(visible);
        church.setWeeklyReportDisplayName(displayName == null || displayName.isBlank() ? null : displayName);
        try {
            church.setWeeklyReportHiddenSections(
                    hiddenSectionIds == null || hiddenSectionIds.isEmpty()
                            ? null
                            : objectMapper.writeValueAsString(hiddenSectionIds));
        } catch (Exception e) {
            throw new IllegalArgumentException("hiddenSectionIds 직렬화에 실패했습니다.");
        }

        return churchRepository.save(church);
    }

    // ──────────────────────────────────────────────
    // 내부 권한 검증
    // ──────────────────────────────────────────────

    private User getCurrentUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalStateException("사용자를 찾을 수 없습니다."));
    }

    private boolean isAdmin(User user) {
        String role = user.getRole() == null ? "" : user.getRole();
        return role.equals("ROLE_ADMIN") || role.equals("ADMIN") || role.equals("관리자") || role.equals("ROLE_관리자");
    }

    private boolean matchesAssignedLocation(Church church, String assigned) {
        String jipaName = church.getJipa() + " · " + church.getName();
        return assigned.equals(church.getName())
                || assigned.equals(church.getCountry())
                || assigned.equals(jipaName);
    }

    private void validateChurchAccess(User user, Long churchId) {
        String assigned = user.getAssignedCountry() == null ? "전체" : user.getAssignedCountry();
        if (isAdmin(user) || assigned.equals("전체")) {
            return; // 전체 접근 허용
        }

        Church church = churchRepository.findById(churchId)
                .orElseThrow(() -> new IllegalArgumentException("교회를 찾을 수 없습니다. ID: " + churchId));

        if (!matchesAssignedLocation(church, assigned)) {
            throw new SecurityException(
                    "해당 교회에 대한 제출 권한이 없습니다. (담당: " + assigned + ", 요청: " + church.getName() + ")");
        }
    }
}
